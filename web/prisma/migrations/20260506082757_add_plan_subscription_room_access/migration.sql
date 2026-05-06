-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "RoomAccess" AS ENUM ('PUBLIC', 'GOLD_PLUS', 'PLATINUM_ONLY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "PlanType" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "study_rooms" ADD COLUMN     "roomAccess" "RoomAccess" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "plan_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "cardLast4" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_subscriptions_userId_idx" ON "plan_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "plan_subscriptions" ADD CONSTRAINT "plan_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
