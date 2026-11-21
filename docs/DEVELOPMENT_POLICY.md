# OFPHIL V2 — General Development & Anti-Duplication Policy

**Version:** 2.0.0  
**Scope:** Universal engineering, scratch-space management, and anti-duplication policy for all AI agents, engineers, and researchers working on `ofphil-classification-v2`.

---

## 1. Scratch & Temporary Files Policy (`backend/scratch/`)

Whenever an AI agent or developer needs to write one-off test scripts, exploratory snippets, sandbox API callers, or temporary data processors:

1. **Designated Location**: All scratch code **MUST** be placed strictly inside:
   ```text
   backend/scratch/
   ```
2. **Never in Root or App Directories**: Never place disposable test scripts directly in the project root (`./`) or inside production directories (`backend/app/` or `frontend/src/`).
3. **Excluded from Git**: The contents of `backend/scratch/` are excluded by `.gitignore` (except the `.gitkeep` file). This guarantees temporary scripts never dirty production commits or trigger accidental CI/CD deployments.
4. **No Sensitive Credentials in Scratch**: Never hardcode API keys, passwords, or patient records into scratch scripts. Always read from `.env` via `pydantic-settings` or `dotenv`.

---

## 2. Core Rule: Zero-Junk and Zero-Duplication

To prevent repository clutter, file bloat, and redundant markdown documentation:

1. **NO Redundant Markdown Files**: Do not generate new `.md` files for minor tasks, routine updates, or trivial step-by-step progress reports.
2. **Consolidate and Update Existing Docs**: Always update an existing documentation file in `docs/` rather than creating a new file with a slightly different name (e.g., update `DATABASE_ARCHITECTURE.md` instead of creating `DATABASE_PLAN_V2.md`).
3. **No Duplicate Root Files**: Do not litter the project root with temporary scratch reports or duplicate markdown summaries. Canonical documentation belongs inside `docs/` or `security/`.
4. **Code over Static Reports**: Prioritize actionable code, automated tests (`pytest`), and verified implementations over long descriptive markdown reports.

---

## 3. Canonical Documentation Inventory

Before creating or editing any documentation, consult the existing approved files:

| Directory | Canonical File | Sole Responsibility |
|---|---|---|
| **Root** | `README.md` | Primary project overview, architecture diagram, and tech stack. |
| **Root** | `RUN.md` | Quick terminal startup guide for Backend and Frontend. |
| **docs/** | `DEVELOPMENT_POLICY.md` | **(This File)** Universal rules on scratch spaces, zero-junk, and anti-duplication. |
| **docs/** | `DATABASE_ARCHITECTURE.md` | Supabase PostgreSQL ER diagram, relationships, and RLS overview. |
| **docs/** | `DATABASE_SCHEMA.md` | Master data dictionary and table column specifications. |
| **docs/** | `DATABASE_SETUP.md` | Instructions for running migrations and environment configuration. |
| **docs/** | `DATA_ARCHITECTURE_REPORT.md`| Canonical data folder layout (`data/raw/`, `interim/`, `processed/`, `synthetic/`). |
| **docs/** | `DEPENDENCY_PLAN.md` | Python backend package roadmap and version boundaries. |
| **docs/** | `MODEL_MANIFEST.md` | Pretrained model checkpoints (TrOCR, SBERT, CatBoost, YOLO). |
| **docs/** | `STORAGE_POLICY.md` | Artifact retention, uploads limits, and storage policies. |
| **docs/** | `SETUP_AND_ADAPTATION.md` | Unified primary project design adaptation and environment setup history. |
| **security/** | `SECURITY_LAYERS_ARCHITECTURE.md`| 7-layer security blueprint and implementation roadmap. |
| **security/** | `DATA_PROTECTION_POLICY.md` | Philippine Data Privacy Act (RA 10173) and synthetic data mandate. |

---

## 4. Strict Execution Mandates for AI Agents

Whenever prompted with a task:
- **Scratch Scripts**: Always place temporary analysis or test scripts in `backend/scratch/`.
- **Check Existing Files First**: Inspect existing documentation before generating any new markdown.
- **Merge, Don't Sprawl**: If a prompt mentions creating a report, check if the content naturally belongs in an existing file. If so, append to or update that file.
- **Short, Clean Filenames**: When a new file is strictly required, use short, clear, uppercase names.
- **Never Duplicate Schemas**: Maintain only one source of truth for database schemas, models, and API routes.
