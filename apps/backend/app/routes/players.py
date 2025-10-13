from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from beanie import PydanticObjectId
from app.models.player import Player
from app.schemas.player import PlayerOut

router = APIRouter(prefix="/api/players", tags=["players"])


def serialize_player(player: Player) -> PlayerOut:
    """Convert Player model to PlayerOut schema"""
    return PlayerOut(
        id=str(player.id),
        name=player.name,
        team=player.team,
        role=player.role,
        price=player.price,
        slot=player.slot,
        points=player.points,
        is_available=player.is_available,
        stats=player.stats,
        form=player.form,
        injury_status=player.injury_status,
        image_url=player.image_url,
        created_at=player.created_at,
        updated_at=player.updated_at,
    )


@router.get("", response_model=List[PlayerOut])
async def list_players(
    slot: Optional[int] = Query(None, ge=1, le=4),
    limit: int = Query(200, ge=1, le=1000),
    skip: int = Query(0, ge=0),
):
    """Get list of players with optional filtering by slot"""
    query = {}
    if slot is not None:
        query = {"slot": slot}
    
    players = await Player.find(query).sort("+name").skip(skip).limit(limit).to_list()
    return [serialize_player(player) for player in players]


@router.get("/{id}", response_model=PlayerOut)
async def get_player(id: str):
    """Get a specific player by ID"""
    try:
        player = await Player.get(PydanticObjectId(id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return serialize_player(player)
