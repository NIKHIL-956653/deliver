// js/leaderboard-config.js
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS (5 minutes):
//
// 1. Go to https://supabase.com and create a free project
// 2. In the SQL Editor, run:
//
//    create table scores (
//      id bigserial primary key,
//      player_name text not null,
//      score int not null,
//      mode text,
//      grid text,
//      ai_difficulty text,
//      created_at timestamptz default now()
//    );
//    alter table scores enable row level security;
//    create policy "read" on scores for select using (true);
//    create policy "insert" on scores for insert with check (true);
//
// 3. Go to Project Settings → API
//    Copy the "Project URL" and the "anon / public" key below
// 4. Set LEADERBOARD_ENABLED to true
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
export const LEADERBOARD_ENABLED = false; // set to true after configuring above
