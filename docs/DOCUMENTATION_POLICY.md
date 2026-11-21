# OFPHIL V2 — Documentation & Anti-Duplication Policy

**Version:** 1.0.0  
**Scope:** Strict guidelines for AI agents, developers, and researchers working on `ofphil-classification-v2`.

---

## 1. Core Rule: Zero-Junk and Zero-Duplication

To prevent repository clutter, file bloat, and redundant markdown documentation:

1. **NO Redundant Markdown Files**: Do not generate new `.md` files for minor tasks, routine updates, or trivial step-by-step progress reports unless explicitly asked by the user with a distinct, non-overlapping purpose.
2. **Consolidate and Update Existing Docs**: Always update an existing documentation file in `docs/` rather than creating a new file with a slightly different name (e.g., update `DATABASE_ARCHITECTURE.md` instead of creating `DATABASE_PLAN_V2.md`).
3. **No Duplicate Root Files**: Do not litter the project root with temporary scratch reports or duplicate markdown summaries. Canonical documentation belongs inside the `docs/` or `security/` directory.
4. **Code over Static Reports**: Prioritize actionable code, automated tests (`pytest`), and verified implementations over long descriptive markdown reports.

---

## 2. Canonical Documentation Inventory

Before creating or editing any documentation, consult the existing approved files:

| Directory | Canonical File | Sole Responsibility |
|---|---|---|
| **Root** | `README.md` | Primary project overview, architecture diagram, and tech stack. |
| **Root** | `RUN.md` | Quick terminal startup guide for Backend and Frontend. |
| **docs/** | `DATABASE_ARCHITECTURE.md` | Supabase PostgreSQL ER diagram, relationships, and RLS overview. |
| **docs/** | `DATABASE_SCHEMA.md` | Master data dictionary and table column specifications. |
| **docs/** | `DATABASE_SETUP.md` | Instructions for running migrations and environment configuration. |
| **docs/** | `DATA_ARCHITECTURE_REPORT.md`| Canonical data folder layout (`data/raw/`, `interim/`, `processed/`, `synthetic/`). |
| **docs/** | `DEPENDENCY_PLAN.md` | Python backend package roadmap and version boundaries. |
| **docs/** | `MODEL_MANIFEST.md` | Pretrained model checkpoints (TrOCR, SBERT, CatBoost, YOLO). |
| **docs/** | `STORAGE_POLICY.md` | Artifact retention, uploads limits, and storage policies. |
| **docs/** | `SETUP_AND_ADAPTATION.md` | Unified primary project design adaptation and environment setup history. |
| **docs/** | `DOCUMENTATION_POLICY.md` | **(This File)** Rules against file bloat and duplication. |
| **security/** | `SECURITY_LAYERS_ARCHITECTURE.md`| 7-layer security blueprint and implementation roadmap. |
| **security/** | `DATA_PROTECTION_POLICY.md` | Philippine Data Privacy Act (RA 10173) and synthetic data mandate. |

---

## 3. Strict Rules for AI Agents

Whenever prompted with a task:
- **Check First**: Inspect existing documentation before generating any new markdown.
- **Merge, Don't Sprawl**: If a prompt mentions creating a report, check if the content naturally belongs in an existing file. If so, append to or update that file.
- **Short, Clean Filenames**: When a new file is strictly required, use short, clear, uppercase names (e.g., `AUDIT_POLICY.md` instead of `OFPHIL_V2_AUDIT_LOGGING_IMPLEMENTATION_SPECIFICATION_REPORT.md`).
- **Never Duplicate Schemas**: Maintain only one source of truth for database schemas, models, and API routes.
