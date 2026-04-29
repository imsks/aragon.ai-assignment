import multer from 'multer';
import { config } from '../config';

// Use memory storage for processing before uploading to S3/local
const storage = multer.memoryStorage();

// File filter to validate mime types at upload level
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Also accept octet-stream for HEIC files that browsers may not recognize
  const allowedTypes = [...config.allowedMimeTypes, 'application/octet-stream'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, HEIC`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.validation.maxFileSize,
    files: 10, // Max 10 files per upload
  },
});
