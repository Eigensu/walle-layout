from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class ContestCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    status: Literal["draft", "active", "paused", "completed", "archived"] = "draft"
    visibility: Literal["public", "private"] = "public"
    points_scope: Literal["time_window", "snapshot"] = "time_window"


class ContestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    status: Optional[Literal["draft", "active", "paused", "completed", "archived"]] = None
    visibility: Optional[Literal["public", "private"]] = None
    points_scope: Optional[Literal["time_window", "snapshot"]] = None


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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContestListResponse(BaseModel):
    contests: List[ContestResponse]
    total: int
    page: int
    page_size: int
