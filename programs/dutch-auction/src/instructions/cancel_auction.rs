use {
    crate::{errors::ErrorCode, state::*, utils::get_current_price},
    anchor_lang::prelude::*,
    anchor_spl::token::{TokenAccount, Mint, Transfer, Token, CloseAccount},
};

#[derive(Accounts)]
pub struct CancelAuctionCtx<'info> {
    #[account(
        mut,
        constraint=auction.creator == creator.key(),
    )]
    creator: Signer<'info>,

    #[account(
        mut,
        constraint=creator_ata.owner == creator.key(),
        constraint=creator_ata.mint == mint.key()
    )]
    creator_ata: Account<'info, TokenAccount>,

    #[account(
        constraint=auction.mint == mint.key()
    )]
    mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [AUCTION_SEED.as_bytes(), mint.key().as_ref()],
        bump = auction.auction_bump,
        constraint = auction.creator == creator.key(),
        constraint = auction.mint == mint.key(),
        constraint = auction.escrow == escrow.key(),
        constraint = auction.auction_state == AuctionState::Created as u8 @ ErrorCode::InvalidAuctionState,
    )]
    auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), mint.key().as_ref()],
        bump = auction.escrow_bump,
    )]
    escrow: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelAuctionCtx>) -> Result<()> {
    let current_timestamp = solana_program::clock::Clock::get().unwrap().unix_timestamp;
    if current_timestamp < ctx.accounts.auction.starting_timestamp {
        return Err(error!(ErrorCode::AuctionDidNotStart));
    }

    let auction = &mut ctx.accounts.auction;
    auction.auction_state = AuctionState::Cancelled as u8;

    // check if the current price reached the minimum price
    let price = get_current_price(
        current_timestamp,
        auction.starting_timestamp,
        auction.starting_price,
        auction.min_price,
        auction.interval_mins,
        auction.price_change
    );
    if price > auction.min_price {
        return Err(error!(ErrorCode::AuctionDidNotReachMinPrice));
    }

    // transferring nft from escrow to creator
    let bump_vector = &[auction.auction_bump][..];
    let inner = vec![
        AUCTION_SEED.as_bytes(),
        auction.mint.as_ref(),
        bump_vector.as_ref(),
    ];
    let outer = vec![inner.as_slice()];

    let transfer_instruction = Transfer{
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.creator_ata.to_account_info(),
        authority: auction.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
        outer.as_slice(),
    );

    anchor_spl::token::transfer(cpi_ctx, 1)?;

    // closing escrow
    let should_close = {
        ctx.accounts.escrow.reload()?;
        ctx.accounts.escrow.amount == 0
    };

    if should_close {
        let ca = CloseAccount{
            account: ctx.accounts.escrow.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: auction.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            ca,
            outer.as_slice(),
        );
        anchor_spl::token::close_account(cpi_ctx)?;
    }

    Ok(())
}