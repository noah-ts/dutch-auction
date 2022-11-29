pub mod errors;
pub mod utils;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("5FkPZLtYMt8PZ5r9yb3uTfCFJFb5NkfH9Nt3DXH5P2ha");

#[program]
pub mod dutch_auction {
    use super::*;

    pub fn initialize_auction(ctx: Context<InitializeAuctionPdaCtx>) -> Result<()> {
        initialize_pdas::initialize_auction_handler(ctx)
    }

    pub fn initialize_escrow(ctx: Context<InitializeEscrowPdaCtx>) -> Result<()> {
        initialize_pdas::initialize_escrow_handler(ctx)
    }

    pub fn create_auction(
        ctx: Context<CreateAuctionCtx>,
        starting_timestamp: i64,
        starting_price: f64,
        min_price: f64,
        interval_mins: u8,
        price_change: f64,
    ) -> Result<()> {
        create_auction::handler(
            ctx,
            starting_timestamp,
            starting_price,
            min_price,
            interval_mins,
            price_change,
        )
    }

    pub fn close_auction(ctx: Context<CloseAuctionCtx>) -> Result<()> {
        close_auction::handler(ctx)
    }

    pub fn cancel_auction(ctx: Context<CancelAuctionCtx>) -> Result<()> {
        cancel_auction::handler(ctx)
    }
}