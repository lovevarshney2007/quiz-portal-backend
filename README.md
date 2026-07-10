# AKGEC Quiz Portal Backend

This is the production-ready backend for the JEE-style Online Examination Portal of AKGEC, built with Node.js, Express, and MongoDB. It features Clean Architecture, Role-Based Access Control, robust evaluation mechanics, and auto-submit background cron jobs.

## Tech Stack
- **Node.js & Express.js**
- **MongoDB & Mongoose**
- **JWT (JSON Web Tokens)**
- **Bcrypt** for password hashing
- **Multer & XLSX** for bulk question imports

---

## API Documentation

Below is the detailed API documentation with example JSON requests and responses.

### 1. Authentication

#### Register Student
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/register`
- **Request Body**:
```json
{
  "fullName": "Admin User",
  "studentNumber": "2500000000002",
  "email": "admin2@akgec.ac.in",
  "password": "Password@123",
  "branch": "CSE",
  "section": "A",
  "year": "3"
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "user": {
      "fullName": "Admin User",
      "studentNumber": "2500000000002",
      "email": "admin2@akgec.ac.in",
      "branch": "CSE",
      "section": "A",
      "year": "3",
      "role": "Student",
      "isVerified": false,
      "_id": "6a513666fd332b47ce899e13"
    }
  }
}
```

#### Login
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/login`
- **Request Body**:
```json
{
  "email": "admin2@akgec.ac.in",
  "password": "Password@123"
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### 2. Exams

*(Note: Requires `Admin` or `ExamCoordinator` Role)*

#### Create Exam
- **Method**: `POST`
- **Endpoint**: `/api/v1/exams`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "Mock Test 1",
  "description": "Test for APIs",
  "instructions": "Do your best",
  "startTime": "2026-07-10T18:14:30.557Z",
  "endTime": "2026-07-10T19:14:40.559Z",
  "duration": 60,
  "status": "Published"
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "exam": {
      "title": "Mock Test 1",
      "description": "Test for APIs",
      "duration": 60,
      "totalQuestions": 0,
      "maximumMarks": 0,
      "status": "Published",
      "_id": "6a5136901ec4613e2be051a2"
    }
  }
}
```

---

### 3. Questions

#### Create Question
- **Method**: `POST`
- **Endpoint**: `/api/v1/questions`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "examId": "6a5136901ec4613e2be051a2",
  "type": "SingleCorrect",
  "questionText": "What is 2+2?",
  "options": [
    { "id": "A", "text": "3" },
    { "id": "B", "text": "4" },
    { "id": "C", "text": "5" }
  ],
  "correctAnswers": ["B"],
  "subject": "Math",
  "marks": 4,
  "negativeMarks": -1
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "question": {
      "examId": "6a5136901ec4613e2be051a2",
      "type": "SingleCorrect",
      "questionText": "What is 2+2?",
      "correctAnswers": ["B"],
      "_id": "6a5136901ec4613e2be051a3"
    }
  }
}
```

---

### 4. Exam Session (Attempt)

#### Start Attempt
- **Method**: `POST`
- **Endpoint**: `/api/v1/attempts/start`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "examId": "6a5136901ec4613e2be051a2"
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "attempt": {
      "userId": "6a51368f1ec4613e2be051a1",
      "examId": "6a5136901ec4613e2be051a2",
      "status": "InProgress",
      "_id": "6a5136911ec4613e2be051a4"
    },
    "isResume": false
  }
}
```

#### Auto-Save Answer
- **Method**: `POST`
- **Endpoint**: `/api/v1/attempts/save`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "examId": "6a5136901ec4613e2be051a2",
  "questionId": "6a5136901ec4613e2be051a3",
  "status": "Answered",
  "givenAnswer": ["B"],
  "timeSpent": 10
}
```
- **Response**: `200 OK`
```json
{
  "status": "success",
  "data": {
    "status": {
      "questionId": "6a5136901ec4613e2be051a3",
      "attemptId": "6a5136911ec4613e2be051a4",
      "givenAnswer": ["B"],
      "status": "Answered",
      "timeSpent": 10,
      "visitedCount": 1
    }
  }
}
```

#### Submit Exam
- **Method**: `POST`
- **Endpoint**: `/api/v1/attempts/submit`
- **Request Body**:
```json
{
  "examId": "6a5136901ec4613e2be051a2"
}
```
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

### 5. Results & Leaderboard

#### Generate Result
- **Method**: `POST`
- **Endpoint**: `/api/v1/results/generate`
- **Request Body**:
```json
{
  "attemptId": "6a5136911ec4613e2be051a4"
}
```
- **Response**: `201 Created`
```json
{
  "status": "success",
  "data": {
    "result": {
      "score": 4,
      "totalCorrect": 1,
      "totalWrong": 0,
      "totalSkipped": 0,
      "totalQuestions": 1,
      "accuracy": 100
    }
  }
}
```

#### Get Leaderboard
- **Method**: `GET`
- **Endpoint**: `/api/v1/leaderboard/:examId`
- **Response**: `200 OK`
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "studentName": "Admin User",
        "studentNumber": "2500000000002",
        "branch": "CSE",
        "section": "A",
        "year": "3",
        "score": 4,
        "accuracy": 100,
        "timeTaken": 0
      }
    ]
  }
}
```
