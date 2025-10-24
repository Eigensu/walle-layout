from enum import Enum

class ContestStatus(str, Enum):
    UPCOMING = "upcoming"
    LIVE = "live"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ContestVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class PointsScope(str, Enum):
    TIME_WINDOW = "time_window"
    SNAPSHOT = "snapshot"


class ContestType(str, Enum):
    DAILY = "daily"
    FULL = "full"
