/*
  Warnings:

  - A unique constraint covering the columns `[userID,recipientID]` on the table `Relationship` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Relationship_userID_recipientID_key" ON "Relationship"("userID", "recipientID");
