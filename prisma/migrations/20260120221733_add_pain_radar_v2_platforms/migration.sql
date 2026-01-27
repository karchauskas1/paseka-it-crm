-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SocialPlatform" ADD VALUE 'HACKERNEWS';
ALTER TYPE "SocialPlatform" ADD VALUE 'HABR';
ALTER TYPE "SocialPlatform" ADD VALUE 'VCRU';
ALTER TYPE "SocialPlatform" ADD VALUE 'TELEGRAM';

-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN     "filter_score" INTEGER,
ADD COLUMN     "filtered_at" TIMESTAMP(3);
