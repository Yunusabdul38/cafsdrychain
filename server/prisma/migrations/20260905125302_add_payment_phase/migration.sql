-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterEnum
ALTER TYPE "BatchStage" ADD VALUE 'AWAITING_PAYMENT';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_batchId_key" ON "Payment"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
