# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Task Manager web app: Flask REST API backend + static HTML/JS frontend, containerized with Docker Compose.

## Commands

```bash
# Run backend locally
cd backend && pip install -r requirements.txt && python app.py  # serves on :5000

# Run frontend locally
cd frontend && python -m http.server 8080  # serves on :8080

# Run with Docker
docker compose up --build  # backend :5000, frontend :8080

# Run all backend tests
cd backend && pytest -q

# Run a single test file or test
cd backend && pytest tests/test_routes.py
cd backend && pytest tests/test_routes.py::test_create_task -v
```

## Architecture

- **backend/app.py** — Flask app factory and DB config. Builds the DB URI from env vars (`SQLALCHEMY_DATABASE_URI`, `DATABASE_URL`, or individual `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`), falling back to local SQLite.
- **backend/routes.py** — All API endpoints registered as a single Blueprint (`api`). Task statuses are `pending`, `in_progress`, `done` (validated via `VALID_STATUSES` set).
- **backend/models.py** — Single `Task` model (SQLAlchemy) with `to_dict()` serialization.
- **backend/database.py** — Shared `db = SQLAlchemy()` instance, imported by models and routes.
- **frontend/** — Vanilla HTML/CSS/JS. `index.html`/`app.js` for the board view, `edit.html`/`edit.js` for editing. Calls backend API directly.

## Testing

Tests use an in-memory SQLite database configured in `backend/tests/conftest.py`. The `app` and `client` fixtures create a fresh DB per test. All tests run from the `backend/` directory.

## Notes

- API error messages and status labels are in Portuguese (pt-BR).
- No auth/login — all endpoints are open.
- Frontend is served as static files (no build step).
