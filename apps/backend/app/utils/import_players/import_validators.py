"""Validation and normalization utilities for player imports"""
from typing import Optional, Dict, Any, List, Tuple
from app.models.admin.player import Player
from app.models.admin.slot import Slot
from beanie import PydanticObjectId


# Role normalization mappings
ROLE_MAPPINGS = {
    "bat": "Batsman",
    "batter": "Batsman",
    "batsman": "Batsman",
    "bats": "Batsman",
    "bwl": "Bowler",
    "bowl": "Bowler",
    "bowler": "Bowler",
    "ar": "All-Rounder",
    "allrounder": "All-Rounder",
    "all-rounder": "All-Rounder",
    "all_rounder": "All-Rounder",
    "wk": "Wicket-Keeper",
    "wicketkeeper": "Wicket-Keeper",
    "wicket-keeper": "Wicket-Keeper",
    "wicket_keeper": "Wicket-Keeper",
    "wkt": "Wicket-Keeper",
    "keeper": "Wicket-Keeper",
}

# Status normalization
STATUS_MAPPINGS = {
    "active": "Active",
    "inactive": "Inactive",
    "injured": "Injured",
}

ALLOWED_STATUSES = {"Active", "Inactive", "Injured"}


class ValidationError(Exception):
    """Validation error with field and message"""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


def normalize_role(role: Optional[str], strict: bool = False) -> str:
    """
    Normalize role value
    
    Args:
        role: Raw role value
        strict: If True, require exact match
        
    Returns:
        Normalized role
        
    Raises:
        ValidationError: If role is invalid
    """
    if not role:
        raise ValidationError("role", "Role is required")
    
    role_clean = role.strip()
    
    # Check exact match first
    if role_clean in ALLOWED_ROLES:
        return role_clean
    
    # Try loose matching if not strict
    if not strict:
        role_lower = role_clean.lower()
        if role_lower in ROLE_MAPPINGS:
            return ROLE_MAPPINGS[role_lower]
        
        # Suggest similar role
        suggestions = [r for r in ALLOWED_ROLES if role_lower in r.lower()]
        if suggestions:
            raise ValidationError("role", f"Invalid role '{role}' (did you mean '{suggestions[0]}'?)")
    
    raise ValidationError("role", f"Invalid role '{role}'. Allowed: {', '.join(ALLOWED_ROLES)}")


def normalize_status(status: Optional[str]) -> str:
    """Normalize status value"""
    if not status:
        return "Active"
    
    status_clean = status.strip()
    
    # Check exact match
    if status_clean in ALLOWED_STATUSES:
        return status_clean
    
    # Try case-insensitive match
    status_lower = status_clean.lower()
    if status_lower in STATUS_MAPPINGS:
        return STATUS_MAPPINGS[status_lower]
    
    raise ValidationError("status", f"Invalid status '{status}'. Allowed: {', '.join(ALLOWED_STATUSES)}")


def validate_name(name: Optional[str]) -> str:
    """Validate and normalize name"""
    if not name or not name.strip():
        raise ValidationError("name", "Name is required")
    
    name_clean = name.strip()
    if len(name_clean) < 1 or len(name_clean) > 100:
        raise ValidationError("name", "Name must be 1-100 characters")
    
    return name_clean


def validate_team(team: Optional[str]) -> str:
    """Validate and normalize team"""
    if not team or not team.strip():
        raise ValidationError("team", "Team is required")
    
    team_clean = team.strip()
    if len(team_clean) < 1 or len(team_clean) > 100:
        raise ValidationError("team", "Team must be 1-100 characters")
    
    return team_clean


def validate_number(value: Any, field: str, min_val: float = 0) -> float:
    """Validate numeric field"""
    if value is None:
        return 0.0
    
    try:
        num = float(value)
        if num < min_val:
            raise ValidationError(field, f"Must be >= {min_val}")
        return num
    except (ValueError, TypeError):
        raise ValidationError(field, f"Must be a number >= {min_val}")


async def resolve_slot(
    slot_id: Optional[str],
    slot_code: Optional[str],
    slot_name: Optional[str],
    strategy: str = "lookup"
) -> Optional[str]:
    """
    Resolve slot to ObjectId string
    
    Args:
        slot_id: Slot ObjectId string
        slot_code: Slot code
        slot_name: Slot name
        strategy: 'lookup', 'create', or 'ignore'
        
    Returns:
        Slot ObjectId as string, or None
    """
    if strategy == "ignore":
        return None
    
    slot_doc = None
    
    # Try slot_id first
    if slot_id:
        try:
            oid = PydanticObjectId(slot_id)
            slot_doc = await Slot.get(oid)
        except Exception:
            pass
    
    # Try slot_code
    if not slot_doc and slot_code:
        slot_doc = await Slot.find_one(Slot.code == slot_code.strip())
        
        if not slot_doc and strategy == "create":
            # Create new slot from code
            from datetime import datetime
            slot_doc = Slot(
                code=slot_code.strip().upper(),
                name=slot_code.strip().replace("_", " ").title(),
                min_select=4,
                max_select=4,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await slot_doc.insert()
    
    # Try slot_name
    if not slot_doc and slot_name:
        slot_doc = await Slot.find_one(Slot.name == slot_name.strip())
        
        if not slot_doc and strategy == "create":
            # Create new slot from name
            from datetime import datetime
            code = slot_name.strip().upper().replace(" ", "_")
            slot_doc = Slot(
                code=code,
                name=slot_name.strip(),
                min_select=4,
                max_select=4,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await slot_doc.insert()
    
    return str(slot_doc.id) if slot_doc else None


def extract_stats(row: Dict[str, Any], known_fields: set) -> Optional[Dict[str, Any]]:
    """Extract additional fields as stats dictionary"""
    stats = {}
    for key, value in row.items():
        if key not in known_fields and not key.startswith("_") and value is not None:
            stats[key] = value
    
    return stats if stats else None


async def validate_player_row(
    row: Dict[str, Any],
    slot_strategy: str = "lookup"
) -> Tuple[Dict[str, Any], Optional[ValidationError]]:
    """
    Validate and normalize a single player row
    
    Returns:
        Tuple of (normalized_data, error)
        If error is not None, normalized_data may be partial
    """
    known_fields = {
        "name", "team", "status", "points",
        "slot_id", "slot_code", "slot_name", "image_url", "image", "_row_number"
    }
    
    try:
        # Use points for the price field (since we're using points in the template)
        points_value = validate_number(row.get("points", 0), "points", 0)
        
        # Accept both "image" and "image_url" columns
        image_url = row.get("image_url") or row.get("image")
        
        data = {
            "name": validate_name(row.get("name")),
            "team": validate_team(row.get("team")),
            "status": normalize_status(row.get("status")),
            "price": points_value,  # Map points to price for database
            "points": 0,  # Always start with 0 accumulated points
            "image_url": image_url,
            "stats": extract_stats(row, known_fields),
        }
        
        # Resolve slot
        slot = await resolve_slot(
            row.get("slot_id"),
            row.get("slot_code"),
            row.get("slot_name"),
            slot_strategy
        )
        data["slot"] = slot
        
        return data, None
        
    except ValidationError as e:
        return {}, e


async def check_conflict(name: str) -> Optional[Player]:
    """Check if player with name already exists"""
    return await Player.find_one(Player.name == name)
