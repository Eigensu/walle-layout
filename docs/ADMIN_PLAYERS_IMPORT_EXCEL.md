## Admin Players – Excel Import Tech Spec

Updated: 2025-10-15

### Objective

Enable admins to bulk add/update players by importing an Excel (XLSX) file from the Admin › Players section. The import should validate data, provide a detailed dry-run report, and on confirmation persist players into MongoDB using Beanie.

### In-scope

- Accept .xlsx (preferred) and .csv (fallback) uploads
- Validate and normalize player records against existing Admin Player model
- Optional slot mapping to existing Slot documents
- Conflict handling (skip/update/error)
- Dry run for preview with row-level errors before commit
- Admin UI for uploading, previewing issues, and confirming import

### Out-of-scope (initial)

- Background queue/async jobs for very large files (can be added later)
- Versioned templates per season (initially a single template)
- Team canonicalization against an organization table (free-text accepted for now)

---

## Data model alignment

We will import into the Admin Player collection (`app/models/admin/player.py`, collection name "players"). Relevant fields:

- name: str (required)
- team: str (required)
- role: str (required; allowed: Batsman, Bowler, All-Rounder, Wicket-Keeper)
- points: float (default 0.0)
- status: str (default Active; allowed: Active, Inactive, Injured)
- price: float (default 8.0)
- slot: Optional[str] (Slot ObjectId as string); can be left blank
- image_url: Optional[str]
- stats: Optional[dict] (arbitrary key/value stats)

Note: Public Player model exists separately; import targets Admin Player model as used by Admin routes.

---

## File formats

Preferred: XLSX (.xlsx)

- Why: supports data validation (dropdowns), formatting, and is less error-prone than CSV for commas and decimals.
- Library: openpyxl for parsing and generating templates (lightweight, no heavy pandas dependency needed).

Alternative: CSV (.csv)

- Encoding: UTF-8
- Delimiter: comma (,)
- Quoting: standard CSV quoting
- Library: built-in csv module

Limits (configurable via env):

- Max file size: 5 MB (.xlsx) / 2 MB (.csv) initially
- Max rows per upload: 5,000

---

## Template specification

Columns (header row is required):

1. name (required)
2. team (required)
3. role (required; one of: Batsman, Bowler, All-Rounder, Wicket-Keeper)
4. status (optional; default Active; allowed: Active, Inactive, Injured)
5. price (optional; number; default 8.0)
6. points (optional; number; default 0)
7. slot_code (optional; maps to Slot.code)
8. slot_name (optional; maps to Slot.name)
9. slot_id (optional; Slot ObjectId string)
10. image_url (optional)
    11+. Any additional columns are captured under stats as key/value pairs. Example: matches, runs, wickets.

Header example (CSV):

```
name,team,role,status,price,points,slot_code,slot_name,slot_id,image_url,matches,runs,wickets
```

Row example:

```
John Doe,DV SPARTANS,Batsman,Active,9.5,0,SLOT_BAT,Batsmen, ,https://cdn/img.png,25,742,0
```

XLSX Template behaviors:

- Data validation dropdowns for role and status.
- Optional dynamic list for slot_code populated from existing Slot.code values.
- Column widths and header styling for clarity.

Backend will expose a template download endpoint that returns the latest XLSX template (and a CSV fallback).

---

## Backend API design (FastAPI)

Base: `/api/admin/players/import` (requires JWT via `get_current_user`)

1. POST `/api/admin/players/import/template`

- Query: `format=xlsx|csv` (default xlsx)
- Response: file download
- Behavior: For xlsx, generate with openpyxl including validation lists. For csv, return static header line.

2. POST `/api/admin/players/import`

- Content-Type: multipart/form-data
- Fields:
  - `file`: upload file (.xlsx or .csv)
  - `dry_run`: boolean (default true)
  - `conflict`: enum `skip|update|error` (default `skip`)
  - `slot_strategy`: enum `lookup|create|ignore` (default `lookup`)
  - `role_normalize`: enum `strict|loose` (default `loose`)
  - `header_row`: int (default 1)
  - Optional: `idempotency_key`: string (also supported via header `Idempotency-Key`)
- Response 200 (application/json):

```
{
  "dry_run": true,
  "format": "xlsx",
  "total_rows": 123,
  "valid_rows": 120,
  "invalid_rows": 3,
  "created": 0,
  "updated": 0,
  "skipped": 0,
  "conflicts": [
    { "row": 12, "reason": "Duplicate name: John Doe" }
  ],
  "errors": [
    { "row": 5, "field": "role", "message": "Invalid role 'BAT' (did you mean 'Batsman'?)" },
    { "row": 6, "field": "price", "message": "Must be a number >= 0" }
  ],
  "samples": [
    { "name": "John Doe", "team": "DV SPARTANS", "role": "Batsman", "price": 9.5, "slot": "66f..." }
  ]
}
```

