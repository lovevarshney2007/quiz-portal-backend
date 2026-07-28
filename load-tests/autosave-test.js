import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'http://localhost:5001/api';

const testData = new SharedArray('test data', function () {
    return [JSON.parse(open('./test-data.json'))];
});

export const options = {
    scenarios: {
        continuous_autosave: {
            executor: 'constant-vus',
            vus: 700,
            duration: '1m', // 1 minute of non-stop autosaves
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

    // Assuming exam is already started from the previous test, or we start it here just in case.
    http.post(`${BASE_URL}/attempts/start`, JSON.stringify({ examId }), params);
    
    const questionsRes = http.get(`${BASE_URL}/questions/exam/${examId}`, params);
    let questions = [];
    try {
        if (questionsRes.status === 200) {
            questions = questionsRes.json('data') || [];
        }
    } catch(e) {}
    
    if (!questions || questions.length === 0) {
        return;
    }

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    const payload = {
        examId: examId,
        questionId: randomQuestion._id,
        status: 'Answered',
        givenAnswer: 'A',
        timeSpent: Math.floor(Math.random() * 30),
        tabSwitchCount: 0,
        fullscreenExits: 0
    };

    const saveRes = http.post(`${BASE_URL}/attempts/save`, JSON.stringify(payload), params);
    
    check(saveRes, {
        'Autosaved successfully': (r) => r.status === 200,
    });

    sleep(1); // 1 second between autosaves per user, which is extreme stress (700 requests per second)
}
