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

export interface UploadResponse {
  success: boolean;
  images: ImageResponse[];
  summary: {
    total: number;
    accepted: number;
    rejected: number;
  };
}

export interface PaginatedResponse {
  images: ImageResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatsResponse {
  total: number;
  accepted: number;
  rejected: number;
  rejectionBreakdown: {
    reason: string;
    count: number;
  }[];
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface FileWithPreview extends File {
  preview: string;
  id: string;
}
