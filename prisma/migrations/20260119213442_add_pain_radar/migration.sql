-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('REDDIT', 'TWITTER', 'THREADS', 'INSTAGRAM', 'PIKABU');

-- CreateEnum
CREATE TYPE "PainCategory" AS ENUM ('TIME_MANAGEMENT', 'COST', 'TECHNICAL', 'PROCESS', 'COMMUNICATION', 'QUALITY', 'SCALABILITY', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "PainSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "pain_keywords" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pain_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platform_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "author_url" TEXT,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analyzed_at" TIMESTAMP(3),

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_pains" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "pain_text" TEXT NOT NULL,
    "category" "PainCategory" NOT NULL,
    "severity" "PainSeverity" NOT NULL DEFAULT 'MEDIUM',
    "sentiment" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "keywords" TEXT[],
    "context" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "trend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_insights" JSONB,
    "linked_project_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_pains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pain_scans" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "posts_found" INTEGER NOT NULL DEFAULT 0,
    "posts_new" INTEGER NOT NULL DEFAULT 0,
    "pains_extracted" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pain_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pain_keywords_workspace_id_idx" ON "pain_keywords"("workspace_id");

-- CreateIndex
CREATE INDEX "pain_keywords_keyword_idx" ON "pain_keywords"("keyword");

-- CreateIndex
CREATE INDEX "social_posts_keyword_id_idx" ON "social_posts"("keyword_id");

-- CreateIndex
CREATE INDEX "social_posts_keyword_id_is_analyzed_idx" ON "social_posts"("keyword_id", "is_analyzed");

-- CreateIndex
CREATE INDEX "social_posts_published_at_idx" ON "social_posts"("published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_platform_platform_id_key" ON "social_posts"("platform", "platform_id");

-- CreateIndex
CREATE INDEX "extracted_pains_workspace_id_idx" ON "extracted_pains"("workspace_id");

-- CreateIndex
CREATE INDEX "extracted_pains_category_idx" ON "extracted_pains"("category");

-- CreateIndex
CREATE INDEX "extracted_pains_severity_idx" ON "extracted_pains"("severity");

-- CreateIndex
CREATE INDEX "extracted_pains_post_id_idx" ON "extracted_pains"("post_id");

-- CreateIndex
CREATE INDEX "extracted_pains_workspace_id_created_at_idx" ON "extracted_pains"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "extracted_pains_workspace_id_severity_created_at_idx" ON "extracted_pains"("workspace_id", "severity", "created_at" DESC);

-- CreateIndex
CREATE INDEX "pain_scans_workspace_id_idx" ON "pain_scans"("workspace_id");

-- CreateIndex
CREATE INDEX "pain_scans_keyword_id_idx" ON "pain_scans"("keyword_id");

-- CreateIndex
CREATE INDEX "pain_scans_workspace_id_status_created_at_idx" ON "pain_scans"("workspace_id", "status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "pain_keywords" ADD CONSTRAINT "pain_keywords_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_keywords" ADD CONSTRAINT "pain_keywords_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "pain_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_pains" ADD CONSTRAINT "extracted_pains_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_pains" ADD CONSTRAINT "extracted_pains_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_scans" ADD CONSTRAINT "pain_scans_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "pain_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pain_scans" ADD CONSTRAINT "pain_scans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
