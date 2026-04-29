import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';

interface DropZoneProps {
  onUploadComplete: () => void;
}

export function DropZone({ onUploadComplete }: DropZoneProps) {
  const { uploadStatus, uploadProgress, uploadResults, error, uploadFiles, validateFiles, reset } =
    useImageUpload(onUploadComplete);

  const [clientErrors, setClientErrors] = useState<{ name: string; reason: string }[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setClientErrors([]);
      reset();

      const { valid, invalid } = validateFiles(acceptedFiles);

      if (invalid.length > 0) {
        setClientErrors(invalid.map((i) => ({ name: i.file.name, reason: i.reason })));
      }

      if (valid.length > 0) {
        uploadFiles(valid);
      }
    },
    [validateFiles, uploadFiles, reset]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    maxFiles: 10,
    multiple: true,
  });

  return (
    <div className="upload-section">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${
          uploadStatus === 'uploading' ? 'dropzone-disabled' : ''
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={48} strokeWidth={1.5} />
        <h3>Drop images here or click to browse</h3>
        <p>Supports JPEG, PNG, and HEIC formats • Max 50MB per file • Up to 10 files</p>
      </div>

      {uploadStatus === 'uploading' && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p>Processing images... {uploadProgress}%</p>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={reset} className="btn-dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {clientErrors.length > 0 && (
        <div className="client-errors">
          <h4>
            <AlertCircle size={16} /> Frontend Validation Errors
          </h4>
          {clientErrors.map((err, i) => (
            <div key={i} className="client-error-item">
              <strong>{err.name}</strong>: {err.reason}
            </div>
          ))}
        </div>
      )}

      {uploadStatus === 'success' && uploadResults.length > 0 && (
        <div className="upload-results">
          <h4>Upload Results</h4>
          <div className="results-summary">
            <span className="badge badge-accepted">
              {uploadResults.filter((r) => r.status === 'ACCEPTED').length} Accepted
            </span>
            <span className="badge badge-rejected">
              {uploadResults.filter((r) => r.status === 'REJECTED').length} Rejected
            </span>
          </div>
          <div className="results-list">
            {uploadResults.map((result) => (
              <div
                key={result.id || result.originalName}
                className={`result-item result-${result.status.toLowerCase()}`}
              >
                <div className="result-info">
                  <span className="result-name">{result.originalName}</span>
                  <span className={`result-status status-${result.status.toLowerCase()}`}>
                    {result.status}
                  </span>
                </div>
                {result.rejectionDetail && (
                  <p className="result-detail">{result.rejectionDetail}</p>
                )}
              </div>
            ))}
          </div>
          <button onClick={reset} className="btn-secondary">
            Upload More
          </button>
        </div>
      )}
    </div>
  );
}
