-- ApolloEMS CE Patch 009
-- Permit Russ Richardson to be stored as the issuing instructor.

alter table public.ce_classes
  drop constraint if exists ce_classes_instructor_key_check;

alter table public.ce_classes
  add constraint ce_classes_instructor_key_check
  check (instructor_key in ('jose', 'heather', 'russ'));
