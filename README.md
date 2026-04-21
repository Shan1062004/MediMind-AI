# 🧠 MediMind AI – Agentic Healthcare Intelligence System

## 🚀 Overview
MediMind AI is an intelligent backend system that combines Large Language Models with structured healthcare data to enable natural language interaction with clinical systems.

It acts as a **Healthcare AI Agent**, capable of understanding user queries and dynamically deciding whether to:
- Query databases
- Retrieve patient records
- Or use LLM reasoning

---

## ✨ Key Features

- 🤖 Agentic AI architecture (LLM + Tool Usage)
- 🏥 Clinic, Doctor, Patient management APIs
- 🧠 Smart intent detection (regex + routing)
- 🔄 Hybrid execution:
  - Structured queries → Database
  - Complex queries → LLM
- 🧾 Patient lookup via:
  - Name, Phone, Email, ID
- ⏱ Session-based conversational memory

---

## 🏗️ Architecture

User Input  
   ↓  
API Layer (Next.js)  
   ↓  
Decision Engine  
   ├── Database (Prisma + PostgreSQL)  
   └── LLM (Anthropic API)  

---

## 📡 API Endpoints

### Clinics
- GET `/api/clinics`
- POST `/api/clinics`

### Doctors
- GET `/api/doctors`
- POST `/api/doctors`

### Patients
- GET `/api/patients`
- POST `/api/patients`

### 🤖 LLM Endpoint
- POST `/api/llm`

---

## 🛠 Tech Stack

- Next.js (Backend APIs)
- Prisma ORM
- PostgreSQL
- Anthropic API (LLM)
- TypeScript

---

## ⚙️ Setup

```bash
git clone https://github.com/yourusername/medimind-ai.git
cd medimind-ai
npm install
