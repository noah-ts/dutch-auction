// these are not unit tests, I first deploy program to devnet then test things here.

import { AnchorProvider, Program } from "@project-serum/anchor";
import { clusterApiUrl, Connection, PublicKey, Keypair, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, sendAndConfirmTransaction } from '@solana/web3.js';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { DutchAuction } from "../target/types/dutch_auction";
import idl from '../target/idl/dutch_auction.json'
import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, TokenAccountNotFoundError, TokenInvalidAccountOwnerError, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dayjs from 'dayjs';
import { BN } from 'bn.js';

const privateKey = ''
const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))

const buyerPrivateKey = ''
const buyerKeypair = Keypair.fromSecretKey(bs58.decode(buyerPrivateKey))

class Wallet {
  public publicKey: PublicKey
  constructor(public payer: Keypair) {
    this.publicKey = payer.publicKey
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }
}

const wallet = new Wallet(keypair)

const programId = new PublicKey(idl.metadata.address)
const connection = new Connection(clusterApiUrl('devnet'))
const provider = new AnchorProvider(connection, wallet, { preflightCommitment: 'processed' })
const program = new Program(idl as any, programId, provider) as Program<DutchAuction>

const mint = new PublicKey('7RvG1kWnjkF1ZbipYTL7NU6HY7TvLnzMnSYor52ALAfM')

const main = async () => {
  const txn = new Transaction()

  const [auctionPubkey] = await PublicKey.findProgramAddress(
    [Buffer.from('auction'), mint.toBuffer()], programId
  )

  // const auction = await program.account.auction.fetchNullable(auctionPubkey)
  // if (!auction) {
  //   txn.add(
  //     await program.methods.initializeAuction().accounts({
  //       signer: keypair.publicKey,
  //       mint,
  //       auction: auctionPubkey,
  //       systemProgram: SystemProgram.programId
  //     }).instruction()
  //   )
  // }

  const [escrowPubkey] = await PublicKey.findProgramAddress(
    [Buffer.from('escrow'), mint.toBuffer()], programId
  )

  // txn.add(
  //   await program.methods.initializeEscrow().accounts({
  //     signer: keypair.publicKey,
  //     mint,
  //     auction: auctionPubkey,
  //     systemProgram: SystemProgram.programId,
  //     escrow: escrowPubkey,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     rent: SYSVAR_RENT_PUBKEY
  //   }).instruction()
  // )

  // const creatorAta = await getAssociatedTokenAddress(mint, keypair.publicKey)

  // txn.add(
  //   await program.methods.createAuction(
  //     new BN(dayjs().unix()),
  //     2,
  //     1,
  //     1,
  //     1
  //   ).accounts({
  //     creator: keypair.publicKey,
  //     creatorAta,
  //     mint,
  //     auction: auctionPubkey,
  //     escrow: escrowPubkey,
  //     tokenProgram: TOKEN_PROGRAM_ID
  //   }).instruction()
  // )

  // txn.add(
  //   await program.methods.cancelAuction().accounts({
  //     creator: keypair.publicKey,
  //     creatorAta,
  //     mint,
  //     auction: auctionPubkey,
  //     escrow: escrowPubkey,
  //     systemProgram: SystemProgram.programId,
  //     tokenProgram: TOKEN_PROGRAM_ID
  //   }).instruction()
  // )

  const buyerAta = await getAssociatedTokenAddress(mint, buyerKeypair.publicKey)
  try {
    await getAccount(connection, buyerAta, 'finalized')
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      txn.add(createAssociatedTokenAccountInstruction(
        buyerKeypair.publicKey,
        buyerAta,
        buyerKeypair.publicKey,
        mint
      ))
    }
  }

  txn.add(
    await program.methods.closeAuction().accounts({
      buyer: buyerKeypair.publicKey,
      buyerAta,
      creator: keypair.publicKey,
      mint,
      auction: auctionPubkey,
      escrow: escrowPubkey,
      dev: new PublicKey('3t4ejZucVtAEoPcuofBvyqbf6ujKjb14DN3YfMZiD4Xq'),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    }).instruction()
  )

  const signature = await sendAndConfirmTransaction(connection, txn, [buyerKeypair])
  console.log(signature)

  // const signature = await sendAndConfirmTransaction(connection, txn, [keypair])
  // console.log(signature)

  const auctionState = await program.account.auction.fetchNullable(auctionPubkey)
  console.log(auctionState)
}

main()
  .then(() => console.log('everything worked!'))
  .catch((error) => console.error('Error: ', error))