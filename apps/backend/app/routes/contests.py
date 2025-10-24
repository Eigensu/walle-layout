from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from typing import Optional, List, Dict
from beanie import PydanticObjectId
from beanie.operators import Or, RegEx
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId

from app.models.contest import Contest
from app.models.team_contest_enrollment import TeamContestEnrollment
from app.models.team import Team
from app.models.user import User
from app.models.player import Player
from app.utils.security import decode_token
from app.schemas.contest import ContestListResponse, ContestResponse
from app.schemas.leaderboard import LeaderboardResponseSchema, LeaderboardEntrySchema
from app.utils.dependencies import get_current_active_user
from app.schemas.enrollment import EnrollmentResponse
from app.common.enums.contests import ContestVisibility
from app.common.enums.enrollments import EnrollmentStatus

router = APIRouter(prefix="/api/contests", tags=["contests"])


async def to_contest_response(contest: Contest) -> ContestResponse:
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
        created_at=contest.created_at,
        updated_at=contest.updated_at,
    )


async def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        payload = decode_token(token)
    except Exception:
        return None
    if payload is None:
        return None
    username = payload.get("sub")
    if not username or not isinstance(username, str):
        return None
    user = await User.find_one(User.username == username)
    return user


@router.get("", response_model=ContestListResponse)
async def list_public_contests(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
):
    conditions = [Contest.visibility == ContestVisibility.PUBLIC]
    if status:
        conditions.append(Contest.status == status)

    query = Contest.find(conditions[0]) if conditions else Contest.find_all()
    for cond in conditions[1:]:
        query = query.find(cond)

    if q:
        query = Contest.find(Or(RegEx(Contest.code, q, options="i"), RegEx(Contest.name, q, options="i")))
        # still ensure visibility/public and status if provided
        for cond in conditions:
            query = query.find(cond)

    total = await query.count()
    skip = (page - 1) * page_size
    rows = await query.skip(skip).limit(page_size).sort(-Contest.start_at).to_list()

    return {
        "contests": [await to_contest_response(c) for c in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/enrollments/me", response_model=List[EnrollmentResponse])
async def list_my_enrollments(current_user: User = Depends(get_current_active_user)):
    """Return active contest enrollments for the authenticated user."""
    enrollments = await TeamContestEnrollment.find({
        "user_id": current_user.id,
        "status": "active",
    }).to_list()

    results: List[EnrollmentResponse] = []
    for enr in enrollments:
        results.append(EnrollmentResponse(
            id=str(enr.id),
            team_id=str(enr.team_id),
            user_id=str(enr.user_id),
            contest_id=str(enr.contest_id),
            status=enr.status,
            enrolled_at=enr.enrolled_at,
            removed_at=enr.removed_at,
            initial_points=enr.initial_points,
        ))
    return results


@router.get("/{contest_id}", response_model=ContestResponse)
async def get_public_contest(contest_id: str):
    contest = await Contest.get(contest_id)
    if not contest or contest.visibility != ContestVisibility.PUBLIC:
        raise HTTPException(status_code=404, detail="Contest not found")
    return await to_contest_response(contest)


@router.get("/{contest_id}/me", response_model=ContestResponse)
async def get_contest_if_enrolled(contest_id: str, current_user: User = Depends(get_current_active_user)):
    """Return contest details if it's public OR the current user is enrolled (active)."""
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    if contest.visibility == ContestVisibility.PUBLIC:
        return await to_contest_response(contest)
    # Check enrollment for private contests
    enr = await TeamContestEnrollment.find_one({
        "contest_id": contest.id,
        "user_id": current_user.id,
        "status": EnrollmentStatus.ACTIVE,
    })
    if not enr:
        raise HTTPException(status_code=404, detail="Contest not found")
    return await to_contest_response(contest)


@router.get("/{contest_id}/leaderboard", response_model=LeaderboardResponseSchema)
async def contest_leaderboard(
    contest_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    contest = await Contest.get(contest_id)
    if not contest or contest.visibility != ContestVisibility.PUBLIC:
        raise HTTPException(status_code=404, detail="Contest not found")

    # fetch active enrollments
    enrollments = await TeamContestEnrollment.find({
        "contest_id": contest.id,
        "status": EnrollmentStatus.ACTIVE,
    }).to_list()

    if not enrollments:
        return LeaderboardResponseSchema(entries=[], currentUserEntry=None)

    team_ids = [enr.team_id for enr in enrollments]

    # fetch teams in batch
    teams = await Team.find({"_id": {"$in": team_ids}}).to_list()
    teams_by_id: Dict[str, Team] = {str(t.id): t for t in teams}

    # fetch users in batch
    user_ids = list({t.user_id for t in teams})
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    users_by_id: Dict[str, User] = {str(u.id): u for u in users}

    # compute points and build entries
    computed = []
    for enr in enrollments:
        team = teams_by_id.get(str(enr.team_id))
        if not team:
            continue
        user = users_by_id.get(str(team.user_id))
        if not user:
            continue
        points = float(team.total_points) - float(enr.initial_points)
        computed.append((team, user, points))

    # sort by points desc
    computed.sort(key=lambda tup: tup[2], reverse=True)

    # pagination
    sliced = computed[skip: skip + limit]

    entries: List[LeaderboardEntrySchema] = []
    current_user_entry: Optional[LeaderboardEntrySchema] = None

    for idx, (team, user, points) in enumerate(sliced, start=skip + 1):
        entry = LeaderboardEntrySchema(
            rank=idx,
            username=user.username,
            displayName=user.full_name or user.username,
            teamName=team.team_name,
            points=points,
            rankChange=team.rank_change,
        )
        entries.append(entry)

    if current_user:
        # find current user's best-ranked team entry within this contest
        for rank_idx, (team, user, points) in enumerate(computed, start=1):
            if str(user.id) == str(current_user.id):
                current_user_entry = LeaderboardEntrySchema(
                    rank=rank_idx,
                    username=user.username,
                    displayName=user.full_name or user.username,
                    teamName=team.team_name,
                    points=points,
                    rankChange=team.rank_change,
                )
                break

    return LeaderboardResponseSchema(entries=entries, currentUserEntry=current_user_entry)


class EnrollRequest(BaseModel):
    team_id: str


@router.post("/{contest_id}/enroll", response_model=EnrollmentResponse)
async def enroll_in_contest(
    contest_id: str,
    body: EnrollRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Enroll the authenticated user's team into a public contest.

    Rules:
    - Contest must exist and be public
    - Contest status cannot be completed/archived
    - Team must belong to the current user
    - Idempotent: if already enrolled and active, return existing enrollment
    """
    contest = await Contest.get(contest_id)
    if not contest or contest.visibility != "public":
        raise HTTPException(status_code=404, detail="Contest not found")

    if contest.status in ("completed", "archived"):
        raise HTTPException(status_code=400, detail="Contest is not open for enrollment")

    # validate team ownership (avoid exceptions for validation)
    if not ObjectId.is_valid(body.team_id):
        raise HTTPException(status_code=400, detail="Invalid team id")
    tid = PydanticObjectId(body.team_id)

    team = await Team.get(tid)
    if not team or team.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Team not found")

    # Idempotent check
    existing = await TeamContestEnrollment.find_one({
        "team_id": team.id,
        "contest_id": contest.id,
        "status": EnrollmentStatus.ACTIVE,
    })
    if existing:
        return EnrollmentResponse(
            id=str(existing.id),
            team_id=str(existing.team_id),
            user_id=str(existing.user_id),
            contest_id=str(existing.contest_id),
            status=existing.status,
            enrolled_at=existing.enrolled_at,
            removed_at=existing.removed_at,
            initial_points=existing.initial_points,
        )

    # Snapshot per-player baselines at enrollment
    player_baselines: Dict[str, float] = {}
    if team.player_ids:
        player_docs = await Player.find({"_id": {"$in": [PydanticObjectId(pid) for pid in team.player_ids if ObjectId.is_valid(pid)]}}).to_list()
        for p in player_docs:
            player_baselines[str(p.id)] = float(p.points or 0)

    enr = TeamContestEnrollment(
        team_id=team.id,
        contest_id=contest.id,
        user_id=current_user.id,
        status=EnrollmentStatus.ACTIVE,
        enrolled_at=datetime.utcnow(),
        initial_points=team.total_points,
        player_initial_points=player_baselines,
    )
    await enr.insert()

    return EnrollmentResponse(
        id=str(enr.id),
        team_id=str(enr.team_id),
        user_id=str(enr.user_id),
        contest_id=str(enr.contest_id),
        status=enr.status,
        enrolled_at=enr.enrolled_at,
        removed_at=enr.removed_at,
        initial_points=enr.initial_points,
    )


class ContestTeamPlayerSchema(BaseModel):
    id: str
    name: str
    team: Optional[str] = None
    role: Optional[str] = None
    price: float = 0.0
    base_points: float = 0.0
    contest_points: float = 0.0


class ContestTeamResponse(BaseModel):
    team_id: str
    team_name: str
    contest_id: str
    base_points: float
    contest_points: float
    players: List[ContestTeamPlayerSchema]


@router.get("/{contest_id}/teams/{team_id}", response_model=ContestTeamResponse)
async def get_team_in_contest(contest_id: str, team_id: str, current_user: User = Depends(get_current_active_user)):
    contest = await Contest.get(contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    try:
        team = await Team.get(PydanticObjectId(team_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Team not found")
    if not team or team.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Team not found")

    enr = await TeamContestEnrollment.find_one({
        "team_id": team.id,
        "contest_id": contest.id,
        "status": EnrollmentStatus.ACTIVE,
    })
    if not enr:
        raise HTTPException(status_code=404, detail="Team is not enrolled in this contest")

    # Load players
    player_ids_valid = [PydanticObjectId(pid) for pid in team.player_ids if ObjectId.is_valid(pid)]
    players = await Player.find({"_id": {"$in": player_ids_valid}}).to_list()

    players_by_id: Dict[str, Player] = {str(p.id): p for p in players}
    base_map = enr.player_initial_points or {}

    player_items: List[ContestTeamPlayerSchema] = []
    for pid in team.player_ids:
        p = players_by_id.get(pid)
        if not p:
            continue
        base = float(base_map.get(pid, 0.0))
        cur = float(p.points or 0.0)
        player_items.append(ContestTeamPlayerSchema(
            id=pid,
            name=p.name,
            team=p.team,
            role=p.role,
            price=float(p.price or 0.0),
            base_points=base,
            contest_points=cur - base,
        ))

    team_points = float(team.total_points) - float(enr.initial_points or 0.0)

    return ContestTeamResponse(
        team_id=str(team.id),
        team_name=team.team_name,
        contest_id=str(contest.id),
        base_points=float(enr.initial_points or 0.0),
        contest_points=team_points,
        players=player_items,
    )
