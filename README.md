# Admission PS

AI-powered all-India college discovery and admission guidance platform.

**Stack:** React, TypeScript, Vite, Tailwind CSS 4, FastAPI, PostgreSQL, SQLAlchemy, Pandas, Recharts, Pytest and Vitest

## Build status

The project is being built in phases.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project setup, database schema, college directory API, importer, premium UI (home, explore, college page, compare) | Done and deployed from `main` |
| 2 | Qualification-based college finder and eligibility logic (Admission Predictor) | Code and tests complete on branch `phase-2`. Preview testing pending, **not merged into `main` yet** |
| 3 | JEE Main and JEE Advanced predictors on JoSAA data | Not started |
| 4 | Google login (Firebase), student dashboard, saved items | Not started |
| 5 | AI chatbot (server-side), admission updates | Not started |
| 6 | Admin panel, hardening, deployment | Not started |

**Branches:** `main` auto-deploys to the live site, so Phase 2 work lives only on `phase-2` until it has been
preview-tested and approved.

## Run it locally

Requirements: Python 3.11+, Node 20+, Docker (for PostgreSQL).

```bash
# 1. Database
docker compose up -d db

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env            # edit if needed
python -m scripts.init_db          # creates tables and imports the starter dataset
pytest                             # run the backend tests
uvicorn app.main:app --reload      # http://localhost:8000/docs

# 3. Frontend (new terminal)
cd frontend
npm install
npm test
npm run dev                        # http://localhost:5173
```

Or run database and API together: `docker compose up --build`, then start the frontend as above.

The backend tests use their own in-memory SQLite database, so they never touch your real database.

## The college data: read this

`backend/data/seed/colleges_seed.csv` is a **starter list of 102 real institutions** (IITs, NITs, IIITs, IISc, IISERs,
selected central, state, government and private universities). It was compiled from public knowledge, **not yet checked
against official sources**, so every record is stored and displayed as *Not yet verified*.

- Names, states, cities and websites need confirming on the official sites before records are marked verified.
- Fees, cutoffs, courses and eligibility rules are **not included**. The UI shows "Not verified yet" or
  "Insufficient data" instead of guessing.
- `GET /api/coverage` reports which institution types have no data at all (polytechnics, diploma colleges, science,
  commerce and arts colleges, management and computer-application institutes).
- A record can only be marked `verified` if it has a `last_verified_on` date.

### Importing your own data

Prepare a CSV with these columns and run `python -m scripts.init_db path/to/file.csv` from `backend/`:

- Required: `name, state, city, institution_type, ownership`
- Optional: `short_name, website, admission_url, established_year, aishe_code, entrance_exams, admission_routes,
  description, data_source, data_source_url, verification_status, last_verified_on`
- `entrance_exams` and `admission_routes` take several values separated by `|`.
- `ownership` is `Government`, `Private` or `Public-Private`. `institution_type` must be one of the values in
  `app/services/importer.py`.

The importer rejects bad rows with a reason, reports duplicates, and updates existing colleges instead of duplicating
them. Good official sources for later phases: AISHE (aishe.gov.in), JoSAA (josaa.nic.in), CUET (cuet.nta.nic.in) and
each university's admissions page.

## Phase 2: Admission Predictor and eligibility

The Predictor (`/predictor`) checks a student's marks against each college's **stated eligibility rules**. It shows
eligibility only. It never estimates admission probability, and admission is never guaranteed. Chances based on
cutoffs and ranks come in Phase 3.

### Known limitation: course data is empty

The `courses` table has no rows until you import verified course rules (see below). Until then the finder returns
**Insufficient data** for every college. That is missing data, not a rejection, and it is deliberate: course rules,
minimum percentages and streams are never invented.

### How eligibility is decided

`backend/app/services/eligibility.py` applies these rules to each course, in order:

1. **Level:** 10th maps to Diploma courses, 12th to UG courses, a diploma to Lateral courses. Any other level is *not eligible*.
2. **Stream (12th only):** if the course requires a stream, yours must match.
3. **Diploma branch (Lateral courses with a branch rule):** the branch must be one the course accepts. No branch, or
   branch `Other`, gives *Insufficient data* because we do not guess. A branch that is not accepted is *not eligible*.
4. **Minimum percentage:** no stated minimum gives *Insufficient data*. Below it is *not eligible*. Otherwise *eligible*.

