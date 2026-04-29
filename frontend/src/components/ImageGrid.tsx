
import type { ImageResponse } from '../types';
import { Trash2, AlertTriangle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { deleteImage } from '../api/images';

interface ImageGridProps {
  images: ImageResponse[];
  title: string;
  type: 'accepted' | 'rejected';
  onDelete: () => void;
}

const REJECTION_LABELS: Record<string, string> = {
  TOO_SMALL: 'Too Small',
  INVALID_FORMAT: 'Invalid Format',
  TOO_SIMILAR: 'Too Similar',
  BLURRY: 'Blurry',
  FACE_TOO_SMALL: 'Face Too Small',
  MULTIPLE_FACES: 'Multiple Faces',
};

export function ImageGrid({ images, title, type, onDelete }: ImageGridProps) {
  const handleDelete = async (id: string) => {
    if (!id) return;
    try {
      await deleteImage(id);
      onDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (images.length === 0) {
    return (
      <div className="image-grid-section">
        <h2 className={`section-title section-${type}`}>
          {type === 'accepted' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {title} ({images.length})
        </h2>
        <div className="empty-state">
          <ImageIcon size={32} strokeWidth={1.5} />
          <p>No {type} images yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-grid-section">
      <h2 className={`section-title section-${type}`}>
        {type === 'accepted' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
        {title} ({images.length})
      </h2>
      <div className="image-grid">
        {images.map((image) => (
          <div key={image.id} className={`image-card card-${type}`}>
            <div className="image-preview">
              {image.thumbnailUrl || image.imageUrl ? (
                <img
                  src={`http://localhost:3001${image.thumbnailUrl || image.imageUrl}`}
                  alt={image.originalName}
                  loading="lazy"
                />
              ) : (
                <div className="image-placeholder">
                  <ImageIcon size={32} />
                </div>
              )}
              <button
                className="btn-delete"
                onClick={() => handleDelete(image.id)}
                title="Delete image"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="image-meta">
              <span className="image-name" title={image.originalName}>
                {image.originalName}
              </span>
              {image.width && image.height && (
                <span className="image-dims">
                  {image.width}×{image.height}
                </span>
              )}
              <span className="image-size">
                {(image.fileSize / 1024).toFixed(0)}KB
              </span>
              {image.rejectionReason && (
                <span className="rejection-badge">
                  {REJECTION_LABELS[image.rejectionReason] || image.rejectionReason}
                </span>
              )}
              {image.rejectionDetail && (
                <span className="rejection-detail" title={image.rejectionDetail}>
                  {image.rejectionDetail}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
