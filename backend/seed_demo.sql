-- =============================================================
-- WasteWise Demo Seed Data
-- Users (existing): already in DB — referenced by UUID below
--   COLLECTOR : 4dfc31a8 (Ngai), f9f129e1 (test collector2)
--   HOUSEHOLD : d3a53bcb (ngai/0931636), 3ae283b0 (ngai/0931645),
--               73b57bb8 (Test User), f005aa56 (ngai/0933822),
--               7166b229 (test)
--   ADMIN     : 63ee287d
-- =============================================================

-- ── 0. Collector availability ─────────────────────────────────
-- Ngai collector: Mon-Sat, 08:00-17:00
INSERT INTO collector_availability (id, collector_id, day_of_week, start_time, end_time, is_active)
VALUES
  (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 'MON', '08:00', '17:00', true),
  (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 'TUE', '08:00', '17:00', true),
  (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 'WED', '08:00', '17:00', true),
  (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 'THU', '08:00', '17:00', true),
  (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 'FRI', '08:00', '17:00', true),
  (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 'SAT', '08:00', '13:00', true),
-- test collector2: Mon-Fri, 09:00-18:00
  (uuid_generate_v4(), 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 'MON', '09:00', '18:00', true),
  (uuid_generate_v4(), 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 'TUE', '09:00', '18:00', true),
  (uuid_generate_v4(), 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 'WED', '09:00', '18:00', true),
  (uuid_generate_v4(), 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 'THU', '09:00', '18:00', true),
  (uuid_generate_v4(), 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 'FRI', '09:00', '18:00', true)
ON CONFLICT ON CONSTRAINT uq_collector_day_slot DO NOTHING;

-- ── 1. Update collector stats (avg_rating, total_completed) ───
UPDATE users SET avg_rating = 4.50, total_completed = 12
WHERE id = '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e';

UPDATE users SET avg_rating = 4.20, total_completed = 7
WHERE id = 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a';

-- ── 2. Subscription plan id (use existing seeded plan) ────────
-- Grab the Standard Plan id into a variable
DO $$
DECLARE
  plan_id   uuid;
  sub1_id   uuid := uuid_generate_v4();
  sub2_id   uuid := uuid_generate_v4();

  -- job UUIDs
  j1  uuid := uuid_generate_v4();
  j2  uuid := uuid_generate_v4();
  j3  uuid := uuid_generate_v4();
  j4  uuid := uuid_generate_v4();
  j5  uuid := uuid_generate_v4();
  j6  uuid := uuid_generate_v4();
  j7  uuid := uuid_generate_v4();
  j8  uuid := uuid_generate_v4();
  j9  uuid := uuid_generate_v4();
  j10 uuid := uuid_generate_v4();
  j11 uuid := uuid_generate_v4();
  j12 uuid := uuid_generate_v4();

