import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, TokenAccountNotFoundError, TokenInvalidAccountOwnerError, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAnchorProgram, getAuctionPubkey, getEscrowPubkey } from '../utils'


export const getCloseAuctionTxn = async ({
    connection,
    wallet,
    creator,
    mint,
    buyer
}: {
    connection: Connection,
    wallet: WalletContextState,
    creator: PublicKey,
    mint: PublicKey,
    buyer: PublicKey
}) => {
    const txn = new Transaction()
    const program = getAnchorProgram(connection, wallet)

    const auctionPubkey = await getAuctionPubkey(mint)
    const escrowPubkey = await getEscrowPubkey(mint)

    const buyerAta = await getAssociatedTokenAddress(mint, buyer)
    try {
        await getAccount(connection, buyerAta, 'finalized')
    } catch (error) {
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            txn.add(createAssociatedTokenAccountInstruction(
                buyer,
                buyerAta,
                buyer,
                mint
            ))
        }
    }

    txn.add(
        await program.methods.closeAuction().accounts({
            buyer,
            buyerAta,
            creator,
            mint,
            auction: auctionPubkey,
            escrow: escrowPubkey,
            dev: new PublicKey('3t4ejZucVtAEoPcuofBvyqbf6ujKjb14DN3YfMZiD4Xq'),
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
        }).instruction()
    )

    return txn
}