**Project Overview**
- **Purpose:** A small Next.js app providing clinic/doctor/patient management APIs plus an LLM proxy endpoint for conversational queries and simple data lookups.
- **Code layout:** API routes live under [src/app/api](src/app/api#L1-L1). Prisma is configured at [src/lib/prisma.ts](src/lib/prisma.ts#L1-L20).

**Quick Start**
- **Install:** `npm install`
- **Env:** set `DATABASE_URL` and `ANTHROPIC_API_KEY` in `.env`.
- **Run dev:** `npm run dev`

**Environment Variables**
- **DATABASE_URL:** Postgres connection string used by Prisma (see [src/lib/prisma.ts](src/lib/prisma.ts#L1-L20)).
- **ANTHROPIC_API_KEY:** API key used by the LLM proxy at [src/app/api/llm/route.ts](src/app/api/llm/route.ts#L1-L400).

**API Endpoints**

- **Clinics**
  - **GET** `/api/clinics` — List clinics.
    - Handler: [src/app/api/clinics/route.ts](src/app/api/clinics/route.ts#L1-L60)
    - DB: `prisma.clinic.findMany()`
    - Response: JSON array of clinic records. Errors return `{ error }` with 500 status.
  - **POST** `/api/clinics` — Create clinic.
    - Body: `{ name, address }`
    - Handler: [src/app/api/clinics/route.ts](src/app/api/clinics/route.ts#L1-L400)
    - DB: `prisma.clinic.create({ data })`

- **Doctors**
  - **GET** `/api/doctors` — List all doctors.
    - Handler: [src/app/api/doctors/route.ts](src/app/api/doctors/route.ts#L1-L60)
    - DB: `prisma.doctor.findMany()`
    - Response: JSON array of doctor records.
  - **POST** `/api/doctors` — Create a doctor (may auto-assign a clinic).
    - Body: `{ firstName, lastName, age, specialty, phone, email, clinicId? }`
    - Behavior: If `clinicId` not provided, the code finds the first clinic; if none, returns 400 with an error message.
    - DB: `prisma.doctor.create({ data })`

- **Clinic Doctors (nested)**
  - **GET** `/api/clinics/:id/doctors` — List doctors for a clinic.
    - Handler: [src/app/api/clinics/[id]/doctors/route.ts](src/app/api/clinics/%5Bid%5D/doctors/route.ts#L1-L60)
    - DB: `prisma.doctor.findMany({ where: { clinicId: id } })`
  - **POST** `/api/clinics/:id/doctors` — Create doctor scoped to clinic `:id`.
    - Body: same as `/api/doctors` POST (clinicId is taken from `:id`).

- **Patients**
  - **GET** `/api/patients` — List patients with associated `doctor` included.
    - Handler: [src/app/api/patients/route.ts](src/app/api/patients/route.ts#L1-L60)
    - DB: `prisma.patient.findMany({ include: { doctor: true } })`
  - **POST** `/api/patients` — Create patient and set `appointmentDate`.
    - Body: `{ firstName, lastName, phone, email, appointmentDate, doctorId }`
    - DB: `prisma.patient.create({ data })`

- **LLM / Conversational Proxy**
  - **POST** `/api/llm` — Main conversational endpoint that also supports simple local-data queries and session actions.
    - Handler: [src/app/api/llm/route.ts](src/app/api/llm/route.ts#L1-L400)
    - Purpose: Acts as a proxy to Anthropic (Claude) while providing shortcuts to return local DB data for simple queries (list patients/doctors, fetch patient record fields) and to manage short-lived sessions.
    - Supported body fields: `{ input?, messages?, action?, sessionId?, patientId? }`
    - Special `action` values:
      - `start` — creates an in-memory session and returns `{ sessionId, expiresAt }`.
      - `end` — deletes the session when `sessionId` provided.
    - Local-query shortcuts (no external LLM call):
      - `list all patients` or similar matched text triggers a DB call to `prisma.patient.findMany()` and returns a textual list.
      - `list all doctors` triggers `prisma.doctor.findMany()`.
      - Patient-specific queries: the route detects short patient codes (e.g., `001`) or a provided `patientId` and will attempt to fetch a patient via `prisma.patient.findUnique()` or `prisma.patient.findFirst()` (matching phone/email/name). It then returns requested fields (name, age, disease, prescription, doctor, appointment, notes, conversation, or a conversation summary) in plain text and appends a note that the answer is based on local DB records.
    - Fallback behavior: if no local shortcut matches, the handler forwards the conversation to Anthropic (`https://api.anthropic.com/v1/messages`) with a `systemPrompt` and returns the assistant text. Session-aware requests can increase `max_tokens` for the Anthropic call when a session is active.
    - In-memory session store: `sessionStore: Map<string, { expires, messages }>` with 10-minute TTL; `cleanupExpiredSessions()` runs on each request.

**Database access**
- Prisma client singleton is exported from [src/lib/prisma.ts](src/lib/prisma.ts#L1-L40). The code uses a global cached instance in development to avoid multiple clients.
- Models are defined in [prisma/schema.prisma](prisma/schema.prisma#L1-L400) (refer to that file for field names and relations).

**Execution Flow (high-level)**
- App startup: Next.js server starts, `src/lib/prisma.ts` lazily constructs a PrismaClient (singleton). Routes are available under `/api/*` mappings established by Next.js app router file placement.
- Incoming HTTP request to an API route:
  - Next.js maps path → file under `src/app/api` and calls the exported handler (e.g., `GET`, `POST`).
  - Handler code may call `prisma` to query or mutate DB.
  - For `/api/llm` POST: handler first tries local heuristics (regex checks) to answer from DB without calling external LLM; if not matched, it constructs a request to Anthropic and forwards the result.

**Error handling**
- Most route handlers return JSON. On unexpected errors they respond with `{ error: String(err) }` and a 500 status.
- `/api/doctors` POST returns a 400 when no clinic is found and `clinicId` is not provided.

**Files of interest**
- API handlers: [src/app/api/clinics/route.ts](src/app/api/clinics/route.ts#L1-L200), [src/app/api/doctors/route.ts](src/app/api/doctors/route.ts#L1-L200), [src/app/api/patients/route.ts](src/app/api/patients/route.ts#L1-L200), [src/app/api/clinics/[id]/doctors/route.ts](src/app/api/clinics/%5Bid%5D/doctors/route.ts#L1-L200), [src/app/api/llm/route.ts](src/app/api/llm/route.ts#L1-L400).
- Prisma config: [src/lib/prisma.ts](src/lib/prisma.ts#L1-L40).
- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma#L1-L400).

**Handover notes / What to watch for**
- The LLM proxy contains heuristics and regex-based logic to detect data lookup requests. Review tests before changing these regexes as behavior is user-facing.
- The in-memory `sessionStore` is ephemeral and exists only in the running Node process; it will be lost on process restart and is not suitable for multi-instance deployments.
- `ANTHROPIC_API_KEY` is required for production LLM use; without it the `/api/llm` local shortcuts still work for many queries.
- Prisma uses `@prisma/adapter-pg`; ensure `DATABASE_URL` points to a compatible Postgres instance and migrations are applied (`npx prisma migrate deploy` or `prisma migrate dev` during development).

**Next steps (recommended for the new maintainer)**
- Add OpenAPI / Swagger or a short Postman collection for the endpoints.
- Add automated tests for `/api/llm` heuristics and for critical DB operations.
- Replace the in-memory `sessionStore` with Redis (or annotate that it is only for dev/demo use) before scaling.

If you want, I can open a PR that adds this file, generates a small Postman collection, and adds basic tests for the API endpoints.
