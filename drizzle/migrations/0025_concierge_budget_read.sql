-- Read-only budget preflight for the existing server role. No budget activation,
-- counter reset, guest policy or transactional permission is added.
grant select (id, enabled, expires_at, cap_micros, reserved_micros)
  on public.nona_ai_authorization to service_role;
