create extension if not exists pgcrypto;

create table if not exists public.profiles(
 owner_id text primary key,
 email text,
 plan text not null default 'free',
 plan_expires_at timestamptz,
 updated_at timestamptz not null default now()
);

create table if not exists public.forms(
 id uuid primary key default gen_random_uuid(),
 owner_id text not null,
 name text not null,
 domain text not null,
 form_key text unique not null,
 active boolean not null default true,
 branding boolean not null default true,
 gmail_enabled boolean not null default true,
 auto_reply boolean not null default false,
 auto_reply_subject text,
 auto_reply_body text,
 email_subject text,
 success_message text default 'Thanks! Your message has been received.',
 success_redirect text,
 notification_email text,
 allowed_origins text[] default '{}',
 webhook_url text,
 webhook_secret text,
 webhook_enabled boolean not null default false,
 capture_utm boolean not null default true,
 duplicate_window_minutes integer not null default 10,
 retention_days integer not null default 0,
 attachment_mode text not null default 'google_drive',
 drive_folder_id text,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.forms add column if not exists sheet_id text;
alter table public.forms add column if not exists sheet_range text default 'Sheet1!A:Z';
alter table public.forms add column if not exists success_redirect text;
alter table public.forms add column if not exists webhook_url text;
alter table public.forms add column if not exists webhook_secret text;
alter table public.forms add column if not exists webhook_enabled boolean not null default false;
alter table public.forms add column if not exists capture_utm boolean not null default true;
alter table public.forms add column if not exists duplicate_window_minutes integer not null default 10;
alter table public.forms add column if not exists retention_days integer not null default 0;
alter table public.forms add column if not exists attachment_mode text not null default 'google_drive';
alter table public.forms add column if not exists drive_folder_id text;
alter table public.forms add column if not exists version integer not null default 1;
alter table public.forms add column if not exists updated_at timestamptz not null default now();
create index if not exists forms_owner_idx on public.forms(owner_id);

create table if not exists public.submissions(
 id uuid primary key default gen_random_uuid(),
 form_id uuid not null references public.forms(id) on delete cascade,
 fields jsonb not null default '{}',
 email text,
 meta jsonb not null default '{}',
 utm jsonb not null default '{}',
 files jsonb not null default '[]',
 is_spam boolean not null default false,
 spam_reason text,
 is_duplicate boolean not null default false,
 duplicate_of uuid,
 delivery_status text not null default 'pending',
 delivery_error text,
 webhook_status text not null default 'disabled',
 lead_status text not null default 'new',
 lead_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.submissions add column if not exists utm jsonb not null default '{}';
alter table public.submissions add column if not exists is_spam boolean not null default false;
alter table public.submissions add column if not exists spam_reason text;
alter table public.submissions add column if not exists is_duplicate boolean not null default false;
alter table public.submissions add column if not exists duplicate_of uuid;
alter table public.submissions add column if not exists delivery_status text not null default 'pending';
alter table public.submissions add column if not exists delivery_error text;
alter table public.submissions add column if not exists webhook_status text not null default 'disabled';
alter table public.submissions add column if not exists lead_status text not null default 'new';
alter table public.submissions add column if not exists lead_note text;
alter table public.submissions add column if not exists updated_at timestamptz not null default now();
create index if not exists submissions_form_created_idx on public.submissions(form_id,created_at desc);
create index if not exists submissions_duplicate_idx on public.submissions(form_id,email,created_at desc);
create index if not exists submissions_status_idx on public.submissions(form_id,is_spam,is_duplicate,created_at desc);
create index if not exists submissions_lead_idx on public.submissions(lead_status,created_at desc);

create table if not exists public.rate_limits(
 id bigint generated always as identity primary key,
 form_id uuid not null references public.forms(id) on delete cascade,
 ip_hash text not null,
 window_at timestamptz not null default now()
);
create index if not exists rate_limits_lookup_idx on public.rate_limits(form_id,ip_hash,window_at);

create table if not exists public.integrations(
 id uuid primary key default gen_random_uuid(),
 owner_id text not null,
 provider text not null,
 google_email text,
 access_token text,
 refresh_token text,
 scope text,
 expires_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(owner_id,provider)
);

create table if not exists public.billing_events(
 id uuid primary key default gen_random_uuid(),
 owner_id text not null,
 reference text unique not null,
 plan text not null,
 provider text not null,
 status text not null default 'pending',
 amount numeric not null,
 currency text not null default 'NGN',
 gateway_data jsonb,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists billing_owner_idx on public.billing_events(owner_id,created_at desc);

create table if not exists public.delivery_jobs(
 id uuid primary key default gen_random_uuid(),
 owner_id text not null,
 submission_id uuid not null references public.submissions(id) on delete cascade,
 kind text not null,
 payload jsonb not null default '{}',
 attempts integer not null default 0,
 status text not null default 'pending',
 next_attempt_at timestamptz not null default now(),
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists delivery_jobs_due_idx on public.delivery_jobs(status,next_attempt_at);

alter table public.profiles add column if not exists plan_expires_at timestamptz;

alter table public.profiles enable row level security;
alter table public.forms enable row level security;
alter table public.submissions enable row level security;
alter table public.rate_limits enable row level security;
alter table public.integrations enable row level security;
alter table public.billing_events enable row level security;
alter table public.delivery_jobs enable row level security;
