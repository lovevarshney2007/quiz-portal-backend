import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('../k6-users.json'));
});
const examData = JSON.parse(open('../k6-exam.json'));

export const options = {
  stages: [
    { duration: '30s', target: 700 }, // Ramp to 700 concurrent
    { duration: '2m', target: 700 },  // Test for 2 minutes
    { duration: '10s', target: 0 },
  ],
};

const BASE_URL = 'http://localhost:5000/api/v1';

export default function () {
  const user = users[__VU % users.length];
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`
  };
  const params = { headers };

  // 1. Start Exam
  let res = http.post(`${BASE_URL}/attempts/start`, JSON.stringify({ examId: examData.examId }), params);
  check(res, { 'start exam success': (r) => r.status === 201 || r.status === 200 });
  
  sleep(Math.random() * 2 + 1);

  // 2. Fetch Questions
  res = http.get(`${BASE_URL}/questions/exam/${examData.examId}`, params);
  check(res, { 'questions fetched': (r) => r.status === 200 });

  let questions = [];
  try {
    questions = res.json('data.questions');
  } catch(e) {}
  
  if (!questions || questions.length === 0) return;

  // 3. Answer 3 questions (simulating a short segment of an exam)
  for (let i = 0; i < 3; i++) {
    sleep(Math.random() * 5 + 5); // Read question for 5-10s
    
    const q = questions[i];
    if (!q) break;
    const answerPayload = JSON.stringify({
      examId: examData.examId,
      questionId: q._id,
      status: 'Answered',
      givenAnswer: ['b'],
      timeSpent: 10
    });
    
    let saveRes = http.post(`${BASE_URL}/attempts/save`, answerPayload, params);
    check(saveRes, { 'autosave success': (r) => r.status === 200 });
  }

  // 4. Submit Exam
  sleep(Math.random() * 2 + 1);
  const submitPayload = JSON.stringify({
    examId: examData.examId,
    answers: [
      { questionId: questions[0]._id, status: 'Answered', givenAnswer: ['b'], timeSpent: 10 },
      { questionId: questions[1]._id, status: 'Answered', givenAnswer: ['b'], timeSpent: 10 },
      { questionId: questions[2]._id, status: 'Answered', givenAnswer: ['b'], timeSpent: 10 }
    ]
  });
  let submitRes = http.post(`${BASE_URL}/attempts/submit`, submitPayload, params);
  check(submitRes, { 'submit success': (r) => r.status === 200 || r.status === 201 });
}
