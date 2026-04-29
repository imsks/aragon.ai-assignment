-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('PROCESSING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('TOO_SMALL', 'INVALID_FORMAT', 'TOO_SIMILAR', 'BLURRY', 'FACE_TOO_SMALL', 'MULTIPLE_FACES');

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" "ImageStatus" NOT NULL DEFAULT 'PROCESSING',
    "rejectionReason" "RejectionReason",
    "rejectionDetail" TEXT,
    "perceptualHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_status_idx" ON "Image"("status");

-- CreateIndex
CREATE INDEX "Image_perceptualHash_idx" ON "Image"("perceptualHash");

-- CreateIndex
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");
