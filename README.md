# Movies Recommendation

Full-stack movie recommendation app. Browse movies, search by natural language ("French comedy 2024", "similar to Inception"), and get AI-powered recommendations from a locally trained model — no external LLM needed.

**Stack:** FastAPI · PostgreSQL · Redis · Next.js 16 · scikit-learn · Kubernetes (GCP/Rancher)

---

## How it works

```
User types query → Frontend → POST /search → TF-IDF model → top N movies from DB
```

1. **Data collection** — movies from 2020–2026 are fetched from [api.imdbapi.dev](https://api.imdbapi.dev) and stored in PostgreSQL
2. **Model training** — a TF-IDF vectorizer is trained on movie plots, genres, keywords, countries, cast. Saved to `model.pkl`
3. **Search** — user query is vectorized and compared to all movies via cosine similarity. Returns top matches
4. **Auth** — sessions stored in Redis with a UUID key. HttpOnly cookie on the client
5. **Cron** — every 24h the app checks for new movies and retrains the model automatically

---

## Prerequisites

- Python 3.12+
- Node.js 22+
- Docker (for PostgreSQL)
- A Redis instance (cloud or local)

---

## Setup

### 1. PostgreSQL (Docker)

```bash
sudo docker run -d \
  --name movies-postgres \
  -e POSTGRES_USER=movies_user \
  -e POSTGRES_PASSWORD=movies_pass \
  -e POSTGRES_DB=movies_db \
  -p 5432:5432 \
  postgres:16-alpine
```

Access the database anytime:
```bash
sudo docker exec -it movies-postgres psql -U movies_user -d movies_db
```

Useful psql commands:
```sql
\dt                                                        -- list tables
SELECT COUNT(*) FROM movies;                               -- total movies
SELECT title, start_year, aggregate_rating FROM movies LIMIT 10;
\q                                                         -- quit
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://movies_user:movies_pass@localhost:5432/movies_db
REDIS_URL=redis://default:<password>@<host>:<port>
SESSION_TTL_SECONDS=604800
IMDB_API_BASE_URL=https://api.imdbapi.dev
MODEL_PATH=model.pkl
```

**Collect movies and train the model** (run once — takes a while):
```bash
python scripts/collect_and_train.py
```

This will:
- Create all database tables automatically
- Fetch all movies 2020–2026 from IMDB API page by page
- Fetch full details for each movie
- Train the TF-IDF recommendation model
- Save `model.pkl` to disk

**Start the API:**
```bash
uvicorn main:app --reload
```

API docs available at: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Start the dev server:**
```bash
npm run dev
```

App available at: `http://localhost:3000`

---

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login, sets session cookie |
| `POST` | `/auth/logout` | Logout, clears session |
| `GET` | `/auth/me` | Get current user |

**Register:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "username": "max", "password": "secret123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

---

### Movies

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/movies` | Paginated list of all movies |
| `GET` | `/movies/{id}` | Single movie details |

**List movies (page 2, 20 per page):**
```bash
curl "http://localhost:8000/movies?page=2&limit=20"
```

**Get a specific movie:**
```bash
curl http://localhost:8000/movies/tt12042730
```

---

### Search

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/search` | Natural language movie search |

**Search examples:**
```bash
# By genre + year + country
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "French comedy 2024"}'

# Find movies similar to another movie
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "similar to Interstellar"}'

# By mood or theme
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "thriller with twist ending"}'
```

Returns an array of up to 20 movies ordered by relevance.

---

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

---

## Project Structure

```
movies_recommendation/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # Auth endpoints
│   │   │   ├── movies.py        # Movies endpoints
│   │   │   └── search.py        # Search endpoint
│   │   ├── models/
│   │   │   ├── user.py          # User DB model
│   │   │   └── movie.py         # Movie DB model
│   │   ├── schemas/
│   │   │   ├── user.py          # Request/response schemas
│   │   │   └── movie.py
│   │   ├── services/
│   │   │   ├── auth.py          # Redis session management
│   │   │   ├── imdb.py          # IMDB API client
│   │   │   ├── collector.py     # Fetch + store movies
│   │   │   └── recommender.py   # TF-IDF model train + inference
│   │   ├── config.py            # Settings from .env
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   └── redis_client.py      # Redis connection
│   ├── scripts/
│   │   └── collect_and_train.py # One-shot data collection + training
│   ├── main.py                  # FastAPI app + cron scheduler
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Home: search bar + movie grid
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── movies/[id]/page.tsx # Movie detail
│   │   ├── components/
│   │   │   ├── AISearchBar.tsx      # Glowing animated search bar
│   │   │   ├── MovieCard.tsx
│   │   │   └── Navbar.tsx
│   │   └── lib/
│   │       ├── api.ts               # Backend API client
│   │       └── utils.ts
│   ├── .env.local
│   ├── Dockerfile
│   └── package.json
└── k8s/
    ├── namespace.yaml
    ├── backend/                 # Deployment + Service
    ├── frontend/                # Deployment + Service
    ├── postgres/                # Deployment + Service + PVC + Secrets
    └── redis/                   # Deployment + Service + PVC
```

---

## Kubernetes Deployment (GCP / Rancher)

**1. Build and push Docker images:**
```bash
# Backend
docker build -t gcr.io/YOUR_PROJECT_ID/movies-backend:latest ./backend
docker push gcr.io/YOUR_PROJECT_ID/movies-backend:latest

# Frontend
docker build -t gcr.io/YOUR_PROJECT_ID/movies-frontend:latest ./frontend
docker push gcr.io/YOUR_PROJECT_ID/movies-frontend:latest
```

**2. Update secrets** in `k8s/postgres/deployment.yaml` and `k8s/backend/deployment.yaml` with your real passwords.

**3. Apply manifests:**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
```

**4. Run data collection inside the cluster:**
```bash
kubectl exec -n movies-recommendation deploy/backend -- \
  python scripts/collect_and_train.py
```

**5. Get the frontend external IP:**
```bash
kubectl get svc frontend -n movies-recommendation
```

---

## After Development: Freeze Dependencies

```bash
# Backend — after all packages are working
cd backend && source .venv/bin/activate
pip freeze > requirements.txt

# Frontend — package-lock.json is already generated by npm install
```
