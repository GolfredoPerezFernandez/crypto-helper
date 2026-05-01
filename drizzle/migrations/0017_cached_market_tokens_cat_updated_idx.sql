CREATE INDEX IF NOT EXISTS cached_market_tokens_cat_updated
ON cached_market_tokens (category, updatedAt);
