import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'http://localhost:5001/api';

// Load test data
const testData = new SharedArray('test data', function () {
    return [JSON.parse(open('./test-data.json'))];
});

export const options = {
    scenarios: {
        realistic_simulation: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 700 }, // Ramp up to 700 students
                { duration: '2m', target: 700 },  // Stay at 700 for 2 mins
                { duration: '30s', target: 0 },   // Ramp down
            ],
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.005'], // < 0.5% errors
        http_req_duration: ['p(95)<300', 'p(99)<600'], // P95 < 300ms, P99 < 600ms
    },
};

export default function () {
    const data = testData[0];
    const examId = data.examId;
    
    // Pick a student based on VU id (k6 __VU is 1-indexed)
    const studentIndex = (__VU - 1) % data.students.length;
    const student = data.students[studentIndex];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${student.token}`,
            'Content-Type': 'application/json',
        },
    };

    group('Realistic Exam Simulation', function () {
        // 1. Wait random time before starting
        sleep(Math.random() * 5);

        // 2. Start Exam
        let res = http.post(`${BASE_URL}/attempts/start`, JSON.stringify({ examId }), params);
        
        // If already started, it might return 400 with "Exam already started", which is fine for reconnect simulation.
        check(res, {
            'Started exam successfully or already started': (r) => r.status === 200 || r.status === 201 || r.status === 400,
        });

        // 3. Fetch Questions
        res = http.get(`${BASE_URL}/questions/exam/${examId}`, params);
        check(res, {
            'Fetched questions': (r) => r.status === 200,
        });

        let questions = [];
        try {
            if (res.status === 200) {
                questions = res.json('data') || [];
            }
        } catch (e) {
            // Error parsing JSON
        }
        
        if (!questions || questions.length === 0) {
            return; // no questions to answer
        }

        // 4. Answer Questions and Autosave
        // We will answer 5 random questions to simulate the exam process
        for (let i = 0; i < 5; i++) {
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            
            // Random delay to simulate reading
            sleep(Math.random() * 10 + 10); // Wait 10-20 seconds
            
            const payload = {
                examId: examId,
                questionId: randomQuestion._id,
                status: 'Answered',
                givenAnswer: 'A',
                timeSpent: Math.floor(Math.random() * 30),
                tabSwitchCount: 0,
                fullscreenExits: 0
            };

            let saveRes = http.post(`${BASE_URL}/attempts/save`, JSON.stringify(payload), params);
            check(saveRes, {
                'Autosaved successfully': (r) => r.status === 200,
            });
        }

        // 5. Network Delay / Refresh Page Simulation
        sleep(Math.random() * 5); // delay
        let stateRes = http.get(`${BASE_URL}/attempts/state/${examId}`, params);
        check(stateRes, {
            'Fetched exam state successfully': (r) => r.status === 200,
        });

        // 6. Submit Exam
        sleep(2);
        let submitRes = http.post(`${BASE_URL}/attempts/submit`, JSON.stringify({ examId }), params);
        check(submitRes, {
            'Submitted exam successfully or already submitted': (r) => r.status === 200 || r.status === 400,
        });
    });
}
