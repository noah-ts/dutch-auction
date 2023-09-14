export type NftHeliusType = {
    collectionAddress?: string
    collectionName?: string
    imageUrl: string
    name: string
    tokenAddress: string
    traits?: { trait_type: string, value: string }[]
}