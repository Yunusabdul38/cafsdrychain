-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('INVITE', 'RESET');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "purpose" "TokenPurpose" NOT NULL DEFAULT 'RESET';
