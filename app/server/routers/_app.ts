import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { z } from 'zod';
import { procedure, router } from '../trpc';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY

type NftType = {
  collectionAddress: string
  collectionName: string
  imageUrl: string
  name: string
  tokenAddress: string
  traits: { trait_type: string, value: string }[]
}

const imageNftallowedDomains = [
  'arweave.net',
  'www.arweave.net',
  'nftstorage.link',
  'www.nftstorage.link'
]

const getNFTsByOwner = async (owner: string) => {
  const url = `https://api.helius.xyz/v0/addresses/${owner}/nfts?api-key=${HELIUS_API_KEY}`
  const { data } = await axios.get(url)
  if (data.nfts) {
    if (data.nfts) {
      return (data.nfts as NftType[]).filter(nft => {
        for (const domain of imageNftallowedDomains) {
          if (nft.imageUrl.includes(domain)) return true
        }
        return false
      })
    }
  }
  return []
}

export const appRouter = router({
  nftsByOwner: procedure
    .input(
      z.object({
        owner: z.string()
      }),
    )
    .query(async ({ input }) => {
      try {
        new PublicKey(input.owner)
      } catch (error) {
        return []
      }
      return await getNFTsByOwner(input.owner)
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;