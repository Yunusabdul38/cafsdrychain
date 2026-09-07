-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "feesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minimumFee" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
