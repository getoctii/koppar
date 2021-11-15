-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'CATEGORY';

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "parentID" TEXT;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_parentID_fkey" FOREIGN KEY ("parentID") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
