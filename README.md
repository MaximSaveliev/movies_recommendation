# Movies Recommendation

Full-stack movie recommendation app. Browse movies, search by natural language ("French comedy 2024", "similar to Inception"), and get AI-powered recommendations from a locally trained model — no external LLM needed.

**Stack:** FastAPI · PostgreSQL · Redis · Next.js 16 · Sentence Transformers · Kubernetes (GKE)

---

## How it works

```
User types query → Frontend → POST /search → Sentence Transformers model → top N movies from DB
```

1. **Data collection** — movies from 2020–2026 are fetched from [api.imdbapi.dev](https://api.imdbapi.dev) and stored in PostgreSQL
2. **Model training** — embeddings are generated using `all-MiniLM-L6-v2` (Sentence Transformers) on movie plots, genres, keywords, countries, cast. Saved to `model.pkl`
3. **Search** — user query is embedded and compared to all movies via cosine similarity. Returns top matches
4. **Auth** — sessions stored in Redis with a UUID key. HttpOnly cookie on the client
5. **Cron** — every 24h the app checks for new movies and retrains the model automatically

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 22+
- Docker

### 1. PostgreSQL (Docker)

```bash
docker run -d \
  --name movies-postgres \
  -e POSTGRES_USER=movies_user \
  -e POSTGRES_PASSWORD=movies_pass \
  -e POSTGRES_DB=movies_db \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Redis (Docker)

```bash
docker run -d \
  --name movies-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 3. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://movies_user:movies_pass@localhost:5432/movies_db
REDIS_URL=redis://localhost:6379
SESSION_TTL_SECONDS=604800
IMDB_API_BASE_URL=https://api.imdbapi.dev
MODEL_PATH=model.pkl
```

**Collect movies and train the model** (run once — takes a while):
```bash
python scripts/collect_and_train.py
```

**Start the API:**
```bash
uvicorn main:app --reload
```

API docs: `http://localhost:8000/docs`

### 4. Frontend

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

App: `http://localhost:3000`

---

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login, sets session cookie |
| `POST` | `/auth/logout` | Logout, clears session |
| `GET` | `/auth/me` | Get current user |

### Movies

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/movies` | Paginated list |
| `GET` | `/movies/{id}` | Single movie details |

### Search

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/search` | Natural language movie search |

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "French comedy 2024"}'
```

### Bookmarks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/bookmarks` | List user bookmarks |
| `POST` | `/bookmarks` | Add bookmark |
| `DELETE` | `/bookmarks/{id}` | Remove bookmark |

### Health

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
│   │   │   ├── search.py        # Search endpoint
│   │   │   └── bookmarks.py     # Bookmarks endpoints
│   │   ├── models/
│   │   │   ├── user.py          # User DB model
│   │   │   ├── movie.py         # Movie DB model
│   │   │   └── bookmark.py      # Bookmark DB model
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── movie.py
│   │   │   └── bookmark.py
│   │   ├── services/
│   │   │   ├── auth.py          # Redis session management
│   │   │   ├── imdb.py          # IMDB API client
│   │   │   ├── collector.py     # Fetch + store movies
│   │   │   └── recommender.py   # Embeddings train + inference
│   │   ├── config.py            # Settings from .env
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   └── redis_client.py      # Redis connection
│   ├── scripts/
│   │   ├── collect_and_train.py # One-shot data collection + training
│   │   ├── collect_more.py      # Fetch additional movies
│   │   └── retrain.py           # Retrain model from existing DB
│   ├── main.py                  # FastAPI app + cron scheduler
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Home: search bar + movie grid
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── movies/[id]/page.tsx # Movie detail
│   │   ├── components/
│   │   │   ├── AISearchBar.tsx      # Glowing animated search bar
│   │   │   ├── MovieCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── BookmarkButton.tsx
│   │   │   └── MoodButtons.tsx
│   │   └── lib/
│   │       ├── api.ts               # Backend API client
│   │       └── utils.ts
│   ├── Dockerfile
│   └── package.json
├── k8s/
│   ├── namespace.yaml
│   ├── ingress.yaml             # GCE Ingress with static IP
│   ├── backend/                 # Deployment + Service + HPA
│   ├── frontend/                # Deployment + Service + HPA
│   ├── postgres/                # Deployment + Service + PVC
│   └── redis/                   # Deployment + Service + PVC
└── .github/
    └── workflows/
        ├── ci.yml               # Build + push Docker images
        └── cd.yml               # Deploy to GKE
```

---

## Deployment (GCP + GKE)

Deployment is fully automated via GitHub Actions.

### Architecture

```
Internet → GCP Load Balancer (static IP)
               ↓
         GKE Cluster (europe-west1-b)
         └── Namespace: movies-recommendation
               ├── Frontend (Next.js, HPA 1-4 pods)
               ├── Backend  (FastAPI, HPA 1-4 pods)
               ├── PostgreSQL (1 pod + 10Gi PVC)
               └── Redis      (1 pod + 1Gi PVC)
```

### CI/CD

Every `git push origin master`:
1. GitHub Actions builds Docker images for backend and frontend
2. Images are pushed to GCP Artifact Registry
3. GKE deployments are updated with the new images
4. Rollout completes automatically

### First-time setup

See the deployment guide for one-time GCP infrastructure setup (project, cluster, static IP, service accounts, GitHub secrets).

### Apply Kubernetes manifests (once)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/secret.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/backend/secret.yaml
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

### Verify deployment

```bash
# Check pods
kubectl get pods -n movies-recommendation

# Check ingress IP
kubectl get ingress -n movies-recommendation

# Health check
curl http://STATIC_IP/health
```
