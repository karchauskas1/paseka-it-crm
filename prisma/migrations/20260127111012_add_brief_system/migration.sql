-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BriefQuestionType" AS ENUM ('TEXT_SHORT', 'TEXT_LONG', 'SELECT', 'MULTI_SELECT', 'FILE', 'YES_NO', 'SCALE');

-- CreateTable
CREATE TABLE "briefs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "access_key" TEXT NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'DRAFT',
    "client_name" TEXT,
    "client_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brief_questions" (
    "id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "type" "BriefQuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "scale_min" INTEGER,
    "scale_max" INTEGER,
    "scale_min_label" TEXT,
    "scale_max_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brief_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brief_answers" (
    "id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "files" TEXT[],
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brief_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "briefs_project_id_idx" ON "briefs"("project_id");

-- CreateIndex
CREATE INDEX "briefs_access_key_idx" ON "briefs"("access_key");

-- CreateIndex
CREATE UNIQUE INDEX "briefs_access_key_key" ON "briefs"("access_key");

-- CreateIndex
CREATE INDEX "briefs_status_idx" ON "briefs"("status");

-- CreateIndex
CREATE INDEX "brief_questions_brief_id_idx" ON "brief_questions"("brief_id");

-- CreateIndex
CREATE INDEX "brief_questions_brief_id_order_idx" ON "brief_questions"("brief_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "brief_answers_brief_id_question_id_key" ON "brief_answers"("brief_id", "question_id");

-- CreateIndex
CREATE INDEX "brief_answers_brief_id_idx" ON "brief_answers"("brief_id");

-- CreateIndex
CREATE INDEX "brief_answers_question_id_idx" ON "brief_answers"("question_id");

-- AddForeignKey
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_questions" ADD CONSTRAINT "brief_questions_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_answers" ADD CONSTRAINT "brief_answers_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_answers" ADD CONSTRAINT "brief_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "brief_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
