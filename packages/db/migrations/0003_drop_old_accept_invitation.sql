-- =============================================================================================
-- Garnet migration 0003: one way to join a relationship (P-78 review of B1).
--
-- 0001's accept_invitation() is replaced by 0002's join_with_invitation(), which also refuses
-- someone already paired and tidies up the joiner's own unpaired relationship. Nothing calls the
-- old function, but the app role could still execute it, which left a second, weaker path in.
-- =============================================================================================

drop function accept_invitation(bytea);
