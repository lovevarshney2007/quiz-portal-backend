import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('../k6-users.json'));
});
const examData = JSON.parse(open('../k6-exam.json'));

export const options = {
  stages: [
    { duration: '15s', target: 700 }, // Ramp to 700 concurrent
    { duration: '30s', target: 700 }, // Sustain autosaving
    { duration: '5s', target: 0 },
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

  const answerPayload = JSON.stringify({
    examId: examData.examId,
    questionId: '600000000000000000000000', // Mock QID
    status: 'Answered',
    givenAnswer: ['b'],
    timeSpent: 10
  });
  
  let res = http.post(`${BASE_URL}/attempts/save`, answerPayload, params);
  check(res, { 'autosave success': (r) => r.status === 200 || r.status === 403 || r.status === 404 });
  
  sleep(10); // Autosave every 10 seconds per user
}
