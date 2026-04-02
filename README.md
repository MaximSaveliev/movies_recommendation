# Movies Recommendation

Full-stack movie recommendation app. Browse movies, search by natural language ("French comedy 2024", "similar to Inception"), and get AI-powered recommendations from a locally trained model — no external LLM needed.

**Stack:** FastAPI · PostgreSQL · Redis · Next.js 16 · Sentence Transformers · Kubernetes (GKE) · GCS

---

## How it works

```
User types query → Frontend → POST /api/search → Sentence Transformers model → top N movies from DB
```

1. **Data collection** — movies from 2020–2026 are fetched from [api.imdbapi.dev](https://api.imdbapi.dev) and stored in PostgreSQL
2. **Model training** — embeddings generated using `all-MiniLM-L6-v2` on movie plots, genres, keywords, countries, cast. Saved locally and uploaded to GCS
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
GCS_BUCKET=
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
npm run dev
```

App: `http://localhost:3000`

---

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, sets session cookie |
| `POST` | `/api/auth/logout` | Logout, clears session |
| `GET` | `/api/auth/me` | Get current user |

### Movies

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/movies` | Paginated list |
| `GET` | `/api/movies/{id}` | Single movie details |

### Search

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/search` | Natural language movie search |

```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "French comedy 2024"}'
```

### Bookmarks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bookmarks` | List user bookmarks |
| `POST` | `/api/bookmarks` | Add bookmark |
| `DELETE` | `/api/bookmarks/{id}` | Remove bookmark |

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
│   │   ├── api/          # auth, movies, search, bookmarks
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # auth, imdb, collector, recommender
│   │   ├── config.py
│   │   ├── database.py
│   │   └── redis_client.py
│   ├── scripts/          # collect_and_train, collect_more, retrain
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/app/          # page.tsx, login, register, profile, movies/[id]
│   ├── src/components/   # AISearchBar, MovieCard, Navbar, BookmarkButton, MoodButtons
│   ├── src/lib/api.ts
│   ├── Dockerfile
│   └── package.json
├── k8s/
│   ├── namespace.yaml
│   ├── ingress.yaml
│   ├── backend/          # deployment, service, hpa
│   ├── frontend/         # deployment, service, hpa
│   ├── postgres/         # deployment, service
│   └── redis/            # deployment, service
└── .github/workflows/
    ├── ci.yml            # build + push Docker images
    └── cd.yml            # deploy to GKE (runs after CI)
```

---

## Kubernetes

### Overview

The app runs on **Google Kubernetes Engine (GKE)** in `europe-west1-b`.

```
Internet
  └── GCP L7 Load Balancer  (static IP: 34.111.139.77)
        └── GKE Cluster: movies-cluster
              └── Namespace: movies-recommendation
                    ├── backend   pod(s)   ← FastAPI + ML model
                    ├── frontend  pod(s)   ← Next.js
                    ├── postgres  pod      ← PostgreSQL 16
                    └── redis     pod      ← Redis 7
```

---

### Control Plane

Managed entirely by GKE — you never SSH into it or configure it. It runs:

| Component | Role |
|-----------|------|
| **API Server** | Entry point for all `kubectl` and CD pipeline commands. Validates and stores resource definitions |
| **Scheduler** | Decides which node each pod runs on, based on resource requests and affinity rules |
| **Controller Manager** | Watches all deployments and reconciles reality with the desired state. If a pod dies, it creates a replacement |
| **etcd** | Distributed key-value store holding the full cluster state |

---

### Cluster & Nodes

| Property | Value |
|----------|-------|
| Cluster | `movies-cluster` |
| Zone | `europe-west1-b` |
| Machine type | `e2-standard-2` (2 vCPU / 8 GB RAM) |
| Autoscaler | 1–4 nodes, Balanced policy |
| Allocatable per node | ~1.93 vCPU / ~4.3 GB RAM |

Nodes are GCE VMs. The cluster autoscaler adds a node when pods are pending due to resource pressure, and removes a node when it has been underutilized for 10+ minutes.

---

### Namespace

All resources live in `movies-recommendation`. This isolates them from GKE system pods and any other workloads on the cluster. Every `kubectl` command needs `-n movies-recommendation`.

---

### Pods & Containers

Each deployment manages one or more identical pods. Each pod runs one container.

| Deployment | Container | Replicas |
|------------|-----------|----------|
| `backend` | FastAPI + APScheduler + Sentence Transformers | HPA 1–4 |
| `frontend` | Next.js standalone server | HPA 1–4 |
| `postgres` | PostgreSQL 16 | 1 (fixed) |
| `redis` | Redis 7 | 1 (fixed) |

**Backend pod startup sequence:**
1. Container starts, `startup()` runs
2. Checks if `model.pkl` exists locally → tries to download from GCS (~5s)
3. If GCS has no model (first ever deploy) → trains from all DB movies (~3–5 min)
4. `startupProbe` polls `/health` every 10s, allows up to 30 failures (5 min budget)
5. Once healthy, `livenessProbe` and `readinessProbe` take over normal monitoring

**Pod spreading:** `backend` and `frontend` both have `podAntiAffinity` with `preferredDuringScheduling` on `kubernetes.io/hostname` — the scheduler prefers to place replicas on different nodes.

---

### Services

Services give pods a stable internal DNS name regardless of pod restarts or IP changes.

| Service | DNS name | Port |
|---------|----------|------|
| `backend` | `backend` | 8000 |
| `frontend` | `frontend` | 3000 |
| `postgres` | `postgres` | 5432 |
| `redis` | `redis` | 6379 |

All are `ClusterIP` — reachable only inside the cluster. External traffic enters through the Ingress.

---

### Ingress

A single GCE L7 Load Balancer routes all external traffic:

```
/api/*   → backend:8000   (FastAPI API)
/health  → backend:8000   (health check)
/*       → frontend:3000  (Next.js pages)
```

The static IP `34.111.139.77` is reserved in GCP and attached via the annotation `kubernetes.io/ingress.global-static-ip-name: movies-static-ip`.

---

### Persistent Volumes (PVC)

Stateful services use GCP Persistent Disks provisioned automatically by GKE.

| PVC | Size | Mount path |
|-----|------|------------|
| `postgres-pvc` | 10 Gi | `/var/lib/postgresql/data` |
| `redis-pvc` | 1 Gi | `/data` |

Both are `ReadWriteOnce`. Data survives pod restarts and redeployments. The disk persists until the PVC is explicitly deleted.

---

### Model Storage (GCS)

`model.pkl` (~50 MB) is stored in a GCS bucket so all backend pods can share the same trained model.

```
train() finishes
  └── joblib.dump → /app/model.pkl  (local container)
  └── _upload_to_gcs → gs://movies-model-bucket/model.pkl

Pod starts (any restart or scale-up event)
  └── no local model.pkl
  └── _download_from_gcs → /app/model.pkl  (~5s)
  └── pod ready in seconds, no retraining
```

---

### Horizontal Pod Autoscaler (HPA)

| HPA | Min | Max | Triggers |
|-----|-----|-----|----------|
| `backend-hpa` | 1 | 4 | CPU > 70% or Memory > 80% |
| `frontend-hpa` | 1 | 4 | CPU > 70% |

When load increases, HPA adds pods. If those pods can't be scheduled, the node autoscaler adds a new VM.

---

### CI/CD Pipeline

Every `git push origin master`:

```
CI workflow (ci.yml) — runs immediately on push
  ├── Build backend image → push :sha and :latest to Artifact Registry
  └── Build frontend image → push :sha and :latest to Artifact Registry

CD workflow (cd.yml) — starts only after CI succeeds
  ├── kubectl apply k8s/ manifests   (idempotent — creates missing, updates existing)
  ├── kubectl apply secrets          (DATABASE_URL, GCS_BUCKET_NAME, POSTGRES_PASSWORD)
  ├── kubectl set image backend  → :sha
  ├── kubectl set image frontend → :sha
  └── kubectl rollout status         (waits until pods are healthy)
```

CD uses `workflow_run` trigger so it never starts before CI finishes pushing the images.

---

## First-time GCP Setup

Run once before the first push:

```bash
# Reserve static IP
gcloud compute addresses create movies-static-ip --global

# Create GCS bucket for model
gsutil mb -l europe-west1 gs://movies-model-bucket

# Grant GKE node service account access to the bucket
# Find the SA: GCP Console → IAM → filter "compute"
gsutil iam ch serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com:roles/storage.objectAdmin gs://movies-model-bucket
```

**GitHub repository secrets required:**

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_SA_KEY` | Service account JSON key |
| `GKE_CLUSTER` | `movies-cluster` |
| `GKE_ZONE` | `europe-west1-b` |
| `ARTIFACT_REGISTRY` | `europe-west1-docker.pkg.dev` |
| `POSTGRES_PASSWORD` | DB password |
| `GCS_BUCKET_NAME` | `movies-model-bucket` |

---

## Apply Manifests (manual / first deploy)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

---

## Verify Deployment

```bash
# All pods running
kubectl get pods -n movies-recommendation

# Pods spread across nodes
kubectl get pods -n movies-recommendation -o wide

# HPA status
kubectl get hpa -n movies-recommendation

# Ingress IP
kubectl get ingress -n movies-recommendation

# Backend logs (model loading)
kubectl logs -n movies-recommendation deploy/backend

# Health check
curl http://34.111.139.77/health
```
