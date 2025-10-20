from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class EnrollmentBulkRequest(BaseModel):
    team_ids: List[str] = Field(default_factory=list)


class UnenrollBulkRequest(BaseModel):
    team_ids: Optional[List[str]] = None
    enrollment_ids: Optional[List[str]] = None


class EnrollmentResponse(BaseModel):
    id: str
    team_id: str
    user_id: str
    contest_id: str
    status: str
    enrolled_at: datetime
    removed_at: Optional[datetime] = None
    initial_points: float

    class Config:
        from_attributes = True
