import { BN } from '@project-serum/anchor'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js'
import { getAnchorProgram, getAuctionPubkey, getEscrowPubkey } from '../utils'


export const getCreateAuctionTxn = async ({
    connection,
    wallet,
    creator,
    mint,
    startingTimestamp,
    startingPrice,
    minPrice,
    intervalMins,
    priceChange
}: {
    connection: Connection,
    wallet: WalletContextState,
    creator: PublicKey,
    mint: PublicKey,
    startingTimestamp: number,
    startingPrice: number,
    minPrice: number,
    intervalMins: number,
    priceChange: number
}) => {
    const txn = new Transaction()
    const program = getAnchorProgram(connection, wallet)

    const auctionPubkey = await getAuctionPubkey(mint)
    const auction = await program.account.auction.fetchNullable(auctionPubkey)
    if (!auction) {
        txn.add(
            await program.methods.initializeAuction().accounts({
                signer: creator,
                mint,
                auction: auctionPubkey,
                systemProgram: SystemProgram.programId
            }).instruction()
        )
    }

    const escrowPubkey = await getEscrowPubkey(mint)
    txn.add(
        await program.methods.initializeEscrow().accounts({
            signer: creator,
            mint,
            auction: auctionPubkey,
            systemProgram: SystemProgram.programId,
            escrow: escrowPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY
        }).instruction()
    )

    const creatorAta = await getAssociatedTokenAddress(mint, creator)

    txn.add(
        await program.methods.createAuction(
            new BN(startingTimestamp),
            startingPrice,
            minPrice,
            intervalMins,
            priceChange
        ).accounts({
            creator,
            creatorAta,
            mint,
            auction: auctionPubkey,
            escrow: escrowPubkey,
            tokenProgram: TOKEN_PROGRAM_ID
        }).instruction()
    )

    return txn
}