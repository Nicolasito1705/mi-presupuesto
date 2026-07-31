-- Wipe your own budget data and start from a clean slate.
--
-- Run in the Supabase SQL Editor, replacing the email below with yours.
-- The app cannot do this itself: monthly_closes has no delete policy on
-- purpose, so a closed month is not erasable from the client.
--
-- Categories are left in place (deleting them would cascade nothing useful,
-- and a new account seeds the same four). To reset those too, uncomment the
-- last statement — the seed trigger only runs on signup, so you would have to
-- re-insert them by hand.

do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'tu@correo.com';
  if uid is null then
    raise exception 'no user with that email';
  end if;

  delete from public.transactions   where user_id = uid;
  delete from public.monthly_closes where user_id = uid;
  delete from public.debts          where user_id = uid;
  delete from public.goals          where user_id = uid;
  update public.categories set total = 0 where user_id = uid;

  -- delete from public.categories where user_id = uid;
end $$;
