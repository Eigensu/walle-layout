from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import datetime
from beanie import PydanticObjectId

from app.models.contest import Contest
from app.models.team import Team
from app.models.team_contest_enrollment import TeamContestEnrollment
from app.common.enums.contests import ContestStatus, ContestVisibility
from app.common.enums.enrollments import EnrollmentStatus
from app.schemas.contest import (
    ContestCreate,
    ContestUpdate,
    ContestResponse,
    ContestListResponse,
)
from app.schemas.enrollment import (
    EnrollmentBulkRequest,
    UnenrollBulkRequest,
    EnrollmentResponse,
)
from app.models.user import User
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/admin/contests", tags=["Admin - Contests"])


async def to_response(contest: Contest) -> ContestResponse:
    return ContestResponse(
        id=str(contest.id),
        code=contest.code,
        name=contest.name,
        description=contest.description,
        start_at=contest.start_at,
        end_at=contest.end_at,
        status=contest.status,
        visibility=contest.visibility,
        points_scope=contest.points_scope,
        contest_type=contest.contest_type,
        allowed_teams=contest.allowed_teams or [],
        created_at=contest.created_at,
        updated_at=contest.updated_at,
    )


@router.post("", response_model=ContestResponse, status_code=201)
async def create_contest(
    data: ContestCreate,
    current_user: User = Depends(get_admin_user),
):
    if data.start_at >= data.end_at:
        raise HTTPException(status_code=400, detail="start_at must be before end_at")

    existing = await Contest.find_one(Contest.code == data.code)
    if existing:
        raise HTTPException(status_code=400, detail="Contest code already exists")

    now = datetime.utcnow()
    contest = Contest(
        code=data.code,
        name=data.name,
        description=data.description,
        start_at=data.start_at,
        end_at=data.end_at,
        status=data.status,
        visibility=data.visibility,
        points_scope=data.points_scope,
        contest_type=data.contest_type,
        allowed_teams=data.allowed_teams,
        created_at=now,
        updated_at=now,
    )
    await contest.insert()
    return await to_response(contest)


