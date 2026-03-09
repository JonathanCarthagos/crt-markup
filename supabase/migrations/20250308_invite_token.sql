-- invite_token para links de convite (Progressive Disclosure)
ALTER TABLE site_shares ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_site_shares_invite_token ON site_shares(invite_token);
