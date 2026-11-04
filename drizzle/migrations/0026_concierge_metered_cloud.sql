-- Prepared only. No environment, TEST authorization or monthly spend is enabled.
-- Existing 4 EUR TEST ledger and its cumulative counter remain unchanged.
create table public.nona_cloud_policy (
  id text primary key check(id='monthly'),
  enabled boolean not null default false,
  approved_until timestamptz not null default now(),
  monthly_cap_micros integer not null default 20000000 check(monthly_cap_micros between 0 and 20000000),
  property_daily_calls integer not null default 100 check(property_daily_calls between 1 and 1000),
  organization_daily_calls integer not null default 500 check(organization_daily_calls between 1 and 10000),
  visitor_daily_calls integer not null default 30 check(visitor_daily_calls between 1 and 100),
  conversation_calls integer not null default 20 check(conversation_calls between 1 and 50)
);
insert into public.nona_cloud_policy(id) values('monthly');
create table public.nona_cloud_month (
  month_start date primary key,
  reserved_micros integer not null default 0 check(reserved_micros>=0)
);
create table public.nona_cloud_usage (
  request_id uuid primary key,
  organization_id uuid not null,
  property_id uuid not null,
  conversation_hash text not null check(conversation_hash ~ '^[a-f0-9]{64}$'),
  visitor_hash text not null check(visitor_hash ~ '^[a-f0-9]{64}$'),
  network_hash text not null check(network_hash ~ '^[a-f0-9]{64}$'),
  reserved_micros integer not null default 20000 check(reserved_micros=20000),
  created_at timestamptz not null default now()
);
create index nona_cloud_usage_property_time on public.nona_cloud_usage(property_id,created_at);
create index nona_cloud_usage_org_time on public.nona_cloud_usage(organization_id,created_at);
create index nona_cloud_usage_visitor_time on public.nona_cloud_usage(visitor_hash,created_at);
create index nona_cloud_usage_network_time on public.nona_cloud_usage(network_hash,created_at);
create index nona_cloud_usage_conversation on public.nona_cloud_usage(conversation_hash);

-- Append-only metadata, shared by TEST and monthly. No prompt, reply, contact,
-- receipt, IP address, password, service draft or guest identity is stored.
create table public.nona_model_observation (
  request_id uuid primary key,
  scope text not null check(scope in ('test','monthly')),
  state text not null check(state in ('measured','estimated','uncertain')),
  input_tokens integer check(input_tokens>=0), output_tokens integer check(output_tokens>=0),
  usd_nanos bigint check(usd_nanos>=0), eur_micros integer check(eur_micros>=0),
  generation_id text check(length(generation_id)<=160), latency_ms integer not null check(latency_ms between 0 and 120000),
  created_at timestamptz not null default now()
);
alter table public.nona_cloud_policy enable row level security;
alter table public.nona_cloud_month enable row level security;
alter table public.nona_cloud_usage enable row level security;
alter table public.nona_model_observation enable row level security;
revoke all on public.nona_cloud_policy, public.nona_cloud_month, public.nona_cloud_usage,
  public.nona_model_observation from public, anon, authenticated, service_role;
grant select on public.nona_cloud_policy, public.nona_cloud_month to service_role;
grant select (request_id) on public.nona_model_observation to service_role;

