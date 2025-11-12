const { pool } = require('./db')

const IMPORTANCE_VALUES = ['critical', 'important', 'informational']
const POSITION_CATEGORY_VALUES = ['stock', 'commodity', 'hedge', 'cash', 'cryptocurrency']
const POSITION_TYPE_VALUES = ['long', 'short']

const ANALYSIS_TREND_VALUES = ['bullish', 'neutral', 'bearish']
const ANALYSIS_TREND_ARRAY_SQL = ANALYSIS_TREND_VALUES.map(value => `'${value}'`).join(', ')

const POSITION_SIZE_TYPE_VALUES = ['capital', 'units', 'pips']
const POSITION_SIZE_TYPE_ARRAY_SQL = POSITION_SIZE_TYPE_VALUES.map(value => `'${value}'`).join(', ')

const ANALYSIS_ENTRY_STRATEGY_VALUES = ['level', 'candlePattern', 'formationRetest']
const ANALYSIS_ENTRY_STRATEGY_ARRAY_SQL = ANALYSIS_ENTRY_STRATEGY_VALUES.map(value => `'${value}'`).join(', ')

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
      position_currency text,
      position_size_type text check (position_size_type = any (ARRAY[${POSITION_SIZE_TYPE_ARRAY_SQL}]::text[])),
      position_size_value numeric,
      position_size_label text,
      position_size_per_pip numeric,
      position_size_per_pip_label text,
      position_total_value numeric,
      position_total_value_currency text,
      position_total_value_label text,
      latest_price_value numeric,
      latest_price_currency text,
      latest_price_label text,
      latest_return_value numeric,
      latest_return_label text,
      latest_price_updated_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists quote_symbol text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_size_type text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_currency text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_size_value numeric
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_size_label text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_size_per_pip numeric
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_size_per_pip_label text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_total_value numeric
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_total_value_currency text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists position_total_value_label text
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
      add column if not exists latest_price_value numeric
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists latest_price_currency text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists latest_price_label text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists latest_return_value numeric
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists latest_return_label text
  `)

  await pool.query(`
    alter table portfolio_positions
      add column if not exists latest_price_updated_at timestamptz
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
    do $$
    begin
      if not exists (
        select 1
        from pg_constraint
        where conrelid = 'portfolio_positions'::regclass
          and conname = 'portfolio_positions_size_type_check'
      ) then
        alter table portfolio_positions
          add constraint portfolio_positions_size_type_check
            check (position_size_type is null or position_size_type = any (ARRAY[${POSITION_SIZE_TYPE_ARRAY_SQL}]::text[]));
      end if;
    end$$
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

  await pool.query(`
    create table if not exists portfolio_position_analyses (
      id uuid primary key default gen_random_uuid(),
      position_id uuid not null unique references portfolio_positions (id) on delete cascade,
      trend text not null check (trend = any (ARRAY[${ANALYSIS_TREND_ARRAY_SQL}]::text[])),
      target_tp1 text,
      target_tp2 text,
      target_tp3 text,
      stop_loss text not null,
      summary text not null,
      analysis_image text,
      completed boolean not null default false,
      completion_note text,
      completion_date timestamptz,
      position_closed boolean not null default false,
      position_closed_note text,
      position_closed_date timestamptz,
      entry_strategy text check (entry_strategy = any (ARRAY[${ANALYSIS_ENTRY_STRATEGY_ARRAY_SQL}]::text[])),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)

  await pool.query(`
    alter table portfolio_position_analyses
      add column if not exists entry_strategy text
  `)

  await pool.query(`
    do $$
    begin
      if not exists (
        select 1
        from pg_constraint
        where conrelid = 'portfolio_position_analyses'::regclass
          and conname = 'portfolio_position_analyses_entry_strategy_check'
      ) then
        alter table portfolio_position_analyses
          add constraint portfolio_position_analyses_entry_strategy_check
            check (entry_strategy is null or entry_strategy = any (ARRAY[${ANALYSIS_ENTRY_STRATEGY_ARRAY_SQL}]::text[]));
      end if;
    end$$
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
  ANALYSIS_TREND_VALUES,
  POSITION_SIZE_TYPE_VALUES,
  ANALYSIS_ENTRY_STRATEGY_VALUES,
}

