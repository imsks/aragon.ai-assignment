import sharp from 'sharp';
import { config } from '../config';
import { ValidationResult, ImageMetadata } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extract metadata from image buffer using sharp
 */
export async function extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    hasAlpha: metadata.hasAlpha || false,
  };
}

/**
 * Convert HEIC/HEIF images to JPEG
 */
export async function convertToJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Generate thumbnail from image buffer
 */
export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(300, 300, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Validate image dimensions (minimum size)
 */
export function validateSize(metadata: ImageMetadata): ValidationResult {
  const { minWidth, minHeight, minFileSize } = config.validation;

  if (metadata.size < minFileSize) {
    return {
      isValid: false,
      rejectionReason: 'TOO_SMALL',
      detail: `File size (${(metadata.size / 1024).toFixed(1)}KB) is below minimum (${minFileSize / 1024}KB)`,
    };
  }

  if (metadata.width < minWidth || metadata.height < minHeight) {
    return {
      isValid: false,
      rejectionReason: 'TOO_SMALL',
      detail: `Image dimensions (${metadata.width}x${metadata.height}) are below minimum (${minWidth}x${minHeight})`,
    };
  }

  return { isValid: true };
}

/**
 * Validate image format
 */
export function validateFormat(mimeType: string): ValidationResult {
  if (!config.allowedMimeTypes.includes(mimeType)) {
    return {
      isValid: false,
      rejectionReason: 'INVALID_FORMAT',
      detail: `Format "${mimeType}" is not supported. Allowed: JPEG, PNG, HEIC`,
    };
  }
  return { isValid: true };
}

/**
 * Detect blur using Laplacian variance approximation.
 * Converts to greyscale and computes variance of the Laplacian filter.
 */
export async function validateBlur(buffer: Buffer): Promise<ValidationResult> {
  try {
    // Get greyscale raw pixels
    const { data, info } = await sharp(buffer)
      .greyscale()
      .resize(500, 500, { fit: 'inside' }) // Normalize size for consistent results
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // Apply Laplacian kernel and compute variance
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        // Laplacian: 4 * center - top - bottom - left - right
        const laplacian =
          4 * data[idx] -
          data[(y - 1) * width + x] -
          data[(y + 1) * width + x] -
          data[y * width + (x - 1)] -
          data[y * width + (x + 1)];

        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;

    if (variance < config.validation.blurThreshold) {
      return {
        isValid: false,
        rejectionReason: 'BLURRY',
        detail: `Image blur score (${variance.toFixed(1)}) is below threshold (${config.validation.blurThreshold}). Image appears blurry.`,
      };
    }

    return { isValid: true };
  } catch (error) {
    // If blur detection fails, don't reject
    console.error('Blur detection error:', error);
    return { isValid: true };
  }
}

/**
 * Generate a perceptual hash for similarity comparison.
 * Uses average hash (aHash) - resize to 8x8 greyscale and compare to mean.
 */
export async function generatePerceptualHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Calculate mean pixel value
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  const mean = sum / data.length;

  // Build hash: 1 if pixel > mean, 0 otherwise
  let hash = '';
  for (let i = 0; i < data.length; i++) {
    hash += data[i] > mean ? '1' : '0';
  }

  return hash;
}

/**
 * Calculate Hamming distance between two hashes
 */
function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Validate image similarity against existing accepted images
 */
