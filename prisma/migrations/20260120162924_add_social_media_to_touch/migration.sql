-- CreateEnum
CREATE TYPE "TouchStatus" AS ENUM ('WAITING', 'RESPONDED', 'NO_RESPONSE', 'FOLLOW_UP', 'CONVERTED');

-- CreateTable
CREATE TABLE "touches" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "contact_company" TEXT,
    "social_media" TEXT,
    "source" TEXT,
    "status" "TouchStatus" NOT NULL DEFAULT 'WAITING',
    "description" TEXT,
    "response" TEXT,
    "contacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "follow_up_at" TIMESTAMP(3),
    "converted_to_client_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "touches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "touches_converted_to_client_id_key" ON "touches"("converted_to_client_id");

-- CreateIndex
CREATE INDEX "touches_workspace_id_idx" ON "touches"("workspace_id");

-- CreateIndex
CREATE INDEX "touches_status_idx" ON "touches"("status");

-- AddForeignKey
ALTER TABLE "touches" ADD CONSTRAINT "touches_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touches" ADD CONSTRAINT "touches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
