import { AnchorProvider, Program } from '@project-serum/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import idl from '../dutch_auction.json'
import { DutchAuction } from '../dutch_auction'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { Metaplex } from '@metaplex-foundation/js'
import dayjs, { Dayjs } from 'dayjs'
import numbro from 'numbro'

export const programId = new PublicKey(idl.metadata.address)
let program: Program<DutchAuction>
let mplx: Metaplex

export const getAnchorProgram = (connection: Connection, wallet: WalletContextState) => {
    if (program) return program
    const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'processed' })
    program = new Program(idl as any, programId, provider)
    return program
}

export const getMetaplex = (connection: Connection) => {
    if (mplx) return mplx
    return new Metaplex(connection)
}

export const getAuctionPubkey = async (mint: PublicKey) => {
    const [auctionPubkey] = await PublicKey.findProgramAddress(
        [Buffer.from('auction'), mint.toBuffer()], programId
    )
    return auctionPubkey
}

export const getEscrowPubkey = async (mint: PublicKey) => {
    const [escrowPubkey] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), mint.toBuffer()], programId
    )
    return escrowPubkey
}

export const getNftByMintMetaplex = async (connection: Connection, mint: PublicKey) => {
    const metaplex = getMetaplex(connection)
    const nft = await metaplex.nfts().findByMint({ mintAddress: mint })
    const uriRes = await fetch(nft.uri)
    const uriJson = await uriRes.json()
    return {
        mint,
        name: uriJson.name as string,
        imageUrl: uriJson.image as string
    }
}

export const getAuctionState = (value: number) => {
    switch (value) {
        case 1: return 'CREATED'
        case 2: return 'CLOSED'
        case 3: return 'CANCELLED'
    }
}

export const getCurrentPrice = (
    startingDate: Dayjs,
    startingPrice: number,
    minPrice: number,
    intervalMins: number,
    priceChange: number
) => {
    if (dayjs() < startingDate) return startingPrice
    const diffMins = dayjs().diff(startingDate, 'minutes')
    const numOfTimesChanged = Math.floor(numbro(diffMins).divide(intervalMins).value())
    const price = numbro(numOfTimesChanged).multiply(priceChange).value()
    return Math.max(minPrice, numbro(startingPrice).subtract(price).value())
}