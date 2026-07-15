const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1';

async function fetchJSON(url, options) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING API TESTS ---');
    // Clear DB
    require('dotenv').config();
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);
    await mongoose.connection.db.dropDatabase();
    console.log('Cleared database for tests.');

    let token = '';
    let examId = '';
    let questionId = '';
    let attemptId = '';

    const headers = { 'Content-Type': 'application/json' };
    const authHeaders = (t) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` });

    try {
        // 1. Register User (Admin/Coord)
        console.log('\n[1] Registering Admin...');
        const regPayload = {
            name: 'Admin User',
            studentNumber: '2500000000002',
            email: 'admin2@akgec.ac.in',
            password: 'Password@123',
            branch: 'CSE',
            section: 'A',
            year: '3',
            role: 'Admin'
        };
        let res = await fetchJSON(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers,
            body: JSON.stringify(regPayload)
        });
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(res.data, null, 2));

        // 2. Login User
        console.log('\n[2] Logging in...');
        res = await fetchJSON(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email: 'admin2@akgec.ac.in', password: 'Password@123' })
        });
        console.log('Status:', res.status);
        if (res.data.data && res.data.data.accessToken) {
            token = res.data.data.accessToken;
            console.log('Token acquired.');
        } else {
            console.log('Response:', JSON.stringify(res.data, null, 2));
            return;
        }

        // Wait, the registered user defaults to Student. To create an exam, they need ADMIN role.
        // I will need to modify the DB manually or add an endpoint for role, but for now I can just test Student dashboard.
        // Wait, let's update the user role directly in DB to Admin.
        await mongoose.connection.db.collection('users').updateOne(
            { email: 'admin2@akgec.ac.in' },
            { $set: { role: 'Admin' } }
        );
        console.log('Updated user role to Admin directly in DB.');
        
        // Relogin to get Admin token
        res = await fetchJSON(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email: 'admin2@akgec.ac.in', password: 'Password@123' })
        });
        token = res.data.data.accessToken;

        // 3. Create Exam
        console.log('\n[3] Creating Exam...');
        const examPayload = {
            title: 'Mock Test 1',
            description: 'Test for APIs',
            instructions: 'Do your best',
            startTime: new Date(Date.now() - 10000).toISOString(), // started in past
            endTime: new Date(Date.now() + 3600000).toISOString(), // ends in 1 hour
            duration: 60,
            status: 'Published',
            passingMarks: 33,
            sections: [{ title: 'Section A', order: 1, marks: 4 }]
        };
        res = await fetchJSON(`${BASE_URL}/exams`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(examPayload)
        });
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(res.data, null, 2));
        examId = res.data?.data?.exam?._id;

        const sectionId = res.data?.data?.exam?.sections?.[0]?._id;

        if (examId && sectionId) {
            // 4. Create Question
            console.log('\n[4] Creating Question...');
            const qPayload = {
                exam: examId,
                section: sectionId,
                type: 'Single Correct',
                questionText: 'What is 2+2?',
                options: [
                    { id: 'A', text: '3' },
                    { id: 'B', text: '4' },
                    { id: 'C', text: '5' }
                ],
                correctAnswer: ['B'],
                marks: 4,
                negativeMarks: 1,
                order: 1
            };
            res = await fetchJSON(`${BASE_URL}/questions`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify(qPayload)
            });
            console.log('Status:', res.status);
            console.log('Response:', JSON.stringify(res.data, null, 2));
            questionId = res.data?.data?.question?._id;
        }

        if (examId) {
            // 5. Start Attempt
            console.log('\n[5] Starting Attempt...');
            res = await fetchJSON(`${BASE_URL}/attempts/start`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({ examId })
            });
            console.log('Status:', res.status);
            console.log('Response:', JSON.stringify(res.data, null, 2));
            attemptId = res.data?.data?.attempt?._id;
        }
        
        if (attemptId && questionId) {
            // 6. Auto-Save Question
            console.log('\n[6] Auto-Saving Answer...');
            res = await fetchJSON(`${BASE_URL}/attempts/save`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    examId,
                    questionId,
                    status: 'Answered',
                    givenAnswer: ['B'],
                    timeSpent: 10
                })
            });
            console.log('Status:', res.status);
            console.log('Response:', JSON.stringify(res.data, null, 2));

            // 7. Submit Attempt
            console.log('\n[7] Submitting Exam...');
            res = await fetchJSON(`${BASE_URL}/attempts/submit`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({ examId })
            });
            console.log('Status:', res.status);
            console.log('Response:', JSON.stringify(res.data, null, 2));

            // 8. Generate Result
            console.log('\n[8] Generating Result...');
            res = await fetchJSON(`${BASE_URL}/results/generate`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({ examId })
            });
            console.log('Status:', res.status);
            console.log('Response:', JSON.stringify(res.data, null, 2));

            // 9. Get Leaderboard
            console.log('\n[9] Fetching Leaderboard...');
            res = await fetchJSON(`${BASE_URL}/leaderboard/${examId}`, {
                method: 'GET',
                headers: authHeaders(token)
            });
            console.log('Status:', res.status);
            console.log('Response:', JSON.stringify(res.data, null, 2));
        }

        // 10. Dashboard
        console.log('\n[10] Fetching Admin Dashboard...');
        res = await fetchJSON(`${BASE_URL}/dashboard/admin`, {
            method: 'GET',
            headers: authHeaders(token)
        });
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(res.data, null, 2));

        console.log('\n--- TESTS COMPLETED ---');
        mongoose.disconnect();

    } catch (e) {
        console.error('Error during testing:', e);
    }
}

runTests();
