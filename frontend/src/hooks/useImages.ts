import { useState, useEffect, useCallback } from 'react';
import { getImages, getStats } from '../api/images';
import type { ImageResponse, StatsResponse } from '../types';

interface UseImagesReturn {
  images: ImageResponse[];
  stats: StatsResponse | null;
  loading: boolean;
  filter: string;
  setFilter: (filter: string) => void;
  refresh: () => void;
}

export function useImages(): UseImagesReturn {
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [imagesRes, statsRes] = await Promise.all([
        getImages(1, 100, filter || undefined),
        getStats(),
      ]);
      setImages(imagesRes.images);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to fetch images:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    images,
    stats,
    loading,
    filter,
    setFilter,
    refresh: fetchData,
  };
}
