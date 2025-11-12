const { pool } = require('./db')

const IMPORTANCE_VALUES = ['critical', 'important', 'informational']
const POSITION_CATEGORY_VALUES = ['stock', 'commodity', 'hedge', 'cash']
const POSITION_TYPE_VALUES = ['long', 'short']

const IMPORTANCE_ARRAY_SQL = IMPORTANCE_VALUES.map(value => `'${value}'`).join(', ')
const POSITION_CATEGORY_ARRAY_SQL = POSITION_CATEGORY_VALUES.map(value => `'${value}'`).join(', ')
const POSITION_TYPE_ARRAY_SQL = POSITION_TYPE_VALUES.map(value => `'${value}'`).join(', ')

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

async function ensurePortfolioTables() {
  await pool.query('create extension if not exists "pgcrypto"')
  await pool.query(`
    create table if not exists portfolio_positions (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique,
      symbol text not null unique,
      quote_symbol text,
      name text not null,
      category text not null check (category = any (ARRAY[${POSITION_CATEGORY_ARRAY_SQL}]::text[])),
      position_type text not null check (position_type = any (ARRAY[${POSITION_TYPE_ARRAY_SQL}]::text[])),
      purchase_price_label text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists quote_symbol text
  `)

  await pool.query(`
    update portfolio_positions
    set quote_symbol = upper(symbol)
    where quote_symbol is null
  `)

  await pool.query(`
    update portfolio_positions
    set quote_symbol = case
      when lower(symbol) = 'soxx' then 'NASDAQ:SOXX'
      when lower(symbol) = 'msft' then 'NASDAQ:MSFT'
      when lower(symbol) = 'dax' then 'INDEX:DEU40'
      when lower(symbol) = 'gold' then 'TVC:GOLD'
      when lower(symbol) = 'cash' then 'OANDA:USDCAD'
      else quote_symbol
    end
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists slug text
  `)

  await pool.query(`
    do $$
    begin
      if not exists (
        select 1
        from pg_constraint
        where conrelid = 'portfolio_positions'::regclass
          and conname = 'portfolio_positions_slug_key'
      ) then
        alter table portfolio_positions
          add constraint portfolio_positions_slug_key unique (slug);
      end if;
    end$$
  `)

  await pool.query(`
    update portfolio_positions
    set slug = lower(trim(symbol))
    where slug is null
  `)

  await pool.query(`
    alter table portfolio_positions
      alter column slug set not null
  `)

  await pool.query(`
    create table if not exists portfolio_position_snapshots (
      id uuid primary key default gen_random_uuid(),
      position_id uuid not null references portfolio_positions (id) on delete cascade,
      recorded_at timestamptz not null default now(),
      current_price_value numeric,
      current_price_currency text,
      current_price_label text not null,
      return_value numeric not null default 0,
      return_label text not null,
      created_at timestamptz not null default now()
    )
  `)

  await pool.query(`
    alter table portfolio_position_snapshots
      add column if not exists current_price_value numeric
  `)

  await pool.query(`
    alter table portfolio_position_snapshots
      add column if not exists current_price_currency text
  `)

  await pool.query(`
    create index if not exists portfolio_position_snapshots_position_id_idx
      on portfolio_position_snapshots (position_id, recorded_at desc)
  `)
}

async function ensureSchema() {
  await ensureNewsTable()
  await ensurePortfolioTables()
}

module.exports = {
  ensureNewsTable,
  ensurePortfolioTables,
  ensureSchema,
  IMPORTANCE_VALUES,
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
}

