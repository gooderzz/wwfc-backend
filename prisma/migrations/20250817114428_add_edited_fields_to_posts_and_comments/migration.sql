-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false;
