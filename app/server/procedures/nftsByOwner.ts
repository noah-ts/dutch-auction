import { PublicKey } from '@solana/web3.js'
import fetch from 'node-fetch'
import { z } from 'zod'
import { NftHeliusType } from '../../types/NftHeliusType'
import { procedure } from '../trpc'

const HELIUS_API_KEY = process.env.HELIUS_API_KEY

const getNFTsByOwner = async (owner: string) => {
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: owner,
        page: 1, // Starts at 1
        limit: 1000
      },
    }),
  });
  const { result } = await response.json() as any;
  return result.items.map((item: any) => ({
    tokenAddress: item.id,
    name: item.content.metadata.name,
    imageUrl: item.content.links.image
  })).filter((item: any) => item.name) as NftHeliusType[]
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