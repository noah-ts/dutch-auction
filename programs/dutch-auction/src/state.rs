use anchor_lang::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum AuctionState {
    // auction is created
    Created = 1,
    // auction is closed, someone bought the nft
    Closed = 2,
    // auction reached minimum price and creator got back his/her nft
    Cancelled = 3,
}

pub const AUCTION_SEED: &str = "auction";
pub const ESCROW_SEED: &str = "escrow";
pub const AUCTION_SIZE: usize = 8 + (3 * 32) + 8 + (4 * 8) + (4 * 1);
#[account]
pub struct Auction {
    // creator of the auction
    pub creator: Pubkey,
    // mint of nft
    pub mint: Pubkey,
    // escrow pda where nft will be stored during auction
    pub escrow: Pubkey,
    // starting date - when auction starts (in timestamp)
    pub starting_timestamp: i64,
    // starting price of nft
    pub starting_price: f64,
    // min price of nft
    pub min_price: f64,
    // bought price - only available when auction_state is closed
    pub bought_price: f64,
    // price_change - decrease price by x sol
    pub price_change: f64,
    // interval - decrease price every x mins
    pub interval_mins: u8,
    // auction state (created, closed, canceled)
    pub auction_state: u8,
    // auction bump
    pub auction_bump: u8,
    // escrow bump
    pub escrow_bump: u8,
}