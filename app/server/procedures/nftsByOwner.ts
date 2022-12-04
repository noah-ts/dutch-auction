import { PublicKey } from '@solana/web3.js'
import axios from 'axios'
import { z } from 'zod'
import { NftHeliusType } from '../../types/NftHeliusType'
import { procedure } from '../trpc'

const HELIUS_API_KEY = process.env.HELIUS_API_KEY

const getNFTsByOwner = async (owner: string) => {
  const url = `https://api.helius.xyz/v0/addresses/${owner}/nfts?api-key=${HELIUS_API_KEY}`
  const { data } = await axios.get(url)
  return data.nfts as NftHeliusType[]
}

export const nftsByOwner = procedure
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
})