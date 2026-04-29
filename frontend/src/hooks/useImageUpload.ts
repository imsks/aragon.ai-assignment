import { useState, useCallback } from 'react';
import { uploadImages as uploadImagesApi } from '../api/images';
import type { UploadResponse, UploadStatus, ImageResponse } from '../types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UseImageUploadReturn {
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadResults: ImageResponse[];
  error: string | null;
  uploadFiles: (files: File[]) => Promise<void>;
  validateFiles: (files: File[]) => { valid: File[]; invalid: { file: File; reason: string }[] };
  reset: () => void;
}

export function useImageUpload(onUploadComplete?: () => void): UseImageUploadReturn {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<ImageResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; invalid: { file: File; reason: string }[] } => {
      const valid: File[] = [];
      const invalid: { file: File; reason: string }[] = [];

      for (const file of files) {
        // Check file type
        const fileExt = file.name.toLowerCase().split('.').pop();
        const isHeic = fileExt === 'heic' || fileExt === 'heif';

        if (!ALLOWED_TYPES.includes(file.type) && !isHeic) {
          invalid.push({
            file,
            reason: `Invalid format "${file.type || fileExt}". Only JPEG, PNG, and HEIC are allowed.`,
          });
          continue;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          invalid.push({
            file,
            reason: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`,
          });
          continue;
        }

        if (file.size === 0) {
          invalid.push({ file, reason: 'File is empty.' });
          continue;
        }

        valid.push(file);
      }

      return { valid, invalid };
    },
    []
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setUploadStatus('uploading');
      setUploadProgress(0);
      setError(null);

      try {
        // Simulate progress steps
        setUploadProgress(20);
        const response: UploadResponse = await uploadImagesApi(files);
        setUploadProgress(100);

        setUploadResults(response.images);
        setUploadStatus('success');
        onUploadComplete?.();
      } catch (err: any) {
        const message =
          err.response?.data?.error || err.message || 'Upload failed. Please try again.';
        setError(message);
        setUploadStatus('error');
      }
    },
    [onUploadComplete]
  );

  const reset = useCallback(() => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadResults([]);
    setError(null);
  }, []);

  return {
    uploadStatus,
    uploadProgress,
    uploadResults,
    error,
    uploadFiles,
    validateFiles,
    reset,
  };
}
