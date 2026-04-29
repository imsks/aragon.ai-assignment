import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { ImageGrid } from './components/ImageGrid';
import { StatsBar } from './components/StatsBar';
import { useImages } from './hooks/useImages';
import { RefreshCw } from 'lucide-react';
import './App.css';

function App() {
  const { images, stats, loading, filter, setFilter, refresh } = useImages();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    refresh();
    setRefreshKey((k) => k + 1);
  };

  const acceptedImages = images.filter((img) => img.status === 'ACCEPTED');
  const rejectedImages = images.filter((img) => img.status === 'REJECTED');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Image Validator</h1>
          <p className="subtitle">Upload photos for AI-powered quality validation</p>
        </div>
        <button className="btn-refresh" onClick={refresh} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
        </button>
      </header>

      <main className="app-main">
        <StatsBar stats={stats} />
        <DropZone key={refreshKey} onUploadComplete={handleUploadComplete} />

        <div className="filter-bar">
          <button
            className={`filter-btn ${filter === '' ? 'active' : ''}`}
            onClick={() => setFilter('')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'ACCEPTED' ? 'active' : ''}`}
            onClick={() => setFilter('ACCEPTED')}
          >
            Accepted
          </button>
          <button
            className={`filter-btn ${filter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setFilter('REJECTED')}
          >
            Rejected
          </button>
        </div>

        {!filter || filter === 'ACCEPTED' ? (
          <ImageGrid
            images={acceptedImages}
            title="Accepted Images"
            type="accepted"
            onDelete={refresh}
          />
        ) : null}

        {!filter || filter === 'REJECTED' ? (
          <ImageGrid
            images={rejectedImages}
            title="Rejected Images"
            type="rejected"
            onDelete={refresh}
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
