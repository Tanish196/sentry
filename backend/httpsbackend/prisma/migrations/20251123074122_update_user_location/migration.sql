/*
  Warnings:

  - You are about to drop the column `destination` on the `Location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "destination";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "destination" TEXT;