- When `dry_run=false`, returns counts for `created/updated/skipped` and includes a `job_id` for traceability. Partial failures are reported per-row; successful rows proceed according to conflict policy.

Idempotency: Requests with the same idempotency key within 24h return the same result without re-writing. Store a record in an `imports` collection with checksum of file.

Auth: Uses `get_current_user` dependency; optionally enforce role/permission check if/when available.

---

## Parsing and validation

Parsing

- XLSX: openpyxl with `read_only=True`, iterate rows from `header_row+1`.
- CSV: Python csv reader with UTF-8 and newline handling.
- Header matching: case-insensitive, trims whitespace, underscores/hyphens normalized (e.g., `Slot Code` → `slot_code`).

Validation rules per row

- name: required, non-empty string (1..100)
- team: required, non-empty string (1..100)
- role: required; normalize if `role_normalize=loose` using mapping (see below), else must match exactly one of allowed roles.
- status: optional; defaults to Active; must be one of allowed statuses if present.
- price: optional; number ≥ 0; default 8.0.
- points: optional; number ≥ 0; default 0.
- slot: resolved using priority: `slot_id` → `slot_code` → `slot_name` (see mapping rules). If not resolvable and `slot_strategy=lookup`, leave null and warn. If `slot_strategy=create`, auto-create Slot with code `SLOT_<CODED>` or from name; return created Slot IDs in response meta. If `slot_strategy=ignore`, do not attempt mapping.
- image_url: optional; validated with basic URL regex or left as-is.
- stats: any additional columns (beyond defined) become a dict of string/number values.

Duplicate detection & conflicts

- Default uniqueness key: player name (case-insensitive).
- Conflict policy:
  - skip: do not persist conflicting rows; add to `conflicts` list.
  - update: update existing player document (only fields provided in the row; unspecified keep existing); update `updated_at`.
  - error: treat duplicates as validation errors and fail the row.
- Future: consider compound uniqueness (name + team) if duplicates across teams are allowed.

Error reporting

- Collect row-level issues; return line number (1-based as in file), field name, and message.
- Cap errors returned (e.g., max 200) with `has_more_errors: true` if truncated.

---

## Mapping rules

Role normalization (loose)

- Accept common variants and map to canonical values:
  - "BAT", "Batter", "Batsman" → Batsman
  - "BWL", "Bowler" → Bowler
  - "AR", "Allrounder", "All-Rounder" → All-Rounder
  - "WK", "Wicketkeeper", "Wicket Keeper", "WKT" → Wicket-Keeper

Status normalization

- Accept: Active, Inactive, Injured (case-insensitive); default Active.

Slot mapping

- Prefer `slot_id` if valid ObjectId and exists.
- Else if `slot_code` present, find by `Slot.code` (case-insensitive). If not found and `slot_strategy=create`, create new Slot with name derived from code.
- Else if `slot_name` present, find by `Slot.name` (case-insensitive). If not found and `slot_strategy=create`, create it.
- Persist Admin Player.slot as string of the Slot ObjectId.

Stats aggregation

- Any column not in the fixed set is captured as `stats[column_name] = value` (numbers parsed to float/int when possible; else string).

---

## Processing & persistence

Flow

1. Receive file, enforce size/extension/content-type.
2. Parse headers, map to normalized keys.
3. Iterate rows in streaming fashion; validate and build `PlayerCreate` payloads.
4. Dry-run: collect results without DB writes except slot lookup/create (creation only when `slot_strategy=create` and `dry_run=false`). For dry-run, simulate slot mapping and report would-be creations.
5. Commit: in chunks of 100-500 rows:
   - Resolve conflicts per policy.
   - Use `insert_many` for new docs, and `save()` for updates; update `updated_at` for changed docs.
6. Write an ImportLog document with summary and per-row status (optional, see auditing) and respond with counts.

Performance & limits

- Chunk size: 200
- Target throughput: ~5k rows < 10s in typical local env; adjust limits if needed.
- Indexes: `name` already indexed in Admin Player; consider adding a unique index on lower(name) in the future if we want strict global uniqueness (not implemented now).

Idempotency

- Compute file SHA256 and store with idempotency key + user in an `imports` collection. If a new request matches the same checksum and key, return previous result without re-processing.

---

## Security & compliance

- Auth: Require valid access token (`get_current_user`).
- Authorization: Only admins should access; if/when RBAC is implemented, enforce role check.
- File validation: check MIME and extension; limit size; reject macro-enabled Excel.
- Rate limiting: basic per-user limit for import endpoints (future; can be enforced at gateway/CDN).
- Auditing: persist ImportLog with who/when/what.
- Secrets: none involved; use temp storage only in memory or `/tmp`.

