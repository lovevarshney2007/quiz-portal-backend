import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'http://localhost:5001/api';

const testData = new SharedArray('test data', function () {
    return [JSON.parse(open('./test-data.json'))];
});

export const options = {
    scenarios: {
        simultaneous_submit: {
            executor: 'per-vu-iterations',
            vus: 700,
            iterations: 1, // Submit once
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
    const examId = data.examId;
    const studentIndex = (__VU - 1) % data.students.length;
    const student = data.students[studentIndex];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${student.token}`,
            'Content-Type': 'application/json',
        },
    };

    // Double click submit simulation
    let res1 = http.post(`${BASE_URL}/attempts/submit`, JSON.stringify({ examId }), params);
    let res2 = http.post(`${BASE_URL}/attempts/submit`, JSON.stringify({ examId }), params);
    
    check(res1, {
        'First submit successful': (r) => r.status === 200 || r.status === 400,
    });
    check(res2, {
        'Second submit successful': (r) => r.status === 200 || r.status === 400,
    });
}
