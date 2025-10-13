from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Dict


class Player(Document):
    """Player model for cricket players"""
    
    name: str
    team: Optional[str] = None
    role: Optional[str] = None  # Batsman, Bowler, All-Rounder, Wicket-Keeper
    price: float = 0.0
    slot: int = 1  # 1-4 representing different roles
    points: float = 0.0
    is_available: bool = True
    
    # Additional stats
    stats: Optional[Dict] = None  # {"matches": 0, "runs": 0, "wickets": 0, etc.}
    form: Optional[str] = None  # Recent form indicator
    injury_status: Optional[str] = None
    image_url: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "players"
        indexes = [
            "name",
            "team",
            "role",
            "slot",
            [("points", -1)],  # Descending order for leaderboard
            [("price", 1)],
        ]

    def __repr__(self):
        return f"<Player {self.name} - {self.team}>"

    def __str__(self):
        return self.name
