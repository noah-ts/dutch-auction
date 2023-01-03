use {
    crate::{errors::ErrorCode, state::*, utils::get_current_price},
    anchor_lang::prelude::*,
    anchor_spl::{token::{Mint, Token, TokenAccount, Transfer, CloseAccount}},
    solana_program,
};

#[derive(Accounts)]
pub struct CloseAuctionCtx<'info> {
    #[account(mut)]
    buyer: Signer<'info>,

    #[account(
        mut,
        constraint=buyer_ata.owner == buyer.key(),
        constraint=buyer_ata.mint == mint.key()
    )]
    buyer_ata: Account<'info, TokenAccount>,

    /// CHECK: only adding sol to this account, not withdrawing anything
    #[account(
        mut,
        constraint=auction.creator == creator.key(),
    )]
    creator: AccountInfo<'info>,

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

    /// CHECK: only adding sol to this account, not withdrawing anything
    #[account(
        mut,
    )]
    dev: AccountInfo<'info>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CloseAuctionCtx>) -> Result<()> {
    let current_clock = solana_program::clock::Clock::get().unwrap();
    let current_timestamp = current_clock.unix_timestamp;
    if current_timestamp < ctx.accounts.auction.starting_timestamp {
        return Err(error!(ErrorCode::AuctionDidNotStart));
    }

    let auction = &mut ctx.accounts.auction;
    auction.auction_state = AuctionState::Closed as u8;

    // transferring nft from escrow to buyer
    let bump_vector = &[auction.auction_bump][..];
    let inner = vec![
        AUCTION_SEED.as_bytes(),
        auction.mint.as_ref(),
        bump_vector.as_ref(),
    ];
    let outer = vec![inner.as_slice()];

    let transfer_instruction = Transfer{
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.buyer_ata.to_account_info(),
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

    // get current price
    let price = get_current_price(
        current_timestamp,
        auction.starting_timestamp,
        auction.starting_price,
        auction.min_price,
        auction.interval_mins,
        auction.price_change
    );

    // transferring sol from buyer to creator (95% to the seller)
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.creator.key(),
            solana_program::native_token::sol_to_lamports(price * 0.95),
        ),
        &[
            ctx.accounts.buyer.to_account_info().clone(),
            ctx.accounts.creator.to_account_info().clone(),
        ]
    )?;

    // transferring sol from buyer to developer (5% fee)
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.dev.key(),
            solana_program::native_token::sol_to_lamports(price * 0.05),
        ),
        &[
            ctx.accounts.buyer.to_account_info().clone(),
            ctx.accounts.dev.to_account_info().clone(),
        ]
    )?;

    auction.bought_price = price;

    Ok(())
}