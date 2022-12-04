-- CreateEnum
CREATE TYPE "AuctionState" AS ENUM ('CREATED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Auction" (
    "mint" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "escrow" TEXT NOT NULL,
    "startingDateUTC" TEXT NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "minPrice" INTEGER NOT NULL,
    "boughtPrice" INTEGER,
    "priceChange" INTEGER NOT NULL,
    "intervalMins" INTEGER NOT NULL,
    "auctionState" "AuctionState" NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("mint")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auction_mint_key" ON "Auction"("mint");
