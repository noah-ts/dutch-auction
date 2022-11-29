use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::{token::{Mint, Token, TokenAccount, Transfer}},
};

#[derive(Accounts)]
pub struct CreateAuctionCtx<'info> {
    #[account(mut)]
    creator: Signer<'info>,

    #[account(
        mut,
        constraint=creator_ata.mint == mint.key()
    )]
    creator_ata: Account<'info, TokenAccount>,

    mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [AUCTION_SEED.as_bytes(), mint.key().as_ref()],
        bump = auction.auction_bump,
        constraint = auction.mint == mint.key(),
        constraint = auction.escrow == escrow.key(),
        constraint = auction.auction_state != AuctionState::Created as u8 @ ErrorCode::InvalidAuctionState,
    )]
    auction: Account<'info, Auction>,

    #[account(
        seeds = [ESCROW_SEED.as_bytes(), mint.key().as_ref()],
        bump = auction.escrow_bump,
    )]
    escrow: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<CreateAuctionCtx>,
    starting_timestamp: i64,
    starting_price: f64,
    min_price: f64,
    interval_mins: u8,
    price_change: f64,
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    auction.creator = ctx.accounts.creator.key().clone();
    auction.starting_timestamp = starting_timestamp;
    auction.starting_price = starting_price;
    auction.min_price = min_price;
    auction.interval_mins = interval_mins;
    auction.price_change = price_change;
    auction.auction_state = AuctionState::Created as u8;

    // transferring nft from creator to escrow
    let transfer_instruction = Transfer{
        from: ctx.accounts.creator_ata.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
    );

    anchor_spl::token::transfer(cpi_ctx, 1)?;

    Ok(())
}