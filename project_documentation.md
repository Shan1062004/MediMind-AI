# 📘 Project Documentation

## 🚀 Overview
This is a **Next.js backend application** that provides:
- APIs for managing **clinics, doctors, and patients**
- A **conversational LLM endpoint** for chat and simple database queries

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file:
```env
DATABASE_URL=your_postgres_connection_string
ANTHROPIC_API_KEY=your_api_key
```

### 3. Run the development server
```bash
npm run dev
```

---

## 🔑 Environment Variables

| Variable            | Description                                  |
|--------------------|----------------------------------------------|
| DATABASE_URL       | PostgreSQL connection string (Prisma uses it)|
| ANTHROPIC_API_KEY  | Required for LLM/chat functionality           |

---

## 📡 API Endpoints

### 🏥 Clinics

#### GET `/api/clinics`
- Returns all clinics

#### POST `/api/clinics`
- Create a clinic  
- Request body:
```json
{
  "name": "Clinic A",
  "address": "Address here"
}
```

---

### 👨‍⚕️ Doctors

#### GET `/api/doctors`
- Returns all doctors

#### POST `/api/doctors`
- Create a doctor  
- Request body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "age": 40,
  "specialty": "Cardiology",
  "phone": "1234567890",
  "email": "john@example.com",
  "clinicId": "optional"
}
```

- Notes:
  - If `clinicId` is not provided:
    - Assigns the first available clinic
    - Returns error if no clinic exists

---

### 🏥➡️👨‍⚕️ Clinic Doctors

#### GET `/api/clinics/:id/doctors`
- Get doctors for a specific clinic

#### POST `/api/clinics/:id/doctors`
- Create a doctor under a specific clinic  
- Same body as doctor creation

---

### 🧑‍🤝‍🧑 Patients

#### GET `/api/patients`
- Returns all patients (includes doctor info)

#### POST `/api/patients`
- Create a patient  
- Request body:
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "1234567890",
  "email": "jane@example.com",
  "appointmentDate": "2026-01-01",
  "doctorId": "doctor_id"
}
```

---

### 🤖 LLM Endpoint

#### POST `/api/llm`
- Conversational endpoint with:
  - LLM (Anthropic) integration
  - Local database query shortcuts

#### Request body:
```json
{
  "input": "your question",
  "messages": [],
  "action": "optional",
  "sessionId": "optional",
  "patientId": "optional"
}
```

#### Features:
- Supports chat sessions (`start`, `end`)
- Detects queries like:
  - "list all patients"
  - "list all doctors"
- Fetches patient details using:
  - ID, name, phone, or email
- Falls back to LLM if no local match

---

## 🗄️ Database

- Uses **Prisma ORM**
- Config located at:
  - `src/lib/prisma.ts`
- Schema:
  - `prisma/schema.prisma`

---

## ⚙️ How It Works

1. Request hits `/api/*`
2. Next.js routes to the correct handler
3. Handler:
   - Queries database via Prisma OR
   - Calls LLM API if needed
4. Returns JSON response

---

## ⚠️ Error Handling

- Errors return:
```json
{ "error": "message" }
```
- Status codes:
  - `500` → server errors
  - `400` → bad request (e.g., missing clinic)

---

## 🧠 Notes for Developers

- LLM route uses regex-based query detection
- Session storage:
  - In-memory (expires in 10 minutes)
  - Not suitable for production scaling
- Requires `ANTHROPIC_API_KEY` for full functionality

---

## 📌 Suggested Improvements

- Add Swagger / OpenAPI docs
- Add automated tests
- Replace in-memory sessions with Redis
- Improve validation and error handling
