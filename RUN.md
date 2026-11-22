# Quick Start Guide: Running OFPHIL V2

Follow these practical steps to run the FastAPI backend, launch JupyterLab experiments, execute environment verification, or start the Next.js frontend.

---

## 1. Python Environment & Verification

### Activate Virtual Environment (`venv312`)
From the project root (`ofphil-classification-v2`):

```powershell
.\venv312\Scripts\Activate.ps1
```

### Run Full Hardware & Diagnostic Verification
Verify GPU availability, PyTorch CUDA tensor computation, PaddlePaddle GPU detection, ML boosting engines, OCR pipelines, and FastAPI dependencies:

```powershell
.\venv312\Scripts\python.exe docs\environment-audit\verify_environment.py
```

---

## 2. Terminal 1 — Start the FastAPI Backend (Port 8000)

Ensure you are in the project root (`ofphil-classification-v2`):

### Option A: Using the Activated `venv312` (Recommended)
```powershell
.\venv312\Scripts\Activate.ps1
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Option B: Direct Python Execution
```powershell
.\venv312\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Backend URLs:
- **API Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 3. JupyterLab & Notebook Experimentation

Launch JupyterLab from the project root using the V2 environment:

```powershell
.\venv312\Scripts\python.exe -m jupyterlab
```

### Kernel Selection:
When opening any of the 41 research notebooks in `experiments/notebooks/`, select the registered kernel:
> **Python 3.12 (OFPHIL V2)** (`ofphil-v2`)

---

## 4. Terminal 2 — Start the Next.js Frontend (Port 3000)

Open a second terminal window and navigate to `frontend`:

```powershell
cd frontend
npm run dev
```

### Frontend URLs:
- **Local Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Production Live Portal**: [https://ofphil-foundation.vercel.app](https://ofphil-foundation.vercel.app)

---

## 5. System Verification

When both servers are active, visit [http://localhost:3000](http://localhost:3000). The top status badge will indicate:
> **FastAPI: Connected (Port 8000)**