A college shows its best result across its matching courses (eligible, then insufficient data, then not eligible).

### Finder API

`POST /api/finder/recommend`

| Qualification | Required fields |
|---------------|-----------------|
| `10th` | `percentage_10` |
| `12th` | `percentage_10`, `percentage_12`, `stream` (`PCM`, `PCB`, `Commerce`, `Arts`, `Other`) |
| `diploma` | `diploma_percentage` |

Optional for all: `preferred_course` (matches part of the course name), `state`. Optional for `diploma`:
`diploma_branch` (`Computer`, `Mechanical`, `Civil`, `Electrical`, `Electronics`, `Other`). Percentages must be 0 to 100.
Missing or invalid fields return HTTP 422.

```json
{ "qualification": "diploma", "diploma_percentage": 65, "diploma_branch": "Computer", "state": "Karnataka" }
```

The response has `count`, `results` (up to 60 colleges, eligible first) and a `note`. Each result has the college
details, `status` (`eligible`, `not_eligible` or `insufficient_data`), a `reason`, and per-course details including
`admission_route` and `allowed_branches`.

### Importing course rules

Course rules come from official college or exam-authority websites only. Start from the empty template
`backend/data/templates/courses_template.csv`:

```
college_name, city, state, course_name, level, stream_required, allowed_branches, min_percentage,
eligibility_notes, admission_route, source_name, source_url, last_verified_on
```

- `level` is `UG`, `PG`, `Diploma` or `Lateral`. `stream_required` is `PCM`, `PCB`, `Commerce`, `Arts` or `Other`.
- `allowed_branches` is for `Lateral` courses only, separated by `|` (for example `Computer|Electronics`).
- `min_percentage` is 0 to 100. Leave it empty when the college does not state one.
- Every row needs `source_name`, `source_url` (a full http(s) link) and `last_verified_on` (`YYYY-MM-DD`, not in the future).
- The college must already exist (matched on name, city and state). Unknown colleges are rejected, never created.

From `backend/`:

```bash
python -m scripts.import_courses path/to/courses.csv --dry-run   # checks everything, saves nothing
python -m scripts.import_courses path/to/courses.csv             # real import
```

The script prints created, updated, rejected and duplicate counts, with a reason for each rejected row. Re-running
a file updates existing courses instead of duplicating them.

### Database migration for existing databases

`Base.metadata.create_all` creates missing tables but does not alter existing ones. A new database made with
`python -m scripts.init_db` already has every column. A database created earlier (such as the Neon production
database) needs the SQL in `backend/migrations/` run once, in order, for example from the Neon console SQL Editor:

- `001_add_courses_allowed_branches.sql` adds the nullable `courses.allowed_branches` column. It is safe to run twice.

Never put your database URL in the repository. It belongs only in your hosting provider's environment variables.

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/colleges` | Search and filter: `q, state, institution_type, ownership, exam, verified_only, sort, page, page_size` |
| `GET /api/colleges/facets` | Filter options with counts |
| `GET /api/colleges/{slug}` | One college with courses and data source |
| `GET /api/coverage` | What the directory does and does not cover |
| `POST /api/finder/recommend` | Eligibility check from qualification and marks (Phase 2) |
| `GET /api/health` | Health check |

Interactive docs: `http://localhost:8000/docs`.

## Configuration and secrets

Copy `.env.example` to `backend/.env` and `frontend/.env`. Never commit `.env` files or service-account JSON; both are
in `.gitignore`. The AI key (`ANTHROPIC_API_KEY`) is read only by the backend and must never go in frontend code.
Firebase web keys (`VITE_FIREBASE_*`) are public identifiers and are safe in the browser.

## What you will need to provide later

- **Course data (Phase 2):** verified course eligibility rules from official websites, imported with the course importer.
- **Phase 4:** a Firebase project with Google sign-in enabled (web config + service-account file for the backend).
- **Phase 5:** an Anthropic API key for the chatbot.
- **Phase 3:** official JoSAA opening/closing-rank data (download from josaa.nic.in) to import.

## Project layout

```
backend/   FastAPI app (app/), importer and DB scripts (scripts/), SQL migrations (migrations/),
           seed data and CSV templates (data/), tests (tests/)
frontend/  React app (src/pages, src/components, src/lib), Vitest tests next to the code
```
