import { createAuction, updateAuction, getAllAuctions } from '../procedures/auction'
import { nftsByOwner } from '../procedures/nftsByOwner'
import { router } from '../trpc'

export const appRouter = router({
  nftsByOwner,
  createAuction,
  updateAuction,
  getAllAuctions
})

// export type definition of API
export type AppRouter = typeof appRouter