use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Auction is in invalid state")]
    InvalidAuctionState,
    #[msg("Auction did not start yet")]
    AuctionDidNotStart,
    #[msg("Auction did not reach minimum price yet")]
    AuctionDidNotReachMinPrice,
}