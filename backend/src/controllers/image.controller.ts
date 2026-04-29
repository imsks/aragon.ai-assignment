import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadFile, uploadThumbnail, getFileUrl } from '../services/storage.service';
import {
  runAllValidations,
  generateThumbnail,
  convertToJpeg,
  extractMetadata,
} from '../services/validation.service';
import { ImageResponse } from '../types';

const prisma = new PrismaClient();

/**
 * Upload and validate images
 * POST /api/images/upload
 */
export async function uploadImages(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const results: ImageResponse[] = [];

    for (const file of files) {
      try {
        // Run all validations
        const { result, hash, metadata } = await runAllValidations(
          file.buffer,
          file.mimetype
        );

        // Convert HEIC to JPEG for storage
        let storageBuffer = file.buffer;
        let storageMime = file.mimetype;
        if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
          storageBuffer = await convertToJpeg(file.buffer);
          storageMime = 'image/jpeg';
        }

        // Upload file to storage
        const storagePath = await uploadFile(storageBuffer, file.originalname, storageMime);

        // Generate and upload thumbnail
        let thumbnailPath: string | null = null;
        try {
          const thumbnail = await generateThumbnail(storageBuffer);
          thumbnailPath = await uploadThumbnail(thumbnail, storagePath);
        } catch (err) {
          console.error('Thumbnail generation failed:', err);
        }

        // Get image metadata
        const meta = metadata || await extractMetadata(storageBuffer);

        // Save to database
        const image = await prisma.image.create({
          data: {
            originalName: file.originalname,
            storagePath,
            thumbnailPath,
            mimeType: file.mimetype,
            fileSize: file.size,
            width: meta.width,
            height: meta.height,
            status: result.isValid ? 'ACCEPTED' : 'REJECTED',
            rejectionReason: result.rejectionReason as any,
            rejectionDetail: result.detail,
            perceptualHash: hash,
          },
        });

        // Build response
        const imageUrl = await getFileUrl(storagePath);
        const thumbnailUrl = thumbnailPath ? await getFileUrl(thumbnailPath) : undefined;

        results.push({
          id: image.id,
          originalName: image.originalName,
          imageUrl,
          thumbnailUrl,
          status: image.status,
          rejectionReason: image.rejectionReason || undefined,
          rejectionDetail: image.rejectionDetail || undefined,
          width: image.width || undefined,
          height: image.height || undefined,
          fileSize: image.fileSize,
          createdAt: image.createdAt.toISOString(),
        });
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        results.push({
          id: '',
          originalName: file.originalname,
          imageUrl: '',
          status: 'REJECTED',
          rejectionReason: 'INVALID_FORMAT',
          rejectionDetail: `Failed to process image: ${(err as Error).message}`,
          fileSize: file.size,
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      images: results,
      summary: {
        total: results.length,
        accepted: results.filter((r) => r.status === 'ACCEPTED').length,
        rejected: results.filter((r) => r.status === 'REJECTED').length,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
}

/**
 * Get all images with pagination
 * GET /api/images
 */
export async function getImages(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as any } : {};

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.image.count({ where }),
    ]);

    const imageResponses: ImageResponse[] = await Promise.all(
      images.map(async (img) => {
        const imageUrl = await getFileUrl(img.storagePath);
        const thumbnailUrl = img.thumbnailPath ? await getFileUrl(img.thumbnailPath) : undefined;
        return {
          id: img.id,
          originalName: img.originalName,
          imageUrl,
          thumbnailUrl,
          status: img.status,
          rejectionReason: img.rejectionReason || undefined,
          rejectionDetail: img.rejectionDetail || undefined,
          width: img.width || undefined,
          height: img.height || undefined,
          fileSize: img.fileSize,
          createdAt: img.createdAt.toISOString(),
        };
      })
    );

    res.json({
      images: imageResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a single image by ID
 * GET /api/images/:id
 */
export async function getImage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const imageUrl = await getFileUrl(image.storagePath);
    const thumbnailUrl = image.thumbnailPath ? await getFileUrl(image.thumbnailPath) : undefined;

    res.json({
      id: image.id,
      originalName: image.originalName,
      imageUrl,
      thumbnailUrl,
      status: image.status,
      rejectionReason: image.rejectionReason || undefined,
      rejectionDetail: image.rejectionDetail || undefined,
      width: image.width || undefined,
      height: image.height || undefined,
      fileSize: image.fileSize,
      createdAt: image.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete an image
 * DELETE /api/images/:id
 */
export async function deleteImage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    await prisma.image.delete({ where: { id } });

    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get upload statistics
 * GET /api/images/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const [total, accepted, rejected, rejectionBreakdown] = await Promise.all([
      prisma.image.count(),
      prisma.image.count({ where: { status: 'ACCEPTED' } }),
      prisma.image.count({ where: { status: 'REJECTED' } }),
      prisma.image.groupBy({
        by: ['rejectionReason'],
        where: { status: 'REJECTED' },
        _count: true,
      }),
    ]);

    res.json({
      total,
      accepted,
      rejected,
      rejectionBreakdown: rejectionBreakdown.map((r) => ({
        reason: r.rejectionReason,
        count: r._count,
      })),
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
