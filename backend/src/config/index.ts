import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL!,
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.S3_BUCKET_NAME || 'aragon-image-uploads',
  },
  useLocalStorage: process.env.USE_LOCAL_STORAGE === 'true',
  validation: {
    minWidth: 200,
    minHeight: 200,
    minFileSize: 10 * 1024, // 10KB
    maxFileSize: 50 * 1024 * 1024, // 50MB
    similarityThreshold: 0.90, // 90% similarity = rejected
    blurThreshold: 50, // Laplacian variance threshold
    minFaceRatio: 0.05, // Face must be at least 5% of image area
  },
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
};
