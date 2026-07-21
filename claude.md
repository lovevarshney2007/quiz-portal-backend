# Essential API Endpoints for Frontend Integration

This document outlines the core API endpoints required to build a fully functional frontend for the Quiz Portal. Advanced or edge-case management endpoints have been omitted to keep integration simple and focused.

**Base URL**: `http://localhost:5000/api/v1`

---

## 1. Authentication
*All protected routes require the `Authorization: Bearer <accessToken>` header. Refresh tokens are handled via HTTP-only cookies.*

### Login
- **Endpoint:** `POST /auth/login`
- **Body:** `{ "email": "admin@akgec.ac.in", "studentNumber": "2500000" }` *(studentNumber is required for students, password/studentNumber might depend on your auth setup).*
- **Returns:** `{ status: "success", data: { user, accessToken } }`

### Logout
- **Endpoint:** `POST /auth/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Returns:** Clears the cookie.

### Refresh Token
- **Endpoint:** `POST /auth/refresh-token`
- **Headers:** Automatically uses the `refreshToken` HTTP-only cookie.
- **Returns:** `{ status: "success", data: { accessToken } }`

---

## 2. Student Portal (Exam Taking Flow)

### List Available Exams
- **Endpoint:** `GET /exams`
- **Returns:** Array of exams published and available to the student.

### Get Exam Details
- **Endpoint:** `GET /exams/:id`
- **Returns:** Details about the exam (duration, instructions, sections) before starting.

### Start Exam Attempt
- **Endpoint:** `POST /attempts/start`
- **Body:** `{ "examId": "<exam_id>" }`
- **Returns:** Starts the timer and returns the first state of the exam, including the `attempt` and `questionMapping` (the randomized order of questions/options for this student).

### Resume Exam (Tab Closed / Refresh)
- **Endpoint:** `GET /attempts/state/:examId`
- **Returns:** The current state of the exam attempt (time spent, visited questions, selected answers) to restore the UI.

### Auto-save Answer
- **Endpoint:** `POST /attempts/save`
- **Description:** Call this continuously/on-change to sync the student's progress to the backend Redis cache.
- **Body:** 
```json
{
  "examId": "<exam_id>",
  "questionId": "<question_id>",
  "status": "Answered", 
  "givenAnswer": ["B"],
  "timeSpent": 15
}
```

### Submit Exam
- **Endpoint:** `POST /attempts/submit`
- **Body:** `{ "examId": "<exam_id>" }`
- **Returns:** Marks the attempt as submitted.

---

## 3. Admin Dashboard (Exam & Question Management)

### Dashboard Stats
- **Endpoint:** `GET /dashboard/admin`
- **Returns:** Overall stats (total students, active exams, total results, etc.) for the admin homepage.

### Create Exam
- **Endpoint:** `POST /exams`
- **Body:** `{ title, description, instructions, duration, startTime, endTime, passingMarks, sections: [{title, order, marks}] }`
- **Returns:** The created exam document (initially in `Draft` state).

### Get Exam Questions
- **Endpoint:** `GET /questions/exam/:examId`
- **Returns:** A list of all questions associated with the given exam.

### Add Question
- **Endpoint:** `POST /questions`
- **Body:** 
```json
{
  "exam": "<exam_id>",
  "section": "<section_id>",
  "type": "Single Correct",
  "questionText": "What is 2+2?",
  "options": [
    { "id": "A", "text": "3" },
    { "id": "B", "text": "4" },
    { "id": "C", "text": "5" }
  ],
  "correctAnswer": ["B"],
  "marks": 4,
  "negativeMarks": 1,
  "order": 1
}
```

### Publish Exam
- **Endpoint:** `PATCH /exams/:id/publish`
- **Returns:** Changes the exam status from Draft to Published, making it visible to students.

### Generate Results
- **Endpoint:** `POST /results/generate`
- **Body:** `{ "examId": "<exam_id>" }`
- **Returns:** Queues a background worker to calculate scores for all submitted attempts.

### Fetch Leaderboard
- **Endpoint:** `GET /leaderboard/:examId`
- **Returns:** An ordered list of student scores and ranks for the specified exam.

---

## 4. Real-Time Tracking (WebSockets)
Connect your frontend to the Socket.IO server at `http://localhost:5000`.

**Events to Emit:**
- `student_online`: `{ "studentId": "..." }`
- `exam_started`: `{ "examId": "...", "studentId": "..." }`

**Events to Listen For (Admin Dashboard):**
- `active_exams_update`
- `suspicious_activity`
