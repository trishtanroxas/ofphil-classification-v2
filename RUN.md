# Quick Start Guide: Running OFPHIL V2

Follow these simple steps to run both the FastAPI Python Backend and the Next.js Frontend locally.

---

## 1. Terminal 1 — Start the FastAPI Backend (Port 8000)

Siguraduhing nasa root folder ka ng project (`ofphil-classification-v2`).

### Option A: Standard Virtual Environment Activation (Recommended)
```powershell
.\venv\Scripts\activate
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Option B: Kung ikaw ay nasa loob ng `backend/` folder
```powershell
cd backend
..\venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Option C: Direct Python Launcher (Gamit ang Python 3.12)
```powershell
py -3.12 -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Backend URLs:
- **API Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 2. Terminal 2 — Start the Next.js Frontend (Port 3000)

Magbukas ng pangalawang terminal at pumunta sa `frontend` folder:

```powershell
cd frontend
npm run dev
```

### Frontend URLs:
- **Local Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Production Live Portal**: [https://ofphil-foundation.vercel.app](https://ofphil-foundation.vercel.app)

---

## 3. Verification

Kapag tumatakbo na ang parehong server, buksan ang [http://localhost:3000](http://localhost:3000) sa iyong web browser.

Makikita mo sa berdeng badge sa itaas:
> **FastAPI: Connected (Port 8000)**
