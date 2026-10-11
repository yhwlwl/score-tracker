const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  await db.exec(`
    create table public.score_tracker_users (
      id uuid primary key, username text, original_username text,
      created_at timestamptz default now(), is_admin boolean default false
    );
    create table public.score_tracker_recovery_tickets (
      id uuid primary key, username_hint text, evidence jsonb
    );
    create table public.score_tracker_exams (
      id uuid primary key, user_id uuid, name text, exam_date date,
      total_actual_score numeric, total_raw_score numeric, total_rank integer
    );
    create table public.score_tracker_scores (
      exam_id uuid, user_id uuid, subject text, actual_score numeric,
      raw_score numeric, exclude_from_total boolean default false, rank_position integer
    );
    create table public.score_tracker_setup_profiles (user_id uuid, school jsonb);
    insert into public.score_tracker_users (id, username, original_username, is_admin) values
      ('00000000-0000-0000-0000-000000000001', 'TargetUser', '旧用户名', false),
      ('00000000-0000-0000-0000-000000000002', 'unrelated', null, false),
      ('00000000-0000-0000-0000-000000000003', 'target-admin', null, true),
      ('00000000-0000-0000-0000-000000000004', 'score-owner', null, false),
      ('00000000-0000-0000-0000-000000000005', 'literal_%_name', null, false),
      ('00000000-0000-0000-0000-000000000006', '111', null, false);
    insert into public.score_tracker_recovery_tickets values
      ('10000000-0000-0000-0000-000000000001', 'misremembered',
       '{"exam_name":"incorrect exam","school":"incorrect school","subject":"数学","score":"999"}');
    insert into public.score_tracker_exams values
      ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
       '真实考试', '2026-09-01', 345.5, 340, 10);
    insert into public.score_tracker_scores values
      ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
       '英语', 111.5, 110, false, 10);
  `);
  const ticket = '10000000-0000-0000-0000-000000000001';
  const find = async (query, id = ticket) => (await db.query(
    'select public.score_tracker_recovery_candidates($1::uuid,$2) as candidates', [id, query]
  )).rows[0].candidates;
  const previous = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261006144214_recovery_matching_and_claim_username.sql'), 'utf8');
  await db.exec(previous.slice(previous.indexOf('create function public.score_tracker_recovery_candidates'), previous.indexOf('$$;') + 3));
  assert.deepEqual(await find('targetuser'), [], 'reproduce dropped manual username search');
  await db.exec(fs.readFileSync(process.argv[2] || path.join(__dirname, '../supabase/migrations/20261008162714_recovery_username_search.sql'), 'utf8'));
  for (const query of ['targetuser', ' TARGETUSER ', 'target', '旧用户名', '旧用']) {
    const rows = await find(query);
    assert.equal(rows.length, 1, query);
    assert.equal(rows[0].username, 'TargetUser', query);
    assert.equal(rows[0].query_username_match, true);
    assert.equal(rows[0].username_match, false, 'manual search is not ownership evidence');
    assert.equal(rows[0].strength, 0, 'manual search does not increase evidence strength');
  }
  assert.deepEqual(await find(''), [], 'empty query preserves evidence matching');
  assert.deepEqual(await find('missing'), []);
  assert.deepEqual(await find('target-admin'), [], 'admin accounts excluded');
  assert.deepEqual(await find('%_'), [ ...(await find('literal_%_name')) ], 'wildcards are literal');
  assert.equal((await find('111'))[0].username, '111', 'numeric username remains searchable');
  assert.equal((await find('111.5'))[0].username, 'score-owner', 'subject score search preserved');
  assert.equal((await find('345.5'))[0].username, 'score-owner', 'total score search preserved');
  assert.deepEqual(await find('target', '10000000-0000-0000-0000-000000000099'), [], 'missing ticket');
  await db.query('update public.score_tracker_recovery_tickets set username_hint=$1, evidence=$2::jsonb where id=$3::uuid',
    ['TargetUser', '{}', ticket]);
  assert.equal((await find(''))[0].username_match, true, 'automatic hint matching preserved');
  await db.query('update public.score_tracker_recovery_tickets set username_hint=$1, evidence=$2::jsonb where id=$3::uuid',
    ['', '{"exam_name":"真实考试"}', ticket]);
  assert.equal((await find(''))[0].exam_match, true, 'automatic exam matching preserved');
  await db.close();
  console.log('Recovery username search regression checks passed');
})().catch(error => { console.error(error); process.exit(1); });
