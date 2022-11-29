// gets current price of nft in sol
// current_timestamp needs to be larger than starting_timestamp
pub fn get_current_price(
    current_timestamp: i64,
    starting_timestamp: i64,
    starting_price: f64,
    min_price: f64,
    interval_mins: u8,
    price_change: f64,
) -> f64 {
    let difference_minutes = (current_timestamp / 60 - starting_timestamp / 60) as u16;
    let number_of_times_price_changed = difference_minutes / interval_mins as u16;
    let price = starting_price - number_of_times_price_changed as f64 * price_change;

    if price < min_price {
        return min_price;
    }
    return price;
}