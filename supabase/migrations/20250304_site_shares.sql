-- Migration: Guest Access / Site Shares
-- Run in Supabase SQL editor.

-- ─────────────────────────────────────────
-- 1. Tabela site_shares
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  guest_email TEXT NOT NULL,
  guest_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE (site_id, guest_email)
);

CREATE INDEX IF NOT EXISTS idx_site_shares_site_id ON site_shares(site_id);
CREATE INDEX IF NOT EXISTS idx_site_shares_guest_user_id ON site_shares(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_site_shares_guest_email ON site_shares(guest_email);

-- ─────────────────────────────────────────
-- 2. Trigger: vincula guest_user_id automaticamente quando
--    um usuário se cadastra com o e-mail já convidado
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION link_guest_to_shares()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE site_shares
  SET guest_user_id = NEW.id
  WHERE guest_email = NEW.email
    AND guest_user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_guest ON auth.users;
CREATE TRIGGER on_auth_user_created_link_guest
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_guest_to_shares();

-- ─────────────────────────────────────────
-- 3. RLS em site_shares
-- ─────────────────────────────────────────
ALTER TABLE site_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages shares" ON site_shares;
CREATE POLICY "Owner manages shares" ON site_shares
  FOR ALL
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS "Guest can see own share" ON site_shares;
CREATE POLICY "Guest can see own share" ON site_shares
  FOR SELECT
  USING (guest_user_id = auth.uid());

-- ─────────────────────────────────────────
-- 4. RLS atualizado em sites
--    SELECT: dono OU guest
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own sites" ON sites;
CREATE POLICY "Users can view their own sites" ON sites
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM site_shares
      WHERE site_shares.site_id = sites.id
        AND site_shares.guest_user_id = auth.uid()
    )
  );

-- INSERT, UPDATE e DELETE em sites permanecem restritos ao dono (sem alteração)

-- ─────────────────────────────────────────
-- 5. RLS atualizado em comments
-- ─────────────────────────────────────────

-- Helper inline: usuário é dono OU guest do site
-- Usado em múltiplas políticas abaixo

DROP POLICY IF EXISTS "Users can view comments of their sites" ON comments;
CREATE POLICY "Users can view comments of their sites" ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = comments.site_id
        AND (
          sites.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM site_shares
            WHERE site_shares.site_id = sites.id
              AND site_shares.guest_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = comments.site_id
        AND (
          sites.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM site_shares
            WHERE site_shares.site_id = sites.id
              AND site_shares.guest_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = comments.site_id
        AND (
          sites.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM site_shares
            WHERE site_shares.site_id = sites.id
              AND site_shares.guest_user_id = auth.uid()
          )
        )
    )
  );

-- DELETE em comments: apenas o autor do comentário OU o dono do site (guests NÃO deletam)
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = comments.site_id
        AND sites.created_by = auth.uid()
    )
  );
