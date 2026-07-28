import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('../k6-users.json'));
});
const examData = JSON.parse(open('../k6-exam.json'));

export const options = {
  stages: [
    { duration: '15s', target: 700 }, 
    { duration: '30s', target: 700 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:5000/api/v1';

export default function () {
  const user = users[__VU % users.length];
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    },
  };

  const payload = JSON.stringify({ examId: examData.examId });

  // 700 students click "Start Exam"
  const res = http.post(`${BASE_URL}/attempts/start`, payload, params);

  check(res, {
    'started successfully': (r) => r.status === 201 || r.status === 200,
  });

  sleep(Math.random() * 2 + 1);
}
