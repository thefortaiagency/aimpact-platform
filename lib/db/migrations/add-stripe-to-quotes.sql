-- Add Stripe fields to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS stripe_quote_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_hosted_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ;

-- Add indexes for Stripe IDs
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_quote_id ON quotes(stripe_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_customer_id ON quotes(stripe_customer_id);

-- Add comment
COMMENT ON COLUMN quotes.stripe_quote_id IS 'Stripe Quote ID for payment processing';
COMMENT ON COLUMN quotes.stripe_customer_id IS 'Stripe Customer ID';
COMMENT ON COLUMN quotes.stripe_hosted_url IS 'Stripe hosted quote/invoice URL';
COMMENT ON COLUMN quotes.invoice_id IS 'Stripe Invoice ID when quote is converted';
COMMENT ON COLUMN quotes.accepted_at IS 'Timestamp when quote was accepted';
COMMENT ON COLUMN quotes.finalized_at IS 'Timestamp when quote was finalized';
COMMENT ON COLUMN quotes.canceled_at IS 'Timestamp when quote was canceled';
COMMENT ON COLUMN quotes.paid_at IS 'Timestamp when payment was received';
COMMENT ON COLUMN quotes.payment_failed_at IS 'Timestamp when payment failed';