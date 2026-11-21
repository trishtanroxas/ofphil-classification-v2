# OFPHIL V2 Starter Package

**Version:** 2.0.0  
**Target:** `ofphil-classification-v2`  
**Architecture:** Decoupled Next.js Frontend + FastAPI Python 3.12 Backend

---

## Package Contents

```
OFPHIL_V2_STARTER_PACKAGE/
├── frontend/                   # Modern Next.js 15 UI with Tailwind CSS v4 & Lucide React
│   ├── src/                    # Pages, application shell, and API clients
│   ├── public/                 # Icons, branding assets, and static files
│   ├── package.json            # Node.js dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── next.config.js          # Next.js build configuration
│   ├── vercel.json             # Vercel deployment specification
│   └── .env.example            # Frontend environment variables template
│
├── backend_setup/              # Clean backend environment & database configuration
│   ├── requirements.txt        # Streamlined Python 3.12 dependencies (~400 MB vs 7.5 GB)
│   ├── python-version.txt      # Canonical Python runtime specification (3.12.10)
│   ├── DATABASE_SETUP.md       # Comprehensive database connectivity guide
│   └── .env.example            # Safe database connection string template
│
└── README.md                   # This instruction file
```

---

## Quick Setup Instructions

### 1. Extract to V2 Workspace
Extract the contents of this archive directly into the `ofphil-classification-v2` project root:
- Copy `frontend/` into `ofphil-classification-v2/frontend/`
- Copy `backend_setup/requirements.txt` and `backend_setup/.env.example` into `ofphil-classification-v2/backend/`

### 2. Configure Frontend
```bash
cd ofphil-classification-v2/frontend
npm install
cp .env.example .env.local
npm run dev
```
Frontend will be accessible at: `http://localhost:3000`

### 3. Configure Backend
```bash
cd ofphil-classification-v2/backend
# Create virtual environment if not already present:
python -m venv ../venv
# Activate:
..\venv\Scripts\activate       # Windows
# or: source ../venv/bin/activate  # Linux/macOS

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000/docs`
