# Quick Start Guide: Running OFPHIL V2

Follow these simple steps to run both the FastAPI Python Backend and the Next.js Frontend locally.

---

## Prerequisites
Make sure you are inside the project root folder:
```text
ofphil-classification-v2
```

---

## 1. Terminal 1 — Start the FastAPI Backend (Port 8000)

Open your first terminal in the root folder and run:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Backend URLs:
- **Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 2. Terminal 2 — Start the Next.js Frontend (Port 3000)

Open a second terminal and navigate to the `frontend` folder:

```powershell
cd frontend
npm run dev
```

### Frontend URL:
- **Web Application Portal**: [http://localhost:3000](http://localhost:3000)

---

## 3. Verification

Once both servers are running, open [http://localhost:3000](http://localhost:3000) in your web browser. 

The top alert banner will display:
> **FastAPI: Connected (Port 8000)** (Green Badge)
