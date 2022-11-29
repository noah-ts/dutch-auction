import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAnchorProgram, getAuctionPubkey, getEscrowPubkey } from '../utils'


export const getCancelAuctionTxn = async ({
    connection,
    wallet,
    creator,
    mint
}: {
    connection: Connection,
    wallet: WalletContextState,
    creator: PublicKey,
    mint: PublicKey
}) => {
    const txn = new Transaction()
    const program = getAnchorProgram(connection, wallet)

    const auctionPubkey = await getAuctionPubkey(mint)
    const escrowPubkey = await getEscrowPubkey(mint)

    const creatorAta = await getAssociatedTokenAddress(mint, creator)

    txn.add(
        await program.methods.cancelAuction().accounts({
            creator,
            creatorAta,
            mint,
            auction: auctionPubkey,
            escrow: escrowPubkey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
        }).instruction()
    )

    return txn
}