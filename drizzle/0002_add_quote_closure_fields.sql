-- Add closure fields to quotes table
ALTER TABLE quotes 
ADD COLUMN closed_at TIMESTAMP,
ADD COLUMN closure_notes TEXT,
ADD COLUMN closure_reason TEXT CHECK (closure_reason IN ('accepted', 'price', 'timing', 'competitor', 'no_response', 'other'));

-- Update status enum to include won and lost
ALTER TABLE quotes 
DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes 
ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'rejected', 'won', 'lost'));