BEGIN
  SELECT id INTO plan_id FROM subscription_plans WHERE name = 'Standard Plan' LIMIT 1;

  -- ── 3. Subscriptions ─────────────────────────────────────────
  -- d3a53bcb: active subscription (1 pickup used this week, 1 remaining)
  INSERT INTO user_subscriptions
    (id, user_id, plan_id, start_date, end_date, remaining_pickups_this_week, week_reset_date, status)
  VALUES
    (sub1_id, 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0', plan_id,
     CURRENT_DATE - INTERVAL '10 days',
     CURRENT_DATE + INTERVAL '20 days',
     1, date_trunc('week', CURRENT_DATE)::date + 7, 'ACTIVE')
  ON CONFLICT DO NOTHING;

  -- 73b57bb8: active subscription (2 remaining — full week, just reset)
  INSERT INTO user_subscriptions
    (id, user_id, plan_id, start_date, end_date, remaining_pickups_this_week, week_reset_date, status)
  VALUES
    (sub2_id, '73b57bb8-a102-44ee-9a2c-6d02b92ac742', plan_id,
     CURRENT_DATE - INTERVAL '5 days',
     CURRENT_DATE + INTERVAL '25 days',
     2, date_trunc('week', CURRENT_DATE)::date + 7, 'ACTIVE')
  ON CONFLICT DO NOTHING;

  -- ── 4. Jobs ──────────────────────────────────────────────────
  -- j1: COMPLETED — d3a53bcb + Ngai collector (subscription, covered)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at, started_at, completed_at, validated_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j1, 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'VALIDATED',
    CURRENT_DATE - INTERVAL '8 days', '09:00',
    'Rue Joss, Bonanjo, Douala', 4.04700, 9.70200,
    'Pickup type: One-time pickup',
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '1 hour',
    NOW() - INTERVAL '8 days' + INTERVAL '2 hours', NOW() - INTERVAL '8 days' + INTERVAL '3 hours',
    0.00, 'SUBSCRIPTION', true, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days');

  -- j2: COMPLETED — d3a53bcb + Ngai collector (pay-per-pickup, subscription exhausted at time)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at, started_at, completed_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j2, 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'COMPLETED',
    CURRENT_DATE - INTERVAL '6 days', '10:30',
    'Rue Joss, Bonanjo, Douala', 4.04700, 9.70200,
    'Pickup type: Weekly pickup',
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '1 hour',
    NOW() - INTERVAL '6 days' + INTERVAL '2 hours',
    1000.00, 'PAY_PER_PICKUP', false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

  -- j3: COMPLETED — 73b57bb8 + test collector2 (subscription covered)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at, started_at, completed_at, validated_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j3, '73b57bb8-a102-44ee-9a2c-6d02b92ac742', 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a',
    'VALIDATED',
    CURRENT_DATE - INTERVAL '4 days', '08:30',
    'Bonapriso, Douala', 4.05500, 9.69800,
    'Pickup type: Weekly pickup',
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '30 minutes',
    NOW() - INTERVAL '4 days' + INTERVAL '1 hour', NOW() - INTERVAL '4 days' + INTERVAL '2 hours',
    0.00, 'SUBSCRIPTION', true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');

  -- j4: COMPLETED — f005aa56 + Ngai collector (pay-per-pickup, no subscription)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at, started_at, completed_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j4, 'f005aa56-d1ec-467e-87bc-7ec1e6003d10', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'COMPLETED',
    CURRENT_DATE - INTERVAL '5 days', '14:00',
    'Akwa, Douala', 4.04200, 9.69500,
    'Pickup type: One-time pickup',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '1 hour',
    NOW() - INTERVAL '5 days' + INTERVAL '2 hours',
    1000.00, 'PAY_PER_PICKUP', false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

  -- j5: COMPLETED — 7166b229 + test collector2 (pay-per-pickup)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at, started_at, completed_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j5, '7166b229-5f5c-4110-b4f3-0c29edbc11db', 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a',
    'COMPLETED',
    CURRENT_DATE - INTERVAL '3 days', '11:00',
    'Bali, Douala', 4.06000, 9.70500,
    'Pickup type: One-time pickup',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes',
    NOW() - INTERVAL '3 days' + INTERVAL '1 hour 30 minutes',
    1000.00, 'PAY_PER_PICKUP', false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

  -- j6: IN_PROGRESS — 3ae283b0 + Ngai collector (subscription covered, active now)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at, started_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j6, '3ae283b0-328b-46f8-9510-fb28386f3865', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'IN_PROGRESS',
    CURRENT_DATE, '09:00',
    'Makepe, Douala', 4.07200, 9.73400,
    'Pickup type: Weekly pickup',
    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes',
    1000.00, 'PAY_PER_PICKUP', false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes');

  -- j7: ASSIGNED — d3a53bcb + Ngai collector (upcoming, subscription will cover it)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    assigned_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j7, 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'ASSIGNED',
    CURRENT_DATE + INTERVAL '1 day', '10:00',
    'Rue Joss, Bonanjo, Douala', 4.04700, 9.70200,
    'Pickup type: One-time pickup',
    NOW() - INTERVAL '1 hour',
    0.00, 'SUBSCRIPTION', true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour');

  -- j8: REQUESTED — f005aa56 (unassigned, pay-per-pickup)
  INSERT INTO jobs (id, household_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng, notes,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j8, 'f005aa56-d1ec-467e-87bc-7ec1e6003d10',
    'REQUESTED',
    CURRENT_DATE + INTERVAL '2 days', '11:00',
    'Akwa, Douala', 4.04200, 9.69500,
    'Pickup type: One-time pickup',
    1000.00, 'PAY_PER_PICKUP', false, NOW(), NOW());

  -- j9: CANCELLED — 7166b229 (cancelled by household)
  INSERT INTO jobs (id, household_id, status, scheduled_date, scheduled_time,
    location_address, notes,
    cancelled_at, cancellation_reason,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j9, '7166b229-5f5c-4110-b4f3-0c29edbc11db',
    'CANCELLED',
    CURRENT_DATE - INTERVAL '2 days', '15:00',
    'Bali, Douala', 'Pickup type: One-time pickup',
    NOW() - INTERVAL '2 days' + INTERVAL '1 hour', 'Rescheduling needed',
    1000.00, 'PAY_PER_PICKUP', false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

  -- j10: DISPUTED — d3a53bcb (older job, collector didn't show)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, notes,
    assigned_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j10, 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'DISPUTED',
    CURRENT_DATE - INTERVAL '12 days', '09:00',
    'Bonanjo, Douala', 'Pickup type: One-time pickup',
    NOW() - INTERVAL '12 days',
    0.00, 'SUBSCRIPTION', true, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');

  -- j11: VALIDATED — 73b57bb8 + Ngai collector (older, to bulk up collector stats)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng,
    assigned_at, started_at, completed_at, validated_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j11, '73b57bb8-a102-44ee-9a2c-6d02b92ac742', '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
    'VALIDATED',
    CURRENT_DATE - INTERVAL '15 days', '08:00',
    'Bonapriso, Douala', 4.05500, 9.69800,
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '1 hour',
    NOW() - INTERVAL '15 days' + INTERVAL '2 hours', NOW() - INTERVAL '15 days' + INTERVAL '3 hours',
    0.00, 'SUBSCRIPTION', true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

  -- j12: RATED — f005aa56 + test collector2 (older completed + rated)
  INSERT INTO jobs (id, household_id, collector_id, status, scheduled_date, scheduled_time,
    location_address, location_lat, location_lng,
    assigned_at, started_at, completed_at, validated_at,
    quoted_price, pricing_type, is_covered_by_subscription, created_at, updated_at)
  VALUES (j12, 'f005aa56-d1ec-467e-87bc-7ec1e6003d10', 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a',
    'RATED',
    CURRENT_DATE - INTERVAL '10 days', '13:00',
    'Akwa, Douala', 4.04200, 9.69500,
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '1 hour',
    NOW() - INTERVAL '10 days' + INTERVAL '2 hours', NOW() - INTERVAL '10 days' + INTERVAL '3 hours',
    1000.00, 'PAY_PER_PICKUP', false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');

  -- ── 5. Earnings ───────────────────────────────────────────────
  -- Ngai collector earnings (for j1 VALIDATED, j3, j4, j11)
  INSERT INTO earnings (id, job_id, collector_id, base_amount, distance_amount, surge_multiplier, total_amount, status, confirmed_at)
  VALUES
    (uuid_generate_v4(), j1,  '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 700, 100, 1.0, 800,  'CONFIRMED', NOW() - INTERVAL '8 days'),
    (uuid_generate_v4(), j2,  '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 700, 100, 1.0, 800,  'CONFIRMED', NOW() - INTERVAL '6 days'),
    (uuid_generate_v4(), j4,  '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 700, 100, 1.0, 800,  'PENDING',   NULL),
    (uuid_generate_v4(), j11, '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 700, 150, 1.0, 850,  'PAID',      NOW() - INTERVAL '14 days'),
    -- test collector2 earnings (j3, j5, j12)
    (uuid_generate_v4(), j3,  'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 700, 100, 1.0, 800,  'CONFIRMED', NOW() - INTERVAL '4 days'),
    (uuid_generate_v4(), j5,  'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 700,   0, 1.0, 700,  'PENDING',   NULL),
    (uuid_generate_v4(), j12, 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 700, 100, 1.0, 800,  'PAID',      NOW() - INTERVAL '10 days')
  ON CONFLICT ON CONSTRAINT "UQ_e4febb6bc033b50c54fe528ecdf" DO NOTHING;

  -- ── 6. Ratings ────────────────────────────────────────────────
  -- j1: household d3a53bcb rates Ngai collector 5 stars
  INSERT INTO ratings (id, job_id, household_id, collector_id, value, comment, created_at)
  VALUES
    (uuid_generate_v4(), j1, 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0',
     '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 5, 'On time and very professional!', NOW() - INTERVAL '8 days'),
    (uuid_generate_v4(), j3, '73b57bb8-a102-44ee-9a2c-6d02b92ac742',
     'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 4, 'Good service, arrived a bit late.', NOW() - INTERVAL '4 days'),
    (uuid_generate_v4(), j11, '73b57bb8-a102-44ee-9a2c-6d02b92ac742',
     '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e', 5, 'Perfect as always.', NOW() - INTERVAL '15 days'),
    (uuid_generate_v4(), j12, 'f005aa56-d1ec-467e-87bc-7ec1e6003d10',
     'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a', 4, 'Clean job done quickly.', NOW() - INTERVAL '10 days')
  ON CONFLICT ON CONSTRAINT "UQ_77e54384258e12a34faa920196d" DO NOTHING;

  -- ── 7. Dispute ───────────────────────────────────────────────
  INSERT INTO disputes (id, job_id, household_id, reason, status, created_at)
  VALUES (
    uuid_generate_v4(), j10,
    'd3a53bcb-bcd4-432a-975f-a50fe0691fc0',
    'Collector did not arrive at the scheduled time. Waste was left uncollected.',
    'OPEN',
    NOW() - INTERVAL '11 days'
  ) ON CONFLICT ON CONSTRAINT "UQ_8b8bfb0d30ce224ca34787db375" DO NOTHING;

  -- ── 8. Fraud flag ────────────────────────────────────────────
  INSERT INTO fraud_flags (id, job_id, collector_id, type, severity, details, status, created_at)
  VALUES (
    uuid_generate_v4(), j5,
    'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a',
    'FAST_COMPLETION',
    'LOW',
    '{"completionMinutes": 12, "expectedMinutes": 45}'::jsonb,
    'OPEN',
    NOW() - INTERVAL '3 days'
  ) ON CONFLICT DO NOTHING;

  -- ── 9. Notifications ─────────────────────────────────────────
  INSERT INTO notifications (id, user_id, type, title, body, data, channel, status, sent_at, created_at)
  VALUES
    -- household d3a53bcb: subscription expiry warning
    (uuid_generate_v4(), 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0',
     'SUBSCRIPTION_EXPIRY', 'Subscription Expiring Soon',
     'Your subscription expires in 20 days. Renew to keep saving!',
     '{"daysLeft": 20}'::jsonb, 'IN_APP', 'READ', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    -- household d3a53bcb: job assigned
    (uuid_generate_v4(), 'd3a53bcb-bcd4-432a-975f-a50fe0691fc0',
     'JOB_ASSIGNED', 'Collector On the Way',
     'Your pickup has been assigned to Ngai. Expect arrival at 10:00.',
     jsonb_build_object('jobId', j7), 'IN_APP', 'SENT', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
    -- collector Ngai: new job assigned
    (uuid_generate_v4(), '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e',
     'JOB_ASSIGNED', 'New Job Assigned',
     'You have a new pickup scheduled tomorrow at 10:00 in Bonanjo.',
     jsonb_build_object('jobId', j7), 'IN_APP', 'SENT', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
    -- household 73b57bb8: subscription welcome
    (uuid_generate_v4(), '73b57bb8-a102-44ee-9a2c-6d02b92ac742',
     'SUBSCRIPTION_ACTIVE', 'Subscription Activated!',
     'Welcome to Standard Plan. Enjoy 2 pickups per week.',
     '{"planName": "Standard Plan"}'::jsonb, 'IN_APP', 'READ', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    -- collector test2: earnings ready
    (uuid_generate_v4(), 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a',
     'EARNINGS_CONFIRMED', 'Earnings Confirmed',
     'Your earnings of 800 XAF for the recent pickup have been confirmed.',
     '{"amount": 800}'::jsonb, 'IN_APP', 'READ', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');

  -- ── 10. Update collector total_completed ──────────────────────
  UPDATE users SET total_completed = 12, avg_rating = 4.83
  WHERE id = '4dfc31a8-dca3-45ce-aeb6-648f1faf3c4e';

  UPDATE users SET total_completed = 7, avg_rating = 4.20
  WHERE id = 'f9f129e1-8b2b-499d-825a-b2f7aeb10e4a';

END $$;
