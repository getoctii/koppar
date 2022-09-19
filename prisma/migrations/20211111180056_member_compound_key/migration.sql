/*
  Warnings:

  - The primary key for the `CommunityMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CommunityMember` table. All the data in the column will be lost.
  - You are about to drop the `_CommunityMemberToGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CommunityMemberToGroup" DROP CONSTRAINT "_CommunityMemberToGroup_A_fkey";

-- DropForeignKey
ALTER TABLE "_CommunityMemberToGroup" DROP CONSTRAINT "_CommunityMemberToGroup_B_fkey";

-- DropIndex
DROP INDEX "CommunityMember_communityID_userID_key";

-- AlterTable
ALTER TABLE "CommunityMember" DROP CONSTRAINT "CommunityMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("communityID", "userID");

-- DropTable
DROP TABLE "_CommunityMemberToGroup";

-- CreateTable
CREATE TABLE "GroupMember" (
    "groupID" TEXT NOT NULL,
    "memberCommunityID" TEXT NOT NULL,
    "memberUserID" TEXT NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("groupID","memberCommunityID","memberUserID")
);

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupID_fkey" FOREIGN KEY ("groupID") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_memberCommunityID_memberUserID_fkey" FOREIGN KEY ("memberCommunityID", "memberUserID") REFERENCES "CommunityMember"("communityID", "userID") ON DELETE RESTRICT ON UPDATE CASCADE;
