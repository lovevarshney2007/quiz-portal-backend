# AKGEC Online Examination Backend

Enterprise-grade online examination backend for Ajay Kumar Garg Engineering College, designed to support 500-600 concurrent students securely with Clean Architecture.

## Features
- **Role-Based Access Control**: Strict Admin and Student roles.
- **Strict Validation**: AKGEC 2nd-year student validations (Student Number `^25\d{5,6}$` and matching email ending in `@akgec.ac.in`).
- **High Performance & Background Processing**: Uses **Redis** for state tracking and **BullMQ** for background result generation.
- **Real-Time Synchronisation**: Uses **Socket.IO** for tracking active exams and student sessions.
- **Strict Security**: XSS protection, HPP (HTTP Parameter Pollution) prevention, Express Rate Limiting, Mongo Sanitize, Helmet, and Google reCAPTCHA v3.

---

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Caching & State**: Redis (via ioredis)
- **Background Jobs**: BullMQ
- **Real-Time Communication**: Socket.io
- **Authentication**: JWT & bcrypt
- **Security**: Helmet, Express Rate Limit, Mongo Sanitize, HPP, XSS-Clean

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
# REDIS_URL=rediss://default:your_password@your_upstash_host:6379 (Optional, use instead of HOST/PORT for cloud Redis)
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

### 4. Production Deployment
For deploying the complete application (Frontend + Backend + DB + Redis) safely for 500+ concurrent students, please strictly follow the official **[Deployment Guide](./deployment.md)** located in the root of the project.

---

## 🧪 Testing the APIs

You can use **Postman**, **Insomnia**, or **cURL** to test the endpoints.
*(Note: If `RECAPTCHA_SECRET_KEY` is not provided in `.env`, the Captcha validation is bypassed automatically for local development).*

### 1. Authentication APIs

#### Login
- **Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Request Body**:
```json
{
  "email": "love2510084@akgec.ac.in",
  "studentNumber": "2510084",
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


#### Logout
- **Method**: `POST`
- **URL**: `/api/v1/auth/logout`
- **Headers**: Authorization `Bearer <accessToken>`
- **Response**: `200 OK`
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```
 
### 1.5. Dashboard APIs

*Require Authorization header: `Bearer <accessToken>`*

#### Admin Dashboard
- **Method**: `GET`
- **URL**: `/api/v1/dashboard/admin`
- **Use Case**: Fetches summary statistics for the admin dashboard.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "totalStudents": 1500,
    "totalExams": 12,
    "activeExams": 2
  }
}
```

#### Student Dashboard
- **Method**: `GET`
- **URL**: `/api/v1/dashboard/student`
- **Use Case**: Fetches summary statistics for the student dashboard.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "upcomingExams": 2,
    "completedExams": 5
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

#### Get All Exams
- **Method**: `GET`
- **URL**: `/api/v1/exams`
- **Use Case**: Fetches a paginated list of exams. Students only see published/started exams. Admins see all exams.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "exams": [
      {
        "_id": "60d0fe4f5311236168a109cb",
        "title": "Data Structures & Algorithms - Mid Term",
        "status": "Published"
      }
    ]
  }
}
```

#### Get Exam Details By ID
- **Method**: `GET`
- **URL**: `/api/v1/exams/:id`
- **Use Case**: Fetches the exam configuration including duration, passing marks, and sections metadata. **Note: This does not return the actual questions.**
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "exam": {
      "_id": "60d0fe4f5311236168a109cb",
      "title": "Data Structures & Algorithms - Mid Term",
      "duration": 90,
      "sections": [
        {
          "title": "Trees",
          "order": 1,
          "marks": 50,
          "_id": "60d0fe4f5311236168a109cc"
        }
      ]
    }
  }
}
```

#### Publish / Start / Complete Exam
- **Method**: `PATCH`
- **URL**: `/api/v1/exams/:id/publish`
- **URL**: `/api/v1/exams/:id/start` (Initializes tracking in Redis)
- **URL**: `/api/v1/exams/:id/complete` (Fires BullMQ worker to generate results)
- **URL**: `/api/v1/exams/:id/pause` (Pauses an ongoing exam)
- **URL**: `/api/v1/exams/:id/resume` (Resumes a paused exam)

#### Update Exam
- **Method**: `PATCH`
- **URL**: `/api/v1/exams/:id`
- **Request Body**: (Same fields as Create Exam, all optional)
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "exam": {
      "title": "Updated Title",
      "status": "Draft"
    }
  }
}
```

