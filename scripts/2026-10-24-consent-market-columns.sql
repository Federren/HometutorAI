-- parental_consent: market, country and school board
--
-- Run this in the Supabase SQL editor (project aegyrxviddtizkacreuo).
-- Safe to run before or after deploying: the consent route inserts these
-- columns when they exist and falls back to the base row when they don't,
-- so a signup is never lost to migration ordering.
--
-- All three are nullable and additive — no existing row changes, no rewrite.

alter table public.parental_consent
  add column if not exists country     text,   -- derived from the dialling code, e.g. "India"
  add column if not exists market      text,   -- which pilot the signup came through: 'il' | 'in'
  add column if not exists child_board text;   -- India only: CBSE / ICSE / State Board / IB / Other

comment on column public.parental_consent.country     is 'Country derived from the child''s dialling code at signup.';
comment on column public.parental_consent.market      is 'Pilot the consent was signed through: il (/consent) or in (/consent?m=in).';
comment on column public.parental_consent.child_board is 'Indian school board; copied to profiles.stream on enrolment.';

-- Backfill the five existing Israeli consents so reporting is consistent.
update public.parental_consent
   set country = coalesce(country, 'Israel'),
       market  = coalesce(market, 'il')
 where child_whatsapp like '+972%' or child_whatsapp like '972%';

-- Check:
--   select market, country, count(*) from public.parental_consent group by 1,2;
