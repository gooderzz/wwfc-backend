-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "contentEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titleEdited" BOOLEAN NOT NULL DEFAULT false;
