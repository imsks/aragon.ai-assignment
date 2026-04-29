# Aragon.ai Image Validator

A full-stack image upload and validation application that categorizes uploaded images as **Accepted** or **Rejected** based on multiple quality checks including blur detection, face analysis, duplicate detection, and format/size validation.

![Architecture](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue)
![Backend](https://img.shields.io/badge/Backend-Express%20%2B%20Node.js-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Prisma-purple)
![Storage](https://img.shields.io/badge/Storage-S3%20%2F%20Local-orange)

---

## Architecture Overview

```
┌──────────────────┐       ┌────────────────────────────┐       ┌───────────────┐
│  React Frontend  │──────▶│     Express REST API        │──────▶│  PostgreSQL    │
│  (Vite + TS)     │ HTTP  │  /api/images/*              │ ORM   │  (Prisma)      │
│                  │◀──────│                              │◀──────│               │
└──────────────────┘       │  ┌────────────────────────┐ │       └───────────────┘
                           │  │  Validation Pipeline    │ │
                           │  │  ─ Format check         │ │       ┌───────────────┐
                           │  │  ─ Size/resolution      │ │──────▶│  S3 / Local   │
                           │  │  ─ Blur detection       │ │ Files │  File Storage  │
                           │  │  ─ Perceptual hashing   │ │       └───────────────┘
                           │  │  ─ Similarity check     │ │
                           │  │  ─ Face detection       │ │
                           │  └────────────────────────┘ │
                           └────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **ORM** | Prisma | Type-safe queries, auto-generated client, excellent migration tooling |
| **Image Processing** | Sharp | Fast, native bindings, supports HEIC conversion, raw pixel access |
| **File Upload** | Multer (memory storage) | Buffers in memory for validation before persisting - avoids writing invalid files to disk |
| **Face Detection** | Custom skin-tone + connected components | Lightweight, no ML model dependency. Production would use a proper library (e.g. face-api.js) |
| **Blur Detection** | Laplacian variance | Industry-standard approach - computes edge sharpness variance |
| **Similarity** | Perceptual hashing (aHash) | Fast O(1) comparison, stores 64-bit hash per image, Hamming distance for similarity |
| **Storage** | S3 with local fallback | S3 for production scalability, local filesystem for easy development |
| **State Management** | React hooks (useState, useCallback, custom hooks) | Appropriate complexity for this app. No need for Redux/Zustand |

---

## Features

### Frontend
- **Drag & drop** or click-to-browse file upload (react-dropzone)
- **Client-side validation** before upload (format, size)
- **Real-time upload feedback** with progress bar and status indicators
- **Image previews** via thumbnails
- **Filter** between Accepted / Rejected / All views
- **Stats dashboard** showing total, accepted, rejected counts with acceptance rate
- **Delete** individual images
- **Responsive design** that works on mobile

### Backend
- **RESTful API** with proper HTTP verbs and status codes
- **PostgreSQL** database with indexed schema via Prisma ORM
- **S3-compatible storage** with local filesystem fallback
- **HEIC → JPEG conversion** via Sharp
- **Thumbnail generation** (300×300 cover crops)
- **Async image processing** pipeline

### Validation Pipeline (6 checks)

1. **Format Validation** — Only JPEG, PNG, HEIC/HEIF accepted
2. **Size Validation** — Minimum 200×200px resolution, minimum 10KB file size
3. **Blur Detection** — Laplacian variance analysis; rejects blurry photos below threshold
4. **Similarity Detection** — Perceptual hash (aHash) comparison with Hamming distance; rejects images >90% similar to existing
5. **Face Size Check** — Skin-tone pixel analysis with connected components; rejects if face region <5% of image
6. **Multiple Face Detection** — Connected component analysis; rejects images with more than one face-like region

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/images/upload` | Upload images (multipart/form-data, field: `images`) |
| `GET` | `/api/images` | List images with pagination (`?page=1&limit=20&status=ACCEPTED`) |
| `GET` | `/api/images/stats` | Get upload statistics and rejection breakdown |
| `GET` | `/api/images/:id` | Get single image details |
| `DELETE` | `/api/images/:id` | Delete an image |
| `GET` | `/api/health` | Health check |

### Example Upload Response
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid-here",
      "originalName": "photo.jpg",
      "imageUrl": "/uploads/abc123.jpg",
      "thumbnailUrl": "/uploads/thumbnails/abc123_thumb.jpg",
      "status": "ACCEPTED",
      "width": 1920,
      "height": 1080,
      "fileSize": 245000,
      "createdAt": "2026-04-29T15:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "originalName": "blurry.png",
      "imageUrl": "/uploads/def456.png",
      "status": "REJECTED",
      "rejectionReason": "BLURRY",
      "rejectionDetail": "Image blur score (42.3) is below threshold (100). Image appears blurry.",
      "width": 800,
      "height": 600,
      "fileSize": 120000,
      "createdAt": "2026-04-29T15:00:00.000Z"
    }
  ],
  "summary": { "total": 2, "accepted": 1, "rejected": 1 }
}
```

---

## Database Schema

```sql
CREATE TABLE "Image" (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "originalName"  TEXT NOT NULL,
  "storagePath"   TEXT NOT NULL,
  "thumbnailPath" TEXT,
  "mimeType"      TEXT NOT NULL,
  "fileSize"      INTEGER NOT NULL,
  width           INTEGER,
  height          INTEGER,
  status          "ImageStatus" DEFAULT 'PROCESSING',  -- PROCESSING | ACCEPTED | REJECTED
  "rejectionReason" "RejectionReason",                 -- TOO_SMALL | INVALID_FORMAT | TOO_SIMILAR | BLURRY | FACE_TOO_SMALL | MULTIPLE_FACES
  "rejectionDetail" TEXT,
  "perceptualHash"  TEXT,                              -- 64-bit hash for similarity comparison
  "createdAt"     TIMESTAMP DEFAULT now(),
  "updatedAt"     TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_status ON "Image" (status);
CREATE INDEX idx_hash ON "Image" ("perceptualHash");
CREATE INDEX idx_created ON "Image" ("createdAt");
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 14+ (installed via `brew install postgresql@17` on macOS)
- **npm** 

### 1. Clone & Install

```bash
git clone <repo-url>
cd aragon.ai-assignment

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL (macOS)
brew services start postgresql@17

# Create the database
createdb aragon_images

# Run migrations
cd backend
npx prisma migrate dev
```

### 3. Configure Environment

```bash
# backend/.env
DATABASE_URL="postgresql://<your-username>@localhost:5432/aragon_images"
PORT=3001
USE_LOCAL_STORAGE=true

# For S3 (optional):
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# S3_BUCKET_NAME=your-bucket
# USE_LOCAL_STORAGE=false
```

### 4. Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## Project Structure

```
aragon.ai-assignment/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema with enums
│   ├── src/
│   │   ├── index.ts               # Express app entry point
│   │   ├── config/index.ts        # Centralized configuration
│   │   ├── controllers/
│   │   │   └── image.controller.ts # Request handlers (upload, list, delete, stats)
│   │   ├── middleware/
│   │   │   └── upload.middleware.ts # Multer config with file filtering
│   │   ├── routes/
│   │   │   └── image.routes.ts     # REST route definitions
│   │   ├── services/
│   │   │   ├── storage.service.ts  # S3/local file storage abstraction
│   │   │   └── validation.service.ts # All 6 validation checks
│   │   └── types/index.ts         # Shared TypeScript types
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app with filter/grid layout
│   │   ├── App.css                # Complete styling
│   │   ├── api/images.ts          # API client (axios)
│   │   ├── components/
│   │   │   ├── DropZone.tsx       # Drag-and-drop upload with validation feedback
│   │   │   ├── ImageGrid.tsx      # Image card grid with previews
│   │   │   └── StatsBar.tsx       # Statistics dashboard
│   │   ├── hooks/
│   │   │   ├── useImageUpload.ts  # Upload state management
│   │   │   └── useImages.ts       # Image fetching & filtering
│   │   └── types/index.ts        # Frontend type definitions
│   └── package.json
└── README.md
```

---

## Tradeoffs & Considerations

### What I'd Improve with More Time

1. **Face Detection**: The current approach uses skin-tone heuristics. In production, I'd integrate `face-api.js` or a cloud vision API (AWS Rekognition) for accurate face detection, bounding boxes, and face count.

2. **Async Processing Queue**: For large-scale uploads, I'd add a job queue (Bull/BullMQ with Redis) to process validations asynchronously, returning a `PROCESSING` status immediately and updating via WebSocket/SSE.

3. **Image Deduplication**: The current aHash is fast but basic. I'd add dHash (difference hash) and pHash (DCT-based) for more robust similarity detection.

4. **Testing**: Add unit tests for validation functions, integration tests for API endpoints, and E2E tests with Playwright.

5. **Error Recovery**: Add retry logic for S3 uploads, dead-letter queue for failed validations.

6. **Auth**: Add authentication middleware to protect upload/delete endpoints.

7. **CDN**: Serve images through CloudFront or similar CDN for production performance.

---

## Test Cases for QA

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Upload a valid JPEG face photo | Accepted ✅ |
| 2 | Upload a valid PNG face photo | Accepted ✅ |
| 3 | Upload a .txt file renamed to .jpg | Rejected - Invalid format |
| 4 | Upload a tiny 50×50 image | Rejected - Too small |
| 5 | Upload the same image twice | First accepted, second rejected - Too similar |
| 6 | Upload a blurry/out-of-focus image | Rejected - Blurry |
| 7 | Upload image with very small face | Rejected - Face too small |
| 8 | Upload group photo with multiple faces | Rejected - Multiple faces |
| 9 | Upload 10 images at once | All processed, categorized correctly |
| 10 | Upload a .gif file | Rejected at frontend validation |
| 11 | Filter by Accepted/Rejected | Only matching images shown |
| 12 | Delete an image | Removed from list and database |
