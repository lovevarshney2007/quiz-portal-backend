import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('../k6-users.json'));
});

export const options = {
  stages: [
    { duration: '30s', target: 700 },
    { duration: '30s', target: 700 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:5000/api/v1';

export default function () {
  const user = users[__VU % users.length];
  
  const payload = JSON.stringify({
    email: user.email,
    studentNumber: user.studentNumber,
    captchaToken: 'mock_token'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  const success = check(res, {
    'login successful': (r) => r.status === 200,
  });
  if (!success) {
    console.log(`Login failed for ${user.email} - Status: ${res.status} Body: ${res.body}`);
  }

  sleep(Math.random() * 2 + 1);
}