create function public.nona_reserve_cloud_attempt(_property uuid,_request uuid,_conversation_hash text,_visitor_hash text,_network_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare policy public.nona_cloud_policy; org uuid; month_key date := date_trunc('month',now() at time zone 'UTC')::date;
begin
  -- Same global lock on every instance, covering all counters and duplicate IDs.
  select * into policy from public.nona_cloud_policy where id='monthly' for update;
  if not found or not policy.enabled or policy.approved_until<=now() then return false; end if;
  if _request is null or _property is null or _conversation_hash is null or _visitor_hash is null or _network_hash is null
    or _conversation_hash !~ '^[a-f0-9]{64}$' or _visitor_hash !~ '^[a-f0-9]{64}$' or _network_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  select organization_id into org from public.properties where id=_property and status='published';
  if org is null or exists(select 1 from public.nona_cloud_usage where request_id=_request) then return false; end if;
  insert into public.nona_cloud_month(month_start) values(month_key) on conflict do nothing;
  if (select reserved_micros from public.nona_cloud_month where month_start=month_key)+20000>policy.monthly_cap_micros then return false; end if;
  if (select count(*) from public.nona_cloud_usage where property_id=_property and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=policy.property_daily_calls then return false; end if;
  if (select count(*) from public.nona_cloud_usage where organization_id=org and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=policy.organization_daily_calls then return false; end if;
  if (select count(*) from public.nona_cloud_usage where visitor_hash=_visitor_hash and created_at>now()-interval '24 hours')>=policy.visitor_daily_calls then return false; end if;
  if (select count(*) from public.nona_cloud_usage where conversation_hash=_conversation_hash)>=policy.conversation_calls then return false; end if;
  if (select count(*) from public.nona_cloud_usage where network_hash=_network_hash and created_at>now()-interval '5 minutes')>=10 then return false; end if;
  update public.nona_cloud_month set reserved_micros=reserved_micros+20000 where month_start=month_key;
  insert into public.nona_cloud_usage(request_id,organization_id,property_id,conversation_hash,visitor_hash,network_hash)
    values(_request,org,_property,_conversation_hash,_visitor_hash,_network_hash);
  return true;
end $$;

create function public.nona_record_model_observation(_request uuid,_scope text,_state text,_input integer,_output integer,
  _usd_nanos bigint,_eur_micros integer,_generation text,_latency integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare reserved_at timestamptz; inserted integer;
begin
  if _request is null or _scope is null or _state is null or _latency is null then return false; end if;
  if _scope='test' then
    if not exists(select 1 from public.nona_ai_usage where request_id=_request) then return false; end if;
  elsif _scope='monthly' then
    -- Same lock order as reservation. The month being settled is the request's
    -- original UTC month, even when a response crosses a month boundary.
    perform 1 from public.nona_cloud_policy where id='monthly' for update;
    select created_at into reserved_at from public.nona_cloud_usage where request_id=_request;
    if not found then return false; end if;
  else return false; end if;
  insert into public.nona_model_observation(request_id,scope,state,input_tokens,output_tokens,usd_nanos,eur_micros,generation_id,latency_ms)
    values(_request,_scope,_state,_input,_output,_usd_nanos,_eur_micros,_generation,_latency) on conflict do nothing;
  get diagnostics inserted=row_count;
  -- TEST never releases a reservation. Monthly releases only unused headroom
  -- after a provider-billed amount is confirmed, ONCE. Estimates and unknown
  -- usage keep the entire hold. No new request is made to get a missing bill.
  if inserted=1 and _scope='monthly' and _state='measured' and _eur_micros between 0 and 20000
      and _usd_nanos is not null and _input is not null and _output is not null then
    update public.nona_cloud_month set reserved_micros=reserved_micros-(20000-_eur_micros)
      where month_start=date_trunc('month',reserved_at at time zone 'UTC')::date;
  end if;
  if _eur_micros>20000 then
    if _scope='monthly' then update public.nona_cloud_policy set enabled=false where id='monthly';
    else update public.nona_ai_authorization set enabled=false where id='concierge-test-20261015'; end if;
  end if;
  return true;
end $$;
revoke all on function public.nona_reserve_cloud_attempt(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.nona_record_model_observation(uuid,text,text,integer,integer,bigint,integer,text,integer) from public,anon,authenticated;
grant execute on function public.nona_reserve_cloud_attempt(uuid,uuid,text,text,text) to service_role;
grant execute on function public.nona_record_model_observation(uuid,text,text,integer,integer,bigint,integer,text,integer) to service_role;
