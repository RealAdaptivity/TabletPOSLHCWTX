-- Rename membership plans Express/Deluxe/Premium -> Good/Better/Best at the
-- source of truth, so the app can drop its per-screen display mapping.
-- Applied to project pbgatghmutejbsmcedsw.
update public.membership_plans
  set name = 'Good',
      wash_tier = 'good',
      description = 'Unlimited exterior washes',
      features = '["Unlimited exterior wash","Spot-free rinse","Power dry"]'::jsonb
  where name = 'Express';

update public.membership_plans
  set name = 'Better',
      wash_tier = 'better',
      description = 'Everything in Good plus wheel & tire shine',
      features = '["Everything in Good","Wheel & tire cleaner","Tire shine","Underbody wash"]'::jsonb
  where name = 'Deluxe';

update public.membership_plans
  set name = 'Best',
      wash_tier = 'best',
      description = 'Top-tier wash with ceramic protection',
      features = '["Everything in Better","Ceramic seal","Rain repellent","Triple foam polish","Hot wax"]'::jsonb
  where name = 'Premium';
