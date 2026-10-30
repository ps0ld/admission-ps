# Admission PS

AI-powered all-India college discovery and admission guidance platform.

**Stack:** React + TypeScript + Vite + Tailwind CSS 4 · FastAPI · PostgreSQL · SQLAlchemy · Pandas · Recharts · Pytest + Vitest

## Build status

The project is being built in phases. Only Phase 1 exists so far.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Project setup, database schema, college directory API, importer, premium UI (home, explore, college page, compare) | Code written. **Not yet run or tested**: see below |
| 2 | Qualification-based college finder and eligibility logic | Not started |
| 3 | JEE Main and JEE Advanced predictors on JoSAA data | Not started |
| 4 | Google login (Firebase), student dashboard, saved items | Not started |
| 5 | AI chatbot (server-side), admission updates | Not started |
| 6 | Admin panel, hardening, deployment | Not started |

**Why Phase 1 is untested:** the environment this was written in could not reach the pip and npm registries (DNS
failure), so dependencies were never installed. What *was* checked: every backend file compiles, every frontend file
parses, and the bundled dataset passes the importer's validation rules. The pytest and Vitest suites are written but
have not been executed. Run them first (steps below) and fix anything they report.

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

## API (Phase 1)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/colleges` | Search and filter: `q, state, institution_type, ownership, exam, verified_only, sort, page, page_size` |
| `GET /api/colleges/facets` | Filter options with counts |
| `GET /api/colleges/{slug}` | One college with courses and data source |
| `GET /api/coverage` | What the directory does and does not cover |
| `GET /api/health` | Health check |

Interactive docs: `http://localhost:8000/docs`.

## Configuration and secrets

Copy `.env.example` to `backend/.env` and `frontend/.env`. Never commit `.env` files or service-account JSON; both are
in `.gitignore`. The AI key (`ANTHROPIC_API_KEY`) is read only by the backend and must never go in frontend code.
Firebase web keys (`VITE_FIREBASE_*`) are public identifiers and are safe in the browser.

## What you will need to provide later

- **Phase 4:** a Firebase project with Google sign-in enabled (web config + service-account file for the backend).
- **Phase 5:** an Anthropic API key for the chatbot.
- **Phase 3:** official JoSAA opening/closing-rank data (download from josaa.nic.in) to import.
- **Deployment:** accounts on your chosen hosts. Deployment config will be added in Phase 6.

## Project layout

```
backend/   FastAPI app (app/), importer and DB scripts (scripts/), seed data (data/), tests (tests/)
frontend/  React app (src/pages, src/components, src/lib), Vitest tests next to the code
```