#### Delete Exam
- **Method**: `DELETE`
- **URL**: `/api/v1/exams/:id`
- **Response**: `204 No Content`
*(No JSON body returned)*

#### Extend Exam
- **Method**: `PATCH`
- **URL**: `/api/v1/exams/:id/extend`
- **Request Body**:
```json
{
  "extraMinutes": 15
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "exam": {
      "endTime": "2026-08-01T11:45:00Z",
      "duration": 105
    }
  }
}
```

#### Archive Exam
- **Method**: `PATCH`
- **URL**: `/api/v1/exams/:id/archive`
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "exam": {
      "status": "Archived"
    }
  }
}
```

#### Duplicate Exam
- **Method**: `POST`
- **URL**: `/api/v1/exams/:id/duplicate`
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "exam": {
      "title": "Data Structures & Algorithms - Mid Term (Copy)",
      "status": "Draft"
    }
  }
}
```

#### Force Submit Exam (For a specific student)
- **Method**: `POST`
- **URL**: `/api/v1/exams/:id/force-submit/:studentId`
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "attempt": {
      "status": "Submitted"
    }
  }
}
```


---

### 3. Question Management & Import (Admin Only)

#### Get Questions by Exam ID
- **Method**: `GET`
- **URL**: `/api/v1/questions/exam/:examId`
- **Use Case**: Fetches all questions associated with a specific exam. **This should be called after fetching the exam details to load the actual quiz content.** Each question indicates which section it belongs to.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "questions": [
      {
        "_id": "6a5fc5d870bb2564538a11a0",
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
        "marks": 4
      }
    ]
  }
}
```


#### Get Single Question
- **Method**: `GET`
- **URL**: `/api/v1/questions/:id`
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "question": {
      "_id": "6a5fc5d870bb2564538a11a0",
      "questionText": "What is the capital of France?",
      "options": [{"text": "Paris"}, {"text": "London"}],
      "correctAnswer": "Paris",
      "marks": 4
    }
  }
}
```

#### Create Question
- **Method**: `POST`
- **URL**: `/api/v1/questions`
- **Request Body**:
```json
{
  "exam": "60d0fe4f5311236168a109cb",
  "section": "60d0fe4f5311236168a109cc",
  "type": "Single Correct",
  "questionText": "What is the capital of France?",
  "options": [
    { "text": "Paris" },
    { "text": "London" }
  ],
  "correctAnswer": "Paris",
  "marks": 4,
  "negativeMarks": 1,
  "difficulty": "Easy",
  "order": 1
}
```
- **Response**: `201 Created`

#### Update Question
- **Method**: `PATCH`
- **URL**: `/api/v1/questions/:id`
- **Request Body**: (Same fields as Create Question, all optional)
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "question": {
      "_id": "6a5fc5d870bb2564538a11a0",
      "questionText": "Updated Text"
    }
  }
}
```

#### Delete Question
- **Method**: `DELETE`
- **URL**: `/api/v1/questions/:id`
- **Response**: `204 No Content`
*(No JSON body returned)*

