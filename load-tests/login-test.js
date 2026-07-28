import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'http://localhost:5001/api';

const testData = new SharedArray('test data', function () {
    return [JSON.parse(open('./test-data.json'))];
});

export const options = {
    scenarios: {
        simultaneous_login: {
            executor: 'per-vu-iterations',
            vus: 700,
            iterations: 1,
            maxDuration: '30s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.005'],
        http_req_duration: ['p(95)<300', 'p(99)<600'],
    },
};

export default function () {
    const data = testData[0];
    const studentIndex = (__VU - 1) % data.students.length;
    const student = data.students[studentIndex];
    
    const payload = JSON.stringify({
        email: student.email,
        studentNumber: student.email.replace('student', '').replace('@akgec.ac.in', ''),
        captchaToken: 'dummy' // Captcha bypassed in dev
    });
    
    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(`${BASE_URL}/auth/login`, payload, params);
    
    check(res, {
        'Login successful': (r) => r.status === 200,
    });
}
