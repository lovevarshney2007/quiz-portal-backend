# AKGEC Online Examination Backend

Enterprise-grade online examination backend for Ajay Kumar Garg Engineering College, designed to support 500-600 concurrent students securely with Clean Architecture.

## Features
- **Role-Based Access Control**: Strict Admin and Student roles.
- **Strict Validation**: AKGEC 2nd-year student validations (Student Number `^25\d{5,6}$` and matching email ending in `@akgec.ac.in`).
- **High Performance & Background Processing**: Uses **Redis** for state tracking and **BullMQ** for background result generation.
- **Real-Time Synchronisation**: Uses **Socket.IO** for tracking active exams and student sessions.
- **Strict Security**: XSS protection, HPP (HTTP Parameter Pollution) prevention, Express Rate Limiting, Mongo Sanitize, Helmet, and Google reCAPTCHA v3.

---

## 🚀 Setup & Installation

### 1. Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://admin:password@localhost:27017/quiz_portal?authSource=admin
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=supersecretaccesskey_change_in_production
JWT_REFRESH_SECRET=supersecretrefreshkey_change_in_production
RECAPTCHA_SECRET_KEY=your_google_recaptcha_secret_key_here
```

### 2. Infrastructure Setup
You need **MongoDB** and **Redis** running. We provide a Docker Compose file for easy setup.
```bash
# Start MongoDB and Redis in the background
docker-compose up -d
```

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```
The server should now be running on `http://localhost:5000`.

---

## 🧪 Testing the APIs

You can use **Postman**, **Insomnia**, or **cURL** to test the endpoints.
*(Note: If `RECAPTCHA_SECRET_KEY` is not provided in `.env`, the Captcha validation is bypassed automatically for local development).*

### 1. Authentication APIs

#### Register a Student
*Constraint: `studentNumber` must start with 25 and have 7-8 digits. `email` must end with `@akgec.ac.in` and contain the student number.*

- **Method**: `POST`
- **URL**: `/api/v1/auth/register`
- **Request Body**:
```json
{
  "role": "Student",
  "name": "Love Varshney",
  "studentNumber": "2510084",
  "email": "love2510084@akgec.ac.in",
  "password": "SecurePassword123!",
  "captchaToken": "mock_token"
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "message": "Registration successful. You can now login."
}
```

#### Login
- **Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Request Body**:
```json
{
  "email": "love2510084@akgec.ac.in",
  "password": "SecurePassword123!",
  "captchaToken": "mock_token"
}
```
- **Response**: `200 OK`
*(Refresh token is attached automatically as a secure HTTP-only Cookie)*
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "60d0fe4f5311236168a109ca",
      "name": "Love Varshney",
      "email": "love2510084@akgec.ac.in",
      "role": "Student",
      "studentNumber": "2510084"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c..."
  }
}
```

#### Refresh Token
- **Method**: `POST`
- **URL**: `/api/v1/auth/refresh-token`
- **Headers**: Cookie `refreshToken` attached.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c..."
  }
}
```

---

### 2. Exam Management (Admin Only)

*Require Authorization header: `Bearer <accessToken>`*

#### Create Exam
- **Method**: `POST`
- **URL**: `/api/v1/exams`
- **Request Body**:
```json
{
  "title": "Data Structures & Algorithms - Mid Term",
  "description": "Comprehensive test on Trees and Graphs.",
  "instructions": "Do not switch tabs. 1 Attempt only.",
  "duration": 90,
  "startTime": "2026-08-01T10:00:00Z",
  "endTime": "2026-08-01T11:30:00Z",
  "totalMarks": 100,
  "passingMarks": 40,
  "sections": [
    {
      "title": "Trees",
      "order": 1,
      "marks": 50
    },
    {
      "title": "Graphs",
      "order": 2,
      "marks": 50
    }
  ]
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "title": "Data Structures & Algorithms - Mid Term",
    "status": "Draft",
    "_id": "60d0fe4f5311236168a109cb",
    "sections": [...]
  }
}
```

#### Publish / Start / Complete Exam
- **Method**: `PATCH`
- **URL**: `/api/v1/exams/:id/publish`
- **URL**: `/api/v1/exams/:id/start` (Initializes tracking in Redis)
- **URL**: `/api/v1/exams/:id/complete` (Fires BullMQ worker to generate results)

---

### 3. Question Import (Admin Only)

#### Preview Bulk Import (Excel)
Upload a `.xlsx` file using `multipart/form-data`.
- **Method**: `POST`
- **URL**: `/api/v1/questions/import-preview`
- **Form-Data**:
  - `file`: `[File]`
  - `examId`: `60d0fe4f5311236168a109cb`
  - `sectionId`: `60d0fe4f5311236168a109cc`
- **Response**: `200 OK` (Returns the parsed JSON array of questions to review).

#### Confirm Bulk Import
- **Method**: `POST`
- **URL**: `/api/v1/questions/confirm-import`
- **Request Body**:
```json
{
  "questions": [
    {
      "exam": "60d0fe4f5311236168a109cb",
      "section": "60d0fe4f5311236168a109cc",
      "type": "Single Correct",
      "questionText": "What is the time complexity of searching in a BST?",
      "options": [
        { "id": "A", "text": "O(1)" },
        { "id": "B", "text": "O(n)" },
        { "id": "C", "text": "O(log n)" },
        { "id": "D", "text": "O(n log n)" }
      ],
      "correctAnswer": "C",
      "marks": 4,
      "order": 1
    }
  ]
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "message": "1 questions imported successfully"
}
```

---

### 4. Student Exam Flow (Student Only)

#### Auto-save Responses
Saves responses directly into Redis caching. Handled via intervals on the frontend.
- **Method**: `POST`
- **URL**: `/api/v1/exams/:id/autosave`
- **Request Body**:
```json
{
  "responses": [
    {
      "questionId": "60d0fe4f5311236168a109cd",
      "markedAnswer": "C",
      "timeTaken": 45
    }
  ],
  "violationCount": 2
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "message": "Response auto-saved"
}
```

---

## 🛠 Real-Time Tracking (WebSockets)
Socket.IO runs on the same port (`5000`).
Connect to `http://localhost:5000` from the frontend using the `socket.io-client`.
**Emittable Events:**
- `student_online`: `{ "studentId": "..." }`
- `exam_started`: `{ "examId": "...", "studentId": "..." }`
