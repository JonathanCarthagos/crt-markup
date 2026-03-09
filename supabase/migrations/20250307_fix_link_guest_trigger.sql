-- Fix: trigger link_guest_to_shares causava "Database error saving new user"
-- 1. Comparação case-insensitive de email (guest_email vs auth.users.email)
-- 2. EXCEPTION para não falhar o signup se o UPDATE tiver problema

CREATE OR REPLACE FUNCTION link_guest_to_shares()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE site_shares
  SET guest_user_id = NEW.id
  WHERE LOWER(guest_email) = LOWER(NEW.email)
    AND guest_user_id IS NULL;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Não falhar o signup; o vínculo pode ser feito depois
    RETURN NEW;
END;
$$;