#### Duplicate Question
- **Method**: `POST`
- **URL**: `/api/v1/questions/duplicate/:id`
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "question": {
      "_id": "new_question_id",
      "questionText": "What is the capital of France? (Copy)"
    }
  }
}
```

#### Move Question to Another Section
- **Method**: `PATCH`
- **URL**: `/api/v1/questions/move/:id`
- **Request Body**:
```json
{
  "sectionId": "new_section_id_here"
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "question": {
      "_id": "6a5fc5d870bb2564538a11a0",
      "section": "new_section_id_here"
    }
  }
}
```

#### Reorder Questions
- **Method**: `PATCH`
- **URL**: `/api/v1/questions/reorder/batch`
- **Request Body**:
```json
{
  "updates": [
    { "id": "question_id_1", "order": 1 },
    { "id": "question_id_2", "order": 2 }
  ]
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "message": "Questions reordered successfully"
}
```

#### Bulk Delete Questions
- **Method**: `DELETE`
- **URL**: `/api/v1/questions/bulk/batch`
- **Request Body**:
```json
{
  "ids": ["question_id_1", "question_id_2"]
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "message": "2 questions deleted successfully"
}
```

#### Bulk Import Questions

**Architecture Note:** This backend uses a **2-Step "Review and Confirm" Flow** for bulk importing questions. 
1. The frontend uploads the Excel file to `/import-preview`.
2. The frontend displays the parsed JSON to the Admin for review.
3. The frontend sends the approved JSON to `/confirm-import` to save it in the database.

#### Step 1: Preview Bulk Import (Excel)
Upload a `.xlsx` file using `multipart/form-data`.
- **Method**: `POST`
- **URL**: `/api/v1/questions/import-preview`
- **Form-Data**:
  - `file`: `[File]`
  - `examId`: `60d0fe4f5311236168a109cb`
  - `sectionId`: `60d0fe4f5311236168a109cc`
- **Response**: `200 OK` (Returns the parsed JSON array of questions to review).

#### Step 2: Confirm Bulk Import
- **Method**: `POST`
- **URL**: `/api/v1/questions/confirm-import`
- **Request Body**:
```json
{
  "examId": "60d0fe4f5311236168a109cb",
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
      "correctAnswer": "O(log n)",
      "explanation": "",
      "difficulty": "Medium",
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

*Require Authorization header: `Bearer <accessToken>`*

#### Start Exam Attempt
- **Method**: `POST`
- **URL**: `/api/v1/attempts/start`
- **Request Body**:
```json
{
  "examId": "6a5fc5d770bb2564538a119d"
}
```

#### Auto-save Responses
Saves responses directly into Redis caching. Handled via intervals on the frontend.
- **Method**: `POST`
- **URL**: `/api/v1/attempts/save`
- **Request Body**:
```json
{
  "examId": "6a5fc5d770bb2564538a119d",
  "questionId": "6a5fc5d870bb2564538a11a0",
  "status": "Answered",
  "givenAnswer": ["B"],
  "timeSpent": 10
}
```
- **Response**: `200 OK`


#### Get Attempt State
- **Method**: `GET`
- **URL**: `/api/v1/attempts/state/:examId`
- **Use Case**: Fetches the auto-saved state of an ongoing exam for the student. Useful for restoring session after refresh.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "responses": {
      "question_id_1": { "givenAnswer": ["A"], "status": "Answered" }
    },
    "violationCount": 0
  }
}
```

#### Get Attempt Summary
- **Method**: `GET`
- **URL**: `/api/v1/attempts/summary/:examId`
- **Use Case**: Fetches the summary (how many answered, visited, marked for review) for the exam attempt.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "answered": 10,
    "notAnswered": 5,
    "markedForReview": 2,
    "notVisited": 3
  }
}
```

#### Submit Exam
- **Method**: `POST`
- **URL**: `/api/v1/attempts/submit`
- **Request Body**:
```json
{
  "examId": "6a5fc5d770bb2564538a119d"
}
```
- **Response**: `200 OK`

---


---

### 5. Results & Leaderboard

*Require Authorization header: `Bearer <accessToken>`*

#### Generate Results (Admin Only)
- **Method**: `POST`
- **URL**: `/api/v1/results/generate`
- **Request Body**:
```json
{
  "examId": "6a5fc5d770bb2564538a119d"
}
```
- **Use Case**: Pushes a job to the BullMQ queue to calculate results for all students who attempted the exam.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "message": "Result generation job added to queue"
}
```

#### Get Exam Results (Admin/Student)
- **Method**: `GET`
- **URL**: `/api/v1/results/exam/:examId`
- **Use Case**: Fetches the calculated results. Students see only their own result; admins see all results for the exam.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "student": "student_id",
        "score": 45,
        "totalMarks": 50
      }
    ]
  }
}
```

#### Get Leaderboard
- **Method**: `GET`
- **URL**: `/api/v1/leaderboard/:examId`
- **Use Case**: Fetches the top ranking students for a given exam.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "leaderboard": [
      {
        "student": { "name": "Love Varshney" },
        "score": 50,
        "rank": 1
      }
    ]
  }
}
```

---

### 6. Violations (Proctoring)

#### Report Violation (Student)
- **Method**: `POST`
- **URL**: `/api/v1/violations`
- **Request Body**:
```json
{
  "examId": "6a5fc5d770bb2564538a119d",
  "type": "TabSwitch",
  "browser": "Chrome",
  "device": "Desktop"
}
```
- **Use Case**: Sent by the frontend when a proctoring violation occurs (e.g., TabSwitch, FullscreenExit).
- **Response**: `201 Created`

#### Get Exam Violations (Admin Only)
- **Method**: `GET`
- **URL**: `/api/v1/violations/:examId`
- **Use Case**: Fetches all violations recorded for a specific exam to review student integrity.
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "violations": [
      {
        "student": "student_id",
        "type": "TabSwitch",
        "timestamp": "2026-08-01T10:15:00Z"
      }
    ]
  }
}
```

## 🛠 Real-Time Tracking (WebSockets)
Socket.IO runs on the same port (`5000`).
Connect to `http://localhost:5000` from the frontend using the `socket.io-client`.
**Client Emits (to Server):**
- `join_exam`: `{ "examId": "..." }`

