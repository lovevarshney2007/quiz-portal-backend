const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

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
        
        req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING COMPREHENSIVE ROUTE TESTS ---');
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await mongoose.connection.db.dropDatabase();
        console.log('Cleared database for testing.');
    } catch (err) {
        console.log('Failed to connect to MongoDB. Is it running? ' + err.message);
        return;
    }

    const headers = { 'Content-Type': 'application/json' };
    const authHeaders = (t) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` });

    let adminToken = '';
    let studentToken = '';
    let examId = '654321012345678901234567'; // Fake ID for routes that require an ID, will be replaced if we successfully create one
    let questionId = '654321012345678901234568';
    
    let results = {
        working: [],
        notWorking: []
    };
    
    function recordResult(route, method, res, expectedStatuses = [200, 201, 204, 400, 401, 403, 404]) {
        // If it responds with anything other than 500 or ERROR (like connection refused), we consider it "working" (i.e. the route exists and handles the request)
        // 400, 401, 403, 404 (if not "route not found", but resource not found) are acceptable as they show the route is handled.
        // Actually, Express 404 handler returns { status: 'fail', message: "Can't find..." }
        let isRouteHandled = true;
        if (res.status === 'ERROR' || res.status === 500) {
            isRouteHandled = false;
        }
        
        if (res.data && res.data.message && res.data.message.includes("Can't find")) {
            isRouteHandled = false;
        }

        const info = `[${method}] ${route} -> Status: ${res.status}`;
        if (isRouteHandled) {
            results.working.push(info);
            console.log(`✅ WORKING: ${info}`);
        } else {
            let errorMsg = res.error || (res.data && res.data.message) || 'Unknown Error';
            results.notWorking.push(`${info} | ${errorMsg}`);
            console.log(`❌ FAILED: ${info} | ${errorMsg}`);
        }
    }

    try {
        // --- 1. SETUP USERS ---
        await mongoose.connection.db.collection('users').insertOne({
            name: 'Admin User', studentNumber: '2500001', email: 'admin@akgec.ac.in', role: 'Admin', isVerified: true
        });
        await mongoose.connection.db.collection('users').insertOne({
            name: 'Student User', studentNumber: '2500002', email: 'student@akgec.ac.in', role: 'Student', isVerified: true
        });

        let res = await fetchJSON(`${BASE_URL}/auth/login`, {
            method: 'POST', headers, body: JSON.stringify({ email: 'admin@akgec.ac.in', studentNumber: '2500001' })
        });
        if (res.data?.data?.accessToken) adminToken = res.data.data.accessToken;
        
        res = await fetchJSON(`${BASE_URL}/auth/login`, {
            method: 'POST', headers, body: JSON.stringify({ email: 'student@akgec.ac.in', studentNumber: '2500002' })
        });
        if (res.data?.data?.accessToken) studentToken = res.data.data.accessToken;

        // --- 2. AUTH ROUTES ---
        recordResult('/auth/login', 'POST', res); // tested above basically
        
        res = await fetchJSON(`${BASE_URL}/auth/refresh-token`, { method: 'POST', headers });
        recordResult('/auth/refresh-token', 'POST', res);
        
        res = await fetchJSON(`${BASE_URL}/auth/logout`, { method: 'POST', headers: authHeaders(adminToken) });
        recordResult('/auth/logout', 'POST', res);

        // We need to login admin again after logout
        res = await fetchJSON(`${BASE_URL}/auth/login`, {
            method: 'POST', headers, body: JSON.stringify({ email: 'admin@akgec.ac.in', studentNumber: '2500001' })
        });
        adminToken = res.data.data.accessToken;

        // --- 3. EXAM ROUTES ---
        res = await fetchJSON(`${BASE_URL}/exams`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/exams', 'GET', res);

        const examPayload = {
            title: 'Mock Test', description: 'Test', instructions: 'Test',
            startTime: new Date(Date.now() - 10000).toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            duration: 60, status: 'Published', passingMarks: 33, sections: [{ title: 'Sec A', order: 1, marks: 4 }]
        };
        res = await fetchJSON(`${BASE_URL}/exams`, { method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify(examPayload) });
        recordResult('/exams', 'POST', res);
        if (res.data?.data?.exam?._id) examId = res.data.data.exam._id;

        res = await fetchJSON(`${BASE_URL}/exams/${examId}`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/exams/:id', 'GET', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}`, { method: 'PATCH', headers: authHeaders(adminToken), body: JSON.stringify({ title: 'Updated' }) });
        recordResult('/exams/:id', 'PATCH', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}/publish`, { method: 'PATCH', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/publish', 'PATCH', res);
        
        res = await fetchJSON(`${BASE_URL}/exams/${examId}/start`, { method: 'PATCH', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/start', 'PATCH', res);
        
        res = await fetchJSON(`${BASE_URL}/exams/${examId}/pause`, { method: 'PATCH', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/pause', 'PATCH', res);
        
        res = await fetchJSON(`${BASE_URL}/exams/${examId}/resume`, { method: 'PATCH', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/resume', 'PATCH', res);
        
        res = await fetchJSON(`${BASE_URL}/exams/${examId}/complete`, { method: 'PATCH', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/complete', 'PATCH', res);
        
        res = await fetchJSON(`${BASE_URL}/exams/${examId}/archive`, { method: 'PATCH', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/archive', 'PATCH', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}/extend`, { method: 'PATCH', headers: authHeaders(adminToken), body: JSON.stringify({ extraMinutes: 10 }) });
        recordResult('/exams/:id/extend', 'PATCH', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}/duplicate`, { method: 'POST', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/duplicate', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}/force-submit/2500002`, { method: 'POST', headers: authHeaders(adminToken) });
        recordResult('/exams/:id/force-submit/:studentId', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}/autosave`, { method: 'POST', headers: authHeaders(studentToken) });
        recordResult('/exams/:id/autosave', 'POST', res);

        // --- 4. QUESTION ROUTES ---
        res = await fetchJSON(`${BASE_URL}/questions/exam/${examId}`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/questions/exam/:examId', 'GET', res);

        const qPayload = {
            exam: examId, section: examId, type: 'Single Correct', questionText: 'Q1?', options: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }], correctAnswer: ['A'], marks: 4, negativeMarks: 1, order: 1
        };
        res = await fetchJSON(`${BASE_URL}/questions`, { method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify(qPayload) });
        recordResult('/questions', 'POST', res);
        if (res.data?.data?.question?._id) questionId = res.data.data.question._id;

        res = await fetchJSON(`${BASE_URL}/questions/${questionId}`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/questions/:id', 'GET', res);

        res = await fetchJSON(`${BASE_URL}/questions/${questionId}`, { method: 'PATCH', headers: authHeaders(adminToken), body: JSON.stringify({ marks: 5 }) });
        recordResult('/questions/:id', 'PATCH', res);

        res = await fetchJSON(`${BASE_URL}/questions/duplicate/${questionId}`, { method: 'POST', headers: authHeaders(adminToken) });
        recordResult('/questions/duplicate/:id', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/questions/reorder/batch`, { method: 'PATCH', headers: authHeaders(adminToken), body: JSON.stringify({ questions: [{ id: questionId, order: 2 }] }) });
        recordResult('/questions/reorder/batch', 'PATCH', res);

        res = await fetchJSON(`${BASE_URL}/questions/move/${questionId}`, { method: 'PATCH', headers: authHeaders(adminToken), body: JSON.stringify({ sectionId: examId }) });
        recordResult('/questions/move/:id', 'PATCH', res);

        res = await fetchJSON(`${BASE_URL}/questions/import-preview`, { method: 'POST', headers: authHeaders(adminToken) });
        recordResult('/questions/import-preview', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/questions/confirm-import`, { method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify({ fileId: 'fake' }) });
        recordResult('/questions/confirm-import', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/questions/bulk/batch`, { method: 'DELETE', headers: authHeaders(adminToken), body: JSON.stringify({ questionIds: [questionId] }) });
        recordResult('/questions/bulk/batch', 'DELETE', res);

        res = await fetchJSON(`${BASE_URL}/questions/${questionId}`, { method: 'DELETE', headers: authHeaders(adminToken) });
        recordResult('/questions/:id', 'DELETE', res);

        res = await fetchJSON(`${BASE_URL}/exams/${examId}`, { method: 'DELETE', headers: authHeaders(adminToken) });
        recordResult('/exams/:id', 'DELETE', res);

        // --- 5. ATTEMPT ROUTES ---
        res = await fetchJSON(`${BASE_URL}/attempts/start`, { method: 'POST', headers: authHeaders(studentToken), body: JSON.stringify({ examId }) });
        recordResult('/attempts/start', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/attempts/save`, { method: 'POST', headers: authHeaders(studentToken), body: JSON.stringify({ examId, questionId, status: 'Answered', timeSpent: 10 }) });
        recordResult('/attempts/save', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/attempts/state/${examId}`, { method: 'GET', headers: authHeaders(studentToken) });
        recordResult('/attempts/state/:examId', 'GET', res);

        res = await fetchJSON(`${BASE_URL}/attempts/summary/${examId}`, { method: 'GET', headers: authHeaders(studentToken) });
        recordResult('/attempts/summary/:examId', 'GET', res);

        res = await fetchJSON(`${BASE_URL}/attempts/submit`, { method: 'POST', headers: authHeaders(studentToken), body: JSON.stringify({ examId }) });
        recordResult('/attempts/submit', 'POST', res);

        // --- 6. RESULT ROUTES ---
        res = await fetchJSON(`${BASE_URL}/results/generate`, { method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify({ examId }) });
        recordResult('/results/generate', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/results/exam/${examId}`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/results/exam/:examId', 'GET', res);

        // --- 7. LEADERBOARD ROUTES ---
        res = await fetchJSON(`${BASE_URL}/leaderboard/${examId}`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/leaderboard/:examId', 'GET', res);

        // --- 8. DASHBOARD ROUTES ---
        res = await fetchJSON(`${BASE_URL}/dashboard/admin`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/dashboard/admin', 'GET', res);

        res = await fetchJSON(`${BASE_URL}/dashboard/student`, { method: 'GET', headers: authHeaders(studentToken) });
        recordResult('/dashboard/student', 'GET', res);

        // --- 9. VIOLATION ROUTES ---
        res = await fetchJSON(`${BASE_URL}/violations/`, { method: 'POST', headers: authHeaders(studentToken), body: JSON.stringify({ examId, type: 'Tab Switch', description: 'test' }) });
        recordResult('/violations/', 'POST', res);

        res = await fetchJSON(`${BASE_URL}/violations/${examId}`, { method: 'GET', headers: authHeaders(adminToken) });
        recordResult('/violations/:examId', 'GET', res);

        console.log('\n=============================================');
        console.log(`TOTAL WORKING ROUTES: ${results.working.length}`);
        console.log(`TOTAL FAILED ROUTES: ${results.notWorking.length}`);
        console.log('=============================================\n');

    } catch (e) {
        console.error('Test script crashed:', e);
    } finally {
        mongoose.disconnect();
    }
}

runTests();
