-- Additive concierge only. Prepared for isolated TEST; never auto-activated.
-- No conversations, names, receipts or contact data in this ledger.
create table public.nona_ai_authorization (
  id text primary key check (id = 'concierge-test-20261015'),
  enabled boolean not null default false,
  expires_at timestamptz not null default now(),
  cap_micros integer not null default 4000000 check (cap_micros between 0 and 4000000),
  reserved_micros integer not null default 0 check (reserved_micros >= 0)
);
insert into public.nona_ai_authorization(id) values ('concierge-test-20261015');
create table public.nona_ai_usage (
  request_id uuid primary key,
  organization_id uuid not null,
  property_id uuid not null,
  conversation_hash text not null,
  fingerprint text not null,
  reserved_micros integer not null check (reserved_micros = 20000),
  created_at timestamptz not null default now()
);
create index nona_ai_usage_org_time on public.nona_ai_usage(organization_id, created_at);
alter table public.nona_ai_authorization enable row level security;
alter table public.nona_ai_usage enable row level security;
revoke all on public.nona_ai_authorization, public.nona_ai_usage from public, anon, authenticated;

create function public.nona_reserve_concierge_attempt(_property uuid, _request uuid, _conversation_hash text, _fingerprint text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare auth public.nona_ai_authorization; org uuid;
begin
  -- One global row lock covers authorization, cumulative cap, all quotas and
  -- duplicate detection, including simultaneous requests on separate servers.
  select * into auth from public.nona_ai_authorization where id='concierge-test-20261015' for update;
  if not found or not auth.enabled or auth.expires_at <= now() or auth.reserved_micros+20000 > auth.cap_micros then return false; end if;
  if _conversation_hash !~ '^[a-f0-9]{64}$' or _fingerprint !~ '^[a-f0-9]{64}$' then return false; end if;
  select organization_id into org from public.properties where id=_property and status='published';
  if org is null or exists(select 1 from public.nona_ai_usage where request_id=_request) then return false; end if;
  if (select count(*) from public.nona_ai_usage where organization_id=org and created_at>=date_trunc('day',now())) >=100 then return false; end if;
  if (select count(*) from public.nona_ai_usage where property_id=_property and created_at>=date_trunc('day',now())) >=30 then return false; end if;
  if (select count(*) from public.nona_ai_usage where conversation_hash=_conversation_hash and created_at>=date_trunc('day',now())) >=20 then return false; end if;
  if (select count(*) from public.nona_ai_usage where fingerprint=_fingerprint and created_at>now()-interval '5 minutes') >=10 then return false; end if;
  update public.nona_ai_authorization set reserved_micros=reserved_micros+20000 where id=auth.id;
  insert into public.nona_ai_usage values(_request,org,_property,_conversation_hash,_fingerprint,20000,now());
  -- Reservations are never refunded, including timeouts/unknown usage. Global
  -- cumulative amount is retained even after metadata expiry.
  delete from public.nona_ai_usage where created_at<now()-interval '30 days';
  return true;
end $$;
revoke all on function public.nona_reserve_concierge_attempt(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.nona_reserve_concierge_attempt(uuid,uuid,text,text) to service_role;
