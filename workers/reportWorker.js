const { Worker } = require('bullmq');
const Redis = require('ioredis');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const User = require('../models/User');
const exceljs = require('exceljs'); // Assuming exceljs is installed per Phase 3
const fs = require('fs');
const path = require('path');
const redisClient = require('../config/redis');

const reportWorker = new Worker('reportQueue', async job => {
    if (job.name === 'generateExamReport') {
        const { examId } = job.data;
        const exam = await Exam.findById(examId);
        const results = await Result.find({ exam: examId }).populate('student', 'name studentNumber email');

        const workbook = new exceljs.Workbook();
        const sheet = workbook.addWorksheet('Results');
        
        sheet.columns = [
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Student Number', key: 'studentNumber', width: 20 },
            { header: 'Total Score', key: 'totalScore', width: 15 },
            { header: 'Accuracy (%)', key: 'accuracy', width: 15 },
            { header: 'Violations', key: 'violations', width: 15 },
            { header: 'Suspicious', key: 'suspicious', width: 15 }
        ];

        results.forEach(r => {
            if (r.student) {
                sheet.addRow({
                    name: r.student.name,
                    studentNumber: r.student.studentNumber,
                    totalScore: r.totalScore,
                    accuracy: r.accuracy,
                    violations: r.violationCount,
                    suspicious: r.isSuspicious ? 'Yes' : 'No'
                });
            }
        });

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, `exam_report_${examId}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        
        return { filePath };
    }
}, {
    connection: new Redis(redisClient.redisConfig, { maxRetriesPerRequest: null })
});

module.exports = reportWorker;
