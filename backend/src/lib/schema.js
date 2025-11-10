const { pool } = require('./db')

const IMPORTANCE_VALUES = ['critical', 'important', 'informational']

const IMPORTANCE_ARRAY_SQL = IMPORTANCE_VALUES.map(value => `'${value}'`).join(', ')

async function ensureNewsTable() {
  await pool.query('create extension if not exists "pgcrypto"')
  await pool.query(`
    create table if not exists news (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      summary text not null,
      importance text not null check (importance = any (ARRAY[${IMPORTANCE_ARRAY_SQL}]::text[])),
      published_on date not null default current_date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await pool.query(`
    create index if not exists news_published_on_idx on news (published_on desc)
  `)
}

module.exports = {
  ensureNewsTable,
  IMPORTANCE_VALUES,
}

