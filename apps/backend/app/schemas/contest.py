from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class ContestCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    status: Literal["upcoming", "live", "completed", "archived"] = "upcoming"
    visibility: Literal["public", "private"] = "public"
    points_scope: Literal["time_window", "snapshot"] = "time_window"
    contest_type: Literal["daily", "full"] = "full"
    # Allowed real-world team names (e.g., "IND", "AUS") for daily contests
    allowed_teams: List[str] = Field(default_factory=list)


class ContestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    status: Optional[Literal["upcoming", "live", "completed", "archived"]] = None
    visibility: Optional[Literal["public", "private"]] = None
    points_scope: Optional[Literal["time_window", "snapshot"]] = None
    contest_type: Optional[Literal["daily", "full"]] = None
    allowed_teams: Optional[List[str]] = None


class ContestResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    start_at: datetime
    end_at: datetime
    status: str
    visibility: str
    points_scope: str
    contest_type: str
    allowed_teams: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContestListResponse(BaseModel):
    contests: List[ContestResponse]
    total: int
    page: int
    page_size: int