@router.get("", response_model=ContestListResponse)
async def list_contests(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_admin_user),
):
    query = Contest.find_all()
    if status:
        query = Contest.find(Contest.status == status)
    # Simple search on code or name (case sensitive minimal)
    if search:
        from beanie.operators import Or, RegEx
        conditions = Or(RegEx(Contest.code, search, options="i"), RegEx(Contest.name, search, options="i"))
        query = Contest.find(conditions)

    total = await query.count()
    skip = (page - 1) * page_size
    rows = await query.skip(skip).limit(page_size).sort(-Contest.start_at).to_list()
    return {
        "contests": [await to_response(c) for c in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{contest_id}", response_model=ContestResponse)
async def get_contest(contest_id: str, current_user: User = Depends(get_admin_user)):
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    return await to_response(contest)


@router.put("/{contest_id}", response_model=ContestResponse)
async def update_contest(
    contest_id: str,
    data: ContestUpdate,
    current_user: User = Depends(get_admin_user),
):
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    update_fields = data.model_dump(exclude_unset=True)

    if "code" in update_fields:
        update_fields.pop("code")  # immutable

    # Validate dates if provided
    new_start = update_fields.get("start_at", contest.start_at)
    new_end = update_fields.get("end_at", contest.end_at)
    if new_start >= new_end:
        raise HTTPException(status_code=400, detail="start_at must be before end_at")

    for k, v in update_fields.items():
        setattr(contest, k, v)
    contest.updated_at = datetime.utcnow()
    await contest.save()
    return await to_response(contest)


@router.delete("/{contest_id}")
async def delete_contest(
    contest_id: str,
    force: bool = Query(False),
    current_user: User = Depends(get_admin_user),
):
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    active_enrollments = await TeamContestEnrollment.find({
        "contest_id": contest.id,
        "status": EnrollmentStatus.ACTIVE,
    }).count()

    # If there are active enrollments, honor force=true to unenroll and proceed.
    if active_enrollments > 0:
        if force:
            # mark all active enrollments removed
            async for enr in TeamContestEnrollment.find({
                "contest_id": contest.id,
                "status": EnrollmentStatus.ACTIVE,
            }):
                enr.status = EnrollmentStatus.REMOVED
                enr.removed_at = datetime.utcnow()
                await enr.save()
        else:
            raise HTTPException(status_code=409, detail="Contest has active enrollments. Use force=true to unenroll and delete.")

    await contest.delete()
    return {"message": "Contest deleted"}


@router.post("/{contest_id}/enroll-teams", response_model=List[EnrollmentResponse])
async def enroll_teams(
    contest_id: str,
    body: EnrollmentBulkRequest,
    current_user: User = Depends(get_admin_user),
):
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    if not body.team_ids:
        return []

    created: List[EnrollmentResponse] = []

    for tid in body.team_ids:
        try:
            oid = PydanticObjectId(tid)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid team id: {tid}")
        team = await Team.get(oid)
        if not team:
            raise HTTPException(status_code=404, detail=f"Team not found: {tid}")

        # Ensure no duplicate active enrollment
        existing = await TeamContestEnrollment.find_one(
            (TeamContestEnrollment.team_id == team.id)
            & (TeamContestEnrollment.contest_id == contest.id)
            & (TeamContestEnrollment.status == "active")
        )
        if existing:
            # skip duplicates silently
            continue

        enr = TeamContestEnrollment(
            team_id=team.id,
            user_id=team.user_id,
            contest_id=contest.id,
            status=EnrollmentStatus.ACTIVE,
            enrolled_at=datetime.utcnow(),
            initial_points=team.total_points,
        )
        await enr.insert()
        # Persist contest_id on the team for convenience
        try:
            team.contest_id = str(contest.id)
            team.updated_at = datetime.utcnow()
            await team.save()
        except Exception:
            # Do not fail enrollment if team update fails
            pass
        created.append(
            EnrollmentResponse(
                id=str(enr.id),
                team_id=str(enr.team_id),
                user_id=str(enr.user_id),
                contest_id=str(enr.contest_id),
                status=enr.status,
                enrolled_at=enr.enrolled_at,
                removed_at=enr.removed_at,
                initial_points=enr.initial_points,
            )
        )

    return created


@router.delete("/{contest_id}/enrollments")
async def unenroll(
    contest_id: str,
    body: UnenrollBulkRequest,
    current_user: User = Depends(get_admin_user),
):
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    count = 0
    # Collect affected team ids to batch-check for remaining active enrollments
    from typing import Set
    affected_team_ids: Set[PydanticObjectId] = set()

    if body.enrollment_ids:
        for eid in body.enrollment_ids:
            enr = await TeamContestEnrollment.get(eid)
            if enr and enr.contest_id == contest.id and enr.status == "active":
                enr.status = "removed"
                enr.removed_at = datetime.utcnow()
                await enr.save()
                count += 1
                affected_team_ids.add(enr.team_id)

    if body.team_ids:
        for tid in body.team_ids:
            try:
                toid = PydanticObjectId(tid)
            except Exception:
                continue
            enr = await TeamContestEnrollment.find_one(
                (TeamContestEnrollment.team_id == toid)
                & (TeamContestEnrollment.contest_id == contest.id)
                & (TeamContestEnrollment.status == EnrollmentStatus.ACTIVE)
            )
            if enr:
                enr.status = EnrollmentStatus.REMOVED
                enr.removed_at = datetime.utcnow()
                await enr.save()
                count += 1
                affected_team_ids.add(toid)

    # Batch check and clear team.contest_id for teams with no remaining active enrollments
    if affected_team_ids:
        try:
            # Find teams that still have at least one active enrollment for this contest
            still_active_team_ids: Set[PydanticObjectId] = set()
            async for active in TeamContestEnrollment.find({
                "team_id": {"$in": list(affected_team_ids)},
                "contest_id": contest.id,
                "status": "active",
            }):
                still_active_team_ids.add(active.team_id)

            # Teams to clear = affected - still_active
            to_clear_ids = [tid for tid in affected_team_ids if tid not in still_active_team_ids]
            for tid in to_clear_ids:
                team = await Team.get(tid)
                if team and team.contest_id is not None:
                    team.contest_id = None
                    team.updated_at = datetime.utcnow()
                    await team.save()
        except Exception:
            # Best-effort cleanup; ignore errors
            pass

    return {"unenrolled": count}