**Server Emits (to clients in the exam room):**
- `student_online`: `{ "studentId": "..." }`
- `student_offline`: `{ "studentId": "..." }`
- `exam_paused`: `{ "examId": "..." }`
- `exam_resumed`: `{ "examId": "..." }`
- `exam_completed`: `{ "examId": "..." }`
- `exam_extended`: `{ "examId": "...", "extraMinutes": 10, "newEndTime": "..." }`
- `force_submit`: `{ "studentId": "..." }`

---

## 🔍 Troubleshooting: Why Questions Are Not Fetching / Student Screen Stuck on "Loading..."

If the student screen gets stuck showing **"Loading Question..."** or 0 questions are fetched, check the following 6 common root causes and fixes:

### 1. 🚨 Backend Route Permission Error (HTTP 403 Forbidden) — **[MOST COMMON]**
* **Symptom**: Student logs in, starts exam, but screen shows *"Loading Question..."*. Browser console shows `403 Forbidden` for `GET /api/v1/questions/exam/:examId`.
* **Root Cause**: `GET /api/v1/questions/exam/:examId` in `routes/question.routes.js` was placed below `router.use(authorize(ROLES.ADMIN))`. Since students have role `Student`, backend blocks the request.
* **Fix**: In `routes/question.routes.js`, move `router.get('/exam/:examId')` **above** `router.use(authorize(ROLES.ADMIN))`:
  ```js
  router.use(protect);
  
  // Allowed for all authenticated users (Students & Admins)
  router.get('/exam/:examId', questionController.getExamQuestions);
  router.get('/:id', questionController.getQuestion);
  
  // Admin only routes below
  router.use(authorize(ROLES.ADMIN));
  ```

---

### 2. ⏰ Inactive Exam Status or Time Schedule Mismatch
* **Symptom**: Frontend shows *"Exam is not currently active"* or questions array remains empty.
* **Root Cause**: `startAttempt` (`POST /api/v1/attempts/start`) checks if current time is between `exam.startTime` and `exam.endTime`. If exam status is `Draft` or time window has passed/not started, the session cannot start.
* **Fix**: Update exam status to `Started` or `Published` and ensure `startTime` and `endTime` cover current time:
  ```bash
  # Start the exam via admin endpoint
  PATCH /api/v1/exams/:id/start
  ```

---

### 3. 🗄 Database Seeding / Missing Question Foreign Keys
* **Symptom**: `GET /api/v1/questions/exam/:examId` returns `200 OK` with `{ questions: [] }`.
* **Root Cause**: Questions in MongoDB do not have the `exam` field pointing to the correct `Exam` `_id`, or database hasn't been seeded.
* **Fix**: Ensure question documents have `"exam": "<EXAM_OBJECT_ID>"` and `"section": "<SECTION_OBJECT_ID>"`. Run seed script if needed:
  ```bash
  npm run seed:backend
  ```

---

### 4. 🌐 CORS or Incorrect `API_BASE_URL` Mismatch
* **Symptom**: Frontend console shows `NetworkError` or CORS blocked error.
* **Root Cause**: 
  - Frontend `VITE_API_BASE_URL` in `.env` points to wrong URL or port.
  - Backend `app.js` `allowedOrigins` array does not include the frontend origin (e.g. `http://localhost:5173` or Vercel URL).
* **Fix**: Check `app.js` in backend:
  ```js
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-deployed-frontend.vercel.app'
  ];
  ```

---

### 5. 🔑 Token Expiration / Missing Authorization Header (HTTP 401)
* **Symptom**: API calls return `401 Unauthorized` or redirect to login.
* **Root Cause**: Candidate `gdg_token` in cookies/localStorage is missing or expired.
* **Fix**: Ensure student logs in properly via `/auth/login` to obtain an `accessToken` and that requests send `Authorization: Bearer <accessToken>`.

---

### 6. ⚛️ Frontend Property Mapping Compatibility
* **Symptom**: `activeQ.options.map is not a function` error in React console.
* **Root Cause**: Backend returns `options` as an array `[{ id: "A", text: "..." }]` or object `{ a: "..." }`, but frontend component expects array.
* **Fix**: Safely handle both array and object formats in `QuestionArea.jsx`:
  ```js
  const rawOptions = activeQ.options || {};
  const options = Array.isArray(rawOptions)
    ? rawOptions
    : Object.entries(rawOptions).map(([id, text]) => ({ id, text }));
  ```

