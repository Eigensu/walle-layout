from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from datetime import datetime
from typing import Literal, Optional


class TeamContestEnrollment(Document):
    """Join document mapping a Team to a Contest with enrollment metadata."""

    team_id: PydanticObjectId
    user_id: PydanticObjectId  # denormalized for faster queries
    contest_id: PydanticObjectId

    status: Literal["active", "removed"] = "active"
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    removed_at: Optional[datetime] = None

    # Baseline from Team.total_points at enrollment time for Phase 1
    initial_points: float = 0.0

    class Settings:
        name = "team_contest_enrollments"
        indexes = [
            "team_id",
            "contest_id",
            "user_id",
            [("contest_id", 1), ("status", 1)],
            [("team_id", 1), ("contest_id", 1), ("status", 1)],
        ]
