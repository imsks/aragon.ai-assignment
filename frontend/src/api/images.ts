import axios from 'axios';
import type { UploadResponse, PaginatedResponse, StatsResponse } from '../types';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s for large uploads
});

export async function uploadImages(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await api.post<UploadResponse>('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getImages(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<PaginatedResponse> {
  const params: Record<string, string | number> = { page, limit };
  if (status) params.status = status;

  const response = await api.get<PaginatedResponse>('/images', { params });
  return response.data;
}

export async function getStats(): Promise<StatsResponse> {
  const response = await api.get<StatsResponse>('/images/stats');
  return response.data;
}

export async function deleteImage(id: string): Promise<void> {
  await api.delete(`/images/${id}`);
}
