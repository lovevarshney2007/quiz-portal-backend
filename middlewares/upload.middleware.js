const multer = require('multer');
const path = require('path');
const CustomError = require('../utils/customError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.xlsx' && ext !== '.csv') {
        return cb(new CustomError('Only Excel or CSV files are allowed', 400), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 10 // 10 MB max
    }
});

module.exports = upload;
