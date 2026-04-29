import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import imageRoutes from './routes/image.routes';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Serve uploaded files locally
if (config.useLocalStorage) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Routes
app.use('/api/images', imageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  if (err.message.includes('Invalid file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message.includes('File too large')) {
    res.status(400).json({ error: 'File size exceeds the 50MB limit' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📁 Storage mode: ${config.useLocalStorage ? 'Local filesystem' : 'AWS S3'}`);
});

export default app;
