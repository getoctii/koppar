/*
  Warnings:

  - Added the required column `ownerID` to the `Community` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "ownerID" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_ownerID_fkey" FOREIGN KEY ("ownerID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
