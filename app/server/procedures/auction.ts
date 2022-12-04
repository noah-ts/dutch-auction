import { z } from 'zod'
import { procedure } from '../trpc'
import { prisma } from '../db'

const AuctionStateSchema = z.enum(['CREATED', 'CLOSED', 'CANCELLED'])

const AuctionSchema = z.object({
    mint: z.string(),
    creator: z.string(),
    startingDateUTC: z.string(),
    startingPrice: z.number(),
    minPrice: z.number(),
    boughtPrice: z.number().nullable().nullish(),
    priceChange: z.number(),
    intervalMins: z.number(),
    auctionState: AuctionStateSchema,
    name: z.string(),
    imageUrl: z.string()
})

export const createAuction = procedure
.input(
    AuctionSchema
)
.mutation(async ({ input }) => {
    const auction = await prisma.auction.findUnique({ where: { mint: input.mint } })
    if (auction) {
        await prisma.auction.update({ where: { mint: input.mint }, data: { auctionState: input.auctionState } })
    } else {
        await prisma.auction.create({ data: input })
    }
})

export const updateAuction = procedure
.input(
    z.object({
        mint: z.string(),
        auctionState: AuctionStateSchema
    })
)
.mutation(({ input: { mint, auctionState } }) => {
    return prisma.auction.update({ where: { mint }, data: { auctionState } })
})

export const getAllAuctions = procedure
.input(
    z.object({
        skip: z.number(),
        name: z.string().nullable().nullish()
    })
)
.query(({ input: { skip, name } }) => {
    return prisma.auction.findMany({
        take: 20,
        skip,
        where: {
            name: {
                contains: name ?? undefined,
                mode: 'insensitive'
            }
        },
        orderBy: {
            startingDateUTC: 'desc'
        }
    })
})