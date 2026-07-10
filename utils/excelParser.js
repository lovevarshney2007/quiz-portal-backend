const xlsx = require('xlsx');
const fs = require('fs');

const parseExcel = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming first sheet
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // Clean up file after parsing
    fs.unlinkSync(filePath);
    
    return data;
};

module.exports = { parseExcel };
