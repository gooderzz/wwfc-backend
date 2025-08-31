-- CreateTable
CREATE TABLE "ClubSettings" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubLogo" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubSettings_category_idx" ON "ClubSettings"("category");

-- CreateIndex
CREATE INDEX "ClubSettings_key_idx" ON "ClubSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSettings_category_key_key" ON "ClubSettings"("category", "key");

-- CreateIndex
CREATE INDEX "ClubLogo_isActive_idx" ON "ClubLogo"("isActive");

-- CreateIndex
CREATE INDEX "ClubLogo_createdAt_idx" ON "ClubLogo"("createdAt");
