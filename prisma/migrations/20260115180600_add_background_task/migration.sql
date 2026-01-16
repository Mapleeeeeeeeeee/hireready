-- CreateTable
CREATE TABLE "background_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resourceId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "background_tasks_userId_type_idx" ON "background_tasks"("userId", "type");

-- CreateIndex
CREATE INDEX "background_tasks_status_idx" ON "background_tasks"("status");

-- AddForeignKey
ALTER TABLE "background_tasks" ADD CONSTRAINT "background_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
