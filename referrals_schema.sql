-- Drop existing tables if they exist
drop table if exists referrals;
drop table if exists referral_codes;

-- Create referral codes table
create table referral_codes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references intern_profiles(user_id) on delete cascade,
    code text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_user_code unique (user_id)
);

-- Create referrals table
create table referrals (
    id uuid default gen_random_uuid() primary key,
    referrer_id uuid not null references intern_profiles(user_id) on delete cascade,
    referred_user_id uuid not null references intern_profiles(user_id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'completed')),
    completed_task_count integer not null default 0,
    points_awarded boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_referral unique (referred_user_id)
);

-- Enable RLS
alter table referral_codes enable row level security;
alter table referrals enable row level security;

-- Referral codes policies
create policy "Users can view their own referral code"
    on referral_codes for select
    to authenticated
    using (auth.uid() in (
        select user_id from intern_profiles where user_id = referral_codes.user_id
    ));

create policy "Users can create their own referral code"
    on referral_codes for insert
    to authenticated
    with check (auth.uid() in (
        select user_id from intern_profiles where user_id = referral_codes.user_id
    ));

-- Referrals policies
create policy "Users can view referrals they made"
    on referrals for select
    to authenticated
    using (auth.uid() in (
        select user_id from intern_profiles where user_id = referrals.referrer_id
    ));

create policy "System can create referrals"
    on referrals for insert
    to authenticated
    with check (true);

-- Add updated_at trigger for referrals
create trigger update_referrals_updated_at
    before update on referrals
    for each row
    execute function update_updated_at_column(); 