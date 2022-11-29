use {
    crate::{state::*},
    anchor_lang::prelude::*,
    anchor_spl::{token::{Mint, Token, TokenAccount}},
};

#[derive(Accounts)]
pub struct InitializeAuctionPdaCtx<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    mint: Account<'info, Mint>,

    #[account(
        init,
        space = AUCTION_SIZE,
        payer = signer,
        seeds = [AUCTION_SEED.as_bytes(), mint.key().as_ref()],
        bump
    )]
    auction: Account<'info, Auction>,

    system_program: Program<'info, System>,
}

pub fn initialize_auction_handler(ctx: Context<InitializeAuctionPdaCtx>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    auction.mint = ctx.accounts.mint.key().clone();
    auction.auction_bump = *ctx.bumps.get("auction").unwrap();
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeEscrowPdaCtx<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [AUCTION_SEED.as_bytes(), mint.key().as_ref()],
        bump = auction.auction_bump,
    )]
    auction: Account<'info, Auction>,

    #[account(
        init,
        payer = signer,
        seeds = [ESCROW_SEED.as_bytes(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = auction,
    )]
    escrow: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

pub fn initialize_escrow_handler(ctx: Context<InitializeEscrowPdaCtx>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    auction.escrow = ctx.accounts.escrow.key().clone();
    auction.escrow_bump = *ctx.bumps.get("escrow").unwrap();
    Ok(())
}