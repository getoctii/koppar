/*
  Warnings:

  - A unique constraint covering the columns `[communityID,userID]` on the table `CommunityMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_communityID_userID_key" ON "CommunityMember"("communityID", "userID");
