# OFPHIL Classification V2: Database Setup & Migration Guide

## 1. Environment Configuration

To connect the application to your new Supabase PostgreSQL database, configure the backend environment file (`backend/.env`):

```env
# Supabase Production PostgreSQL / REST Gateway
SUPABASE_URL=https://wufwgjjralxrkfugxlri.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-secret-key
```

> **Security Note:** Never commit `backend/.env` or `.env` to Git. Keep `SUPABASE_SERVICE_ROLE_KEY` strictly on the backend.

---

## 2. Applying the Initial Schema Migration

The initial V2 schema is version-controlled at:
`backend/app/database/migrations/001_initial_v2_schema.sql`

### How to apply via Supabase Dashboard (Recommended):
1. Navigate to your [Supabase Project Dashboard](https://supabase.com/dashboard/project/wufwgjjralxrkfugxlri).
2. Click on the **SQL Editor** tab in the left navigation sidebar.
3. Open a **New Query**.
4. Copy the entire contents of `backend/app/database/migrations/001_initial_v2_schema.sql` and paste it into the editor.
5. Click **Run** (Ctrl + Enter).
6. Verify in the **Table Editor** that the 7 core domains are created:
   - `patients`
   - `socioeconomic_assessments`
   - `clinical_records`
   - `documents`
   - `eligibility_assessments`
   - `user_profiles`
   - `security_audit_logs`

---

## 3. Verifying Database Connectivity

You can verify connection and schema integrity using pytest:

```powershell
$env:PYTHONPATH="backend"
.\venv\Scripts\pytest backend\tests\test_database.py -v
```

All 3 automated database verification tests check:
1. `test_supabase_client_configuration`: Verifies credentials and URL parsing.
2. `test_supabase_connectivity`: Tests live HTTP round-trip connection to Supabase REST endpoint.
3. `test_sqlalchemy_models_metadata`: Verifies ORM table columns and relationships.

---

## 4. Synthetic Testing Guidelines

When testing database operations:
- Always set `is_synthetic = TRUE` for test patient records.
- Do not import actual hospital or patient records into development branches.
- Use `app.database.repositories.PatientRepository` for type-safe insertion and queries.
