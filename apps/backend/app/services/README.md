# Services Layer

## Overview

The services layer contains the **business logic** of the application. It orchestrates operations, handles complex workflows, and coordinates between different parts of the system (models, utils, external APIs).

## Architecture Principles

### Services vs Utils

- **Services** (`app/services/`): Business logic, orchestration, workflows
  - Complex operations involving multiple steps
  - Database operations (CRUD, queries, transactions)
  - Business rules and validation
  - Coordination between multiple utilities
  - Domain-specific logic

- **Utils** (`app/utils/`): Reusable helper functions
  - Pure functions with no side effects (when possible)
  - Generic, reusable utilities
  - File parsing, formatting, conversion
  - Simple validation and normalization
  - No database operations

## Current Services

### PlayerImportService

**Purpose**: Handles the complete player import workflow from file upload to database persistence.

**Location**: `app/services/player_import/import_service.py`

**Key Methods**:

- `process_import()`: Main orchestration method
- `parse_file()`: Parse uploaded XLSX/CSV files
- `validate_and_process_rows()`: Validate data and handle conflicts
- `save_players()`: Persist validated players to database
- `create_import_log()`: Log import operations

**Uses Utils**:

- `app/utils/import_players/import_parsers.py`: File parsing (parse_xlsx, parse_csv)
- `app/utils/import_players/import_validators.py`: Data validation (validate_player_row, check_conflict)
- `app/utils/import_players/import_template.py`: Template generation

**Used By**:

- `app/routes/admin/players_import.py`: Import endpoints

## Best Practices

1. **Single Responsibility**: Each service should focus on one domain/feature
2. **Testability**: Services should be easy to test in isolation
3. **Dependency Injection**: Pass dependencies as parameters, avoid hardcoded values
4. **Error Handling**: Raise appropriate exceptions, let routes handle HTTP responses
5. **Documentation**: Document complex business logic with clear docstrings
6. **Stateless**: Services should be stateless (use static methods or instance methods with no state)

## Adding New Services

When creating a new service:

1. Create a new subdirectory in `app/services/` (e.g., `team/`)
2. Create the service file (e.g., `team/team_service.py`)
3. Add `__init__.py` to the subdirectory to export the service
4. Create a service class with static methods or instantiate if state is needed
5. Keep business logic separate from HTTP concerns (no FastAPI dependencies)
6. Use utils for reusable functions, services for orchestration
7. Update `app/services/__init__.py` to export the service
8. Document the service in this README

## Example Structure

```python
# app/services/team/team_service.py
"""Example service for managing teams"""
from typing import List, Optional
from app.models.team import Team
from app.utils.validators import validate_team_data

class TeamService:
    """Service for team-related business logic"""

    @staticmethod
    async def create_team(name: str, members: List[str]) -> Team:
        """
        Create a new team with validation

        Args:
            name: Team name
            members: List of member IDs

        Returns:
            Created team

        Raises:
            ValueError: If validation fails
        """
        # Business logic here
        validated_data = validate_team_data(name, members)
        team = Team(**validated_data)
        await team.insert()
        return team
```

```python
# app/services/team/__init__.py
"""Team service package"""
from app.services.team.team_service import TeamService

__all__ = ["TeamService"]
```

## Migration Notes

- Import business logic has been migrated from `app/utils/import_players/` to `app/services/player_import/import_service.py`
- Pure utility functions (parsers, validators, templates) remain in `app/utils/`
- Routes now use services instead of directly calling utils