---

## Observability & logging

- Structured logs per import with: user_id, total_rows, created, updated, skipped, invalid_rows, duration, checksum.
- Metrics: counters for imports started/succeeded/failed; histogram for rows processed.
- ImportLog collection document shape:

```
{
  _id, user_id, started_at, completed_at, dry_run,
  filename, size, checksum,
  total_rows, created, updated, skipped, invalid_rows,
  conflict_policy, slot_strategy,
  sample_errors: [{row, field, message}],
}
```

---

## Frontend (Admin UI) changes

Location: Admin › Players section (`frontend/src/components/admin` and/or `apps/frontend` equivalent).

New UI elements:

- Download template button (XLSX; with CSV dropdown)
- File upload dropzone (accept .xlsx and .csv)
- Options:
  - Dry run (default on)
  - Conflict policy select: Skip / Update / Error
  - Slot strategy select: Lookup / Create / Ignore
- Preview panel:
  - Summary: total rows, valid, invalid
  - Table of first 50 rows with inline validation states
  - Error list with row numbers and messages
- Confirm import button (enabled only when dry-run has 0 errors)
- Results toast: created/updated/skipped counts, link to recent import logs

API integration:

- GET `/api/admin/players/import/template?format=xlsx`
- POST `/api/admin/players/import` (dry_run=true), then re-POST with dry_run=false

Edge UX cases:

- Show spinner/progress for large files
- Clear and re-run preview when file or options change
- Guard against double-submission (use idempotency key from client)

---

## Dependencies & configuration

Backend packages to add (apps/backend/requirements.txt):

- openpyxl==3.1.\* (XLSX parsing and template generation)
- Optional (later): pandas==2.2.\* for convenience with large CSVs if needed

Environment variables (optional):

- IMPORT_MAX_FILE_BYTES (default 5_000_000)
- IMPORT_MAX_ROWS (default 5000)
- IMPORT_CHUNK_SIZE (default 200)
- IMPORT_REJECT_MACROS (default true)

---

## Minimal API sketches

Router: `app/routes/admin/players_import.py`

```
router = APIRouter(prefix="/api/admin/players/import", tags=["Admin - Players Import"])

@router.post("/template")
async def get_template(format: str = Query("xlsx", pattern="^(xlsx|csv)$"), current_user: User = Depends(get_current_user)):
    ...

@router.post("")
async def import_players(file: UploadFile, dry_run: bool = True, conflict: str = "skip", slot_strategy: str = "lookup", ... , current_user: User = Depends(get_current_user)):
    ...
```

Implementation notes:

- Use `python-multipart` (already present) for uploads.
- For openpyxl: `load_workbook(file.file, read_only=True, data_only=True)`.
- For CSV: `io.TextIOWrapper(file.file, encoding="utf-8")` with csv.DictReader.
- Use Pydantic `PlayerCreate`/`PlayerUpdate` for schema validation step by step.
- Batch DB operations; reuse existing Admin Player model.

---

## Testing strategy

- Unit tests for parser/normalizer (xlsx and csv) with fixtures (small samples)
- Validation tests for each rule (required fields, role/status, numeric bounds)
- Conflict policy tests (skip/update/error)
- Slot mapping tests (id/code/name; create vs lookup)
- Dry-run vs commit path tests
- Large file boundary tests (row/size limits)

---

## Rollout plan

1. Backend: implement endpoints and add requirements; deploy behind feature flag `ADMIN_PLAYERS_IMPORT=true`.
2. Frontend: add UI; hide behind the same flag.
3. QA: validate with sample files (10 rows, 100 rows, 5k rows), including edge cases.
4. Observability: verify logs and metrics; review ImportLog records.
5. Enable feature in staging → production.

---

## Risks & decisions

- Duplicate name policy: starting with global uniqueness by name; may evolve to (name + team).
- Slot auto-create could create noisy data; default to lookup only in first release.
- XLSX validation lists require live slot codes; template might become stale; we accept small drift and provide CSV fallback.
- Transactions: Mongo multi-document transactions are not used; we rely on dry-run and chunked writes; partial failures are reported.

---

## Developer checklist (initial implementation)

- [ ] Add dependencies (openpyxl) to requirements.txt
- [ ] Create `players_import.py` router with endpoints
- [ ] Wire router in `app/routes/admin/__init__.py` and app startup
- [ ] Implement XLSX and CSV parsing utilities
- [ ] Implement validators and normalizers
- [ ] Implement conflict resolution and batch persistence
- [ ] Implement ImportLog document (optional but recommended)
- [ ] Add unit tests and example fixtures under `apps/backend/tests`
- [ ] Frontend Admin UI for template download, dry-run, confirm
- [ ] Update docs with template examples and troubleshooting
