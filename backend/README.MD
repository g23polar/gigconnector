# Band x Venue Matching API (Backend)

## Requirements
- Python 3.11+ recommended
- Docker (for PostGIS)

## Setup
From `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
docker compose up -d

alembic upgrade head
uvicorn app.main:app --reload --port 8000