export async function validateSimilarity(hash: string): Promise<ValidationResult> {
  // Get all accepted images with hashes
  const existingImages = await prisma.image.findMany({
    where: {
      status: 'ACCEPTED',
      perceptualHash: { not: null },
    },
    select: { perceptualHash: true, originalName: true },
  });

  const hashLength = 64; // 8x8 = 64 bits
  const maxDistance = hashLength * (1 - config.validation.similarityThreshold);

  for (const img of existingImages) {
    if (!img.perceptualHash) continue;
    const distance = hammingDistance(hash, img.perceptualHash);
    if (distance <= maxDistance) {
      const similarity = ((1 - distance / hashLength) * 100).toFixed(1);
      return {
        isValid: false,
        rejectionReason: 'TOO_SIMILAR',
        detail: `Image is ${similarity}% similar to existing image "${img.originalName}"`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Simple face detection using skin tone detection and connected components.
 * This is a lightweight heuristic approach without requiring heavy ML libraries.
 * For production, you'd use a proper face detection library.
 */
export async function validateFaces(buffer: Buffer): Promise<ValidationResult> {
  try {
    // Resize for processing efficiency
    const resized = sharp(buffer).resize(400, 400, { fit: 'inside' });

    const { data, info } = await resized
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // Skin tone detection in RGB space
    const skinMap = new Uint8Array(width * height);
    let skinPixelCount = 0;

    for (let i = 0; i < width * height; i++) {
      const r = data[i * channels];
      const g = data[i * channels + 1];
      const b = data[i * channels + 2];

      // Skin color detection rules (RGB space)
      if (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - Math.min(g, b)) > 15 &&
        Math.abs(r - g) > 15
      ) {
        skinMap[i] = 1;
        skinPixelCount++;
      }
    }

    // If very few skin pixels, likely no face
    const skinRatio = skinPixelCount / (width * height);
    if (skinRatio < 0.02) {
      return {
        isValid: false,
        rejectionReason: 'FACE_TOO_SMALL',
        detail: 'No face detected in the image (insufficient skin tone pixels)',
      };
    }

    // Connected component labeling to find face regions
    const labels = new Int32Array(width * height);
    let currentLabel = 0;
    const regionSizes: Map<number, { size: number; minX: number; maxX: number; minY: number; maxY: number }> = new Map();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (skinMap[idx] === 1 && labels[idx] === 0) {
          currentLabel++;
          // BFS flood fill
          const queue: number[] = [idx];
          let size = 0;
          let minX = x, maxX = x, minY = y, maxY = y;

          while (queue.length > 0) {
            const current = queue.pop()!;
            if (labels[current] !== 0) continue;

            labels[current] = currentLabel;
            size++;

            const cx = current % width;
            const cy = Math.floor(current / width);
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);

            // 4-connected neighbors
            const neighbors = [
              current - 1, current + 1,
              current - width, current + width,
            ];

            for (const n of neighbors) {
              if (n >= 0 && n < width * height && skinMap[n] === 1 && labels[n] === 0) {
                queue.push(n);
              }
            }
          }

          regionSizes.set(currentLabel, { size, minX, maxX, minY, maxY });
        }
      }
    }

    // Filter regions that could be faces (reasonable aspect ratio and size)
    const totalPixels = width * height;
    const minFaceSize = totalPixels * 0.01; // At least 1% of image
    const faceRegions: { size: number; ratio: number }[] = [];

    for (const [, region] of regionSizes) {
      if (region.size < minFaceSize) continue;

      const regionWidth = region.maxX - region.minX;
      const regionHeight = region.maxY - region.minY;
      if (regionWidth === 0 || regionHeight === 0) continue;

      const aspectRatio = regionWidth / regionHeight;
      // Face-like aspect ratio (0.5 to 2.0)
      if (aspectRatio >= 0.4 && aspectRatio <= 2.5) {
        faceRegions.push({ size: region.size, ratio: region.size / totalPixels });
      }
    }

    // Check for multiple faces
    if (faceRegions.length > 1) {
      return {
        isValid: false,
        rejectionReason: 'MULTIPLE_FACES',
        detail: `Detected ${faceRegions.length} potential face regions. Only single-face images are accepted.`,
      };
    }

    // Check face size
    if (faceRegions.length === 1) {
      if (faceRegions[0].ratio < config.validation.minFaceRatio) {
        return {
          isValid: false,
          rejectionReason: 'FACE_TOO_SMALL',
          detail: `Face region is too small (${(faceRegions[0].ratio * 100).toFixed(1)}% of image). Minimum is ${config.validation.minFaceRatio * 100}%.`,
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Face detection error:', error);
    return { isValid: true };
  }
}

/**
 * Run all validations on an image buffer
 */
export async function runAllValidations(
  buffer: Buffer,
  mimeType: string
): Promise<{ result: ValidationResult; hash?: string; metadata?: ImageMetadata }> {
  // 1. Format validation
  const formatResult = validateFormat(mimeType);
  if (!formatResult.isValid) return { result: formatResult };

  // 2. Convert HEIC to JPEG for processing
  let processBuffer = buffer;
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    try {
      processBuffer = await convertToJpeg(buffer);
    } catch (error) {
      return {
        result: {
          isValid: false,
          rejectionReason: 'INVALID_FORMAT',
          detail: 'Failed to process HEIC/HEIF image. File may be corrupted.',
        },
      };
    }
  }

  // 3. Extract metadata and validate size
  const metadata = await extractMetadata(processBuffer);
  const sizeResult = validateSize(metadata);
  if (!sizeResult.isValid) return { result: sizeResult, metadata };

  // 4. Blur detection
  const blurResult = await validateBlur(processBuffer);
  if (!blurResult.isValid) return { result: blurResult, metadata };

  // 5. Perceptual hash and similarity check
  const hash = await generatePerceptualHash(processBuffer);
  const similarityResult = await validateSimilarity(hash);
  if (!similarityResult.isValid) return { result: similarityResult, hash, metadata };

  // 6. Face validation
  const faceResult = await validateFaces(processBuffer);
  if (!faceResult.isValid) return { result: faceResult, hash, metadata };

  return { result: { isValid: true }, hash, metadata };
}
