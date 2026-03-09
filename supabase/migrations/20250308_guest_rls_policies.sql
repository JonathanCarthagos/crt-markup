-- Fix RLS policies for comments to allow authenticated guests
-- (users listed in site_shares) to view, insert, and update comments.
-- Previously only the site owner could perform these operations.

-- ── SELECT ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view comments of their sites" ON comments;
CREATE POLICY "Users can view comments of their sites"
  ON comments FOR SELECT
  USING (
    -- Site owner sees all comments
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = comments.site_id
        AND sites.created_by = auth.uid()
    )
    -- Invited guest sees all comments
    OR EXISTS (
      SELECT 1 FROM site_shares
      WHERE site_shares.site_id = comments.site_id
        AND site_shares.guest_user_id = auth.uid()
    )
  );

-- ── INSERT ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Owner of the site
      EXISTS (
        SELECT 1 FROM sites
        WHERE sites.id = comments.site_id
          AND sites.created_by = auth.uid()
      )
      -- Invited guest (processSilentJoin must have run first)
      OR EXISTS (
        SELECT 1 FROM site_shares
        WHERE site_shares.site_id = comments.site_id
          AND site_shares.guest_user_id = auth.uid()
      )
    )
  );

-- ── UPDATE ──────────────────────────────────────────────────────────────────
-- Guests can toggle status of their own comments.
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (
    -- Comment author
    created_by = auth.uid()
    -- Site owner (can update any comment)
    OR EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = comments.site_id
        AND sites.created_by = auth.uid()
    )
    -- Invited guest (can update their own comments)
    OR EXISTS (
      SELECT 1 FROM site_shares
      WHERE site_shares.site_id = comments.site_id
        AND site_shares.guest_user_id = auth.uid()
    )
  );
