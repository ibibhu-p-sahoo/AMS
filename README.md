# Alumni Management System (AMS)

A three-tier Alumni Management System built per the AMS Tech Stack PRD v1.2.

- **Frontend** — React 18 + TypeScript (Vite), Tailwind CSS, TanStack Query, Recharts
- **Backend** — Django 5 + Django REST Framework, JWT auth, role-based access control
- **Database** — PostgreSQL 16
- **Cache / job broker** — Redis (used by Celery for reminders & the monthly job-intel pulse)
- **Containerised** — Docker Compose runs everything with one command

## Modules implemented

| Module | Status |
|---|---|
| Alumni Directory & Profiles | ✅ |
| Search & Segmentation (filters) | ✅ |
| Student / Talent Profiles | ✅ |
| Company / Employer Directory | ✅ |
| Outreach Templates & Campaigns | ✅ |
| Events & Drives + RSVPs | ✅ |
| Referral / Placement Pipeline (48h SLA) | ✅ |
| Job-Intel / Hiring Pulse | ✅ |
| Task Management | ✅ |
| Dashboards & KPI Analytics | ✅ |
| Roles & Access Control (RBAC) | ✅ |
| Admin Panel & Audit Log | ✅ |
| Bulk CSV import/export (alumni & students) | ✅ |
| Talent Brochure PDF generator | ✅ |
| Outreach: segment → populate → real email send | ✅ |
| Public no-login forms (Hiring Pulse + Event RSVP) | ✅ |

### Newer features — how to use

- **CSV import/export** — On the Alumni and Students pages, use **Export CSV** / **Import CSV**. Import upserts by email (alumni) or name+batch (students); for alumni, the `company` column is matched/created by name. Unknown rows are reported, not silently dropped.
- **Talent Brochure PDF** — On the Students page, the **📄 Brochure** button opens an auto-generated two-page PDF (`GET /api/students/{id}/brochure/`).
- **Outreach loop** — Create a campaign with a segment (branch/city/domain) → **Populate** adds matching active alumni as contacts → **Send** emails them (console backend in dev; SendGrid/SES via `.env` in prod) and marks touches sent.
- **Public forms** (no login) — `http://localhost:5173/forms/pulse` (alumni hiring pulse) and `http://localhost:5173/forms/rsvp` (event RSVP). Responses land straight in the DB. Also linked from the login page.

## Quick start (Docker)

```bash
cp .env.example .env          # adjust secrets if you like
docker compose up --build
```

Then open:

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000/api/
- Django admin → http://localhost:8000/admin/
- API docs (Swagger) → http://localhost:8000/api/docs/

The backend container automatically runs migrations and seeds demo data on first boot.

### Demo logins (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@institute.edu` | `admin12345` |
| Coordinator | `coordinator@institute.edu` | `demo12345` |
| Volunteer | `volunteer@institute.edu` | `demo12345` |

## Local development without Docker

See `backend/README` notes inside the file headers. In short:

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate && python manage.py seed
python manage.py runserver

# frontend
cd frontend && npm install && npm run dev
```

## Security notes (from PRD §10)

- RBAC is enforced on every API endpoint, not just hidden in the UI.
- Alumni records are PII under India's DPDP Act — access is role-gated and key actions are written to the audit log.
- Secrets live in environment variables (`.env`), never in code.
- Google SSO is the production auth target; this MVP ships JWT email/password auth with the role model in place so SSO can be layered on.
