import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Initialize S3 client only if not using local storage
let s3Client: S3Client | null = null;
if (!config.useLocalStorage) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true });
  } catch (err) {
    // Directory already exists
  }
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(originalName) || getExtFromMime(mimeType);
  const key = `images/${uuidv4()}${ext}`;

  if (config.useLocalStorage) {
    await ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, key.replace('images/', ''));
    await fs.writeFile(filePath, buffer);
    return key;
  }

  const command = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client!.send(command);
  return key;
}

export async function uploadThumbnail(
  buffer: Buffer,
  originalKey: string
): Promise<string> {
  const ext = path.extname(originalKey);
  const key = `thumbnails/${path.basename(originalKey, ext)}_thumb${ext}`;

  if (config.useLocalStorage) {
    await ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, 'thumbnails', path.basename(key));
    await fs.writeFile(filePath, buffer);
    return key;
  }

  const command = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  });

  await s3Client!.send(command);
  return key;
}

export async function getFileUrl(key: string): Promise<string> {
  if (config.useLocalStorage) {
    return `/uploads/${key.replace('images/', '').replace('thumbnails/', 'thumbnails/')}`;
  }

  const command = new GetObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client!, command, { expiresIn: 3600 });
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  if (config.useLocalStorage) {
    const filePath = key.startsWith('thumbnails/')
      ? path.join(UPLOAD_DIR, 'thumbnails', path.basename(key))
      : path.join(UPLOAD_DIR, key.replace('images/', ''));
    return fs.readFile(filePath);
  }

  const command = new GetObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
  });

  const response = await s3Client!.send(command);
  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function deleteFile(key: string): Promise<void> {
  if (config.useLocalStorage) {
    const filePath = key.startsWith('thumbnails/')
      ? path.join(UPLOAD_DIR, 'thumbnails', path.basename(key))
      : path.join(UPLOAD_DIR, key.replace('images/', ''));
    await fs.unlink(filePath).catch(() => {});
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
  });

  await s3Client!.send(command);
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  return map[mime] || '.jpg';
}
