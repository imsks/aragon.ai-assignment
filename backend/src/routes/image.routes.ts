import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import {
  uploadImages,
  getImages,
  getImage,
  deleteImage,
  getStats,
} from '../controllers/image.controller';

const router = Router();

// Upload images (multipart form data)
router.post('/upload', upload.array('images', 10), uploadImages);

// Get all images (paginated)
router.get('/', getImages);

// Get statistics
router.get('/stats', getStats);

// Get single image
router.get('/:id', getImage);

// Delete image
router.delete('/:id', deleteImage);

export default router;
