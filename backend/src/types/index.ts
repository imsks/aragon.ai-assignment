export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  rejectionReason?: 'TOO_SMALL' | 'INVALID_FORMAT' | 'TOO_SIMILAR' | 'BLURRY' | 'FACE_TOO_SMALL' | 'MULTIPLE_FACES';
  detail?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ImageResponse {
  id: string;
  originalName: string;
  thumbnailUrl?: string;
  imageUrl: string;
  status: 'PROCESSING' | 'ACCEPTED' | 'REJECTED';
  rejectionReason?: string;
  rejectionDetail?: string;
  width?: number;
  height?: number;
  fileSize: number;
  createdAt: string;
}
