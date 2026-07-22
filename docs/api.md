# API Documentation

## Base URL
`/api/v1`

## Authentication
- **POST** `/auth/register`: Register a new student
- **POST** `/auth/login`: Login user (Returns JWT & Refresh Token)

## Exams
- **POST** `/exams`: Create a new exam (Admin/Coord)
- **GET** `/exams`: Get all exams (Auth required)
- **GET** `/exams/:id`: Get exam details
- **PATCH** `/exams/:id`: Update exam
- **DELETE** `/exams/:id`: Delete exam

## Questions
- **POST** `/questions`: Add a question to an exam
- **GET** `/questions/exam/:examId`: Get all questions for an exam
- **PATCH** `/questions/:id`: Update question
- **DELETE** `/questions/:id`: Delete question

## Import
- **POST** `/import/questions`: Bulk import questions from Excel/CSV (Form-Data: `file` & `examId`)

## Attempt (Exam Session)
- **POST** `/attempts/start`: Start an exam (Body: `examId`)
- **POST** `/attempts/save`: Auto-save question status (Body: `examId`, `questionId`, `status`, `givenAnswer`, `timeSpent`)
- **POST** `/attempts/submit`: Manually submit exam

## Results & Leaderboard
- **POST** `/results/generate`: Generate result manually (Body: `examId`)
- **GET** `/leaderboard/:examId`: Get ranked leaderboard

## Dashboard
- **GET** `/dashboard/admin`: Get admin analytics
- **GET** `/dashboard/student`: Get student analytics
