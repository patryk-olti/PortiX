const { Pool } = require('pg')

const connectionUrl = process.env.SUPABASE_DB_URL

if (!connectionUrl) {
  throw new Error('SUPABASE_DB_URL is not defined. Please set it in backend/.env')
}

console.log('Supabase connection URL:', connectionUrl)

let parsed
try {
  parsed = new URL(connectionUrl)
  console.log(`Connecting to database host: ${parsed.hostname}`)
} catch (error) {
  console.error('Invalid SUPABASE_DB_URL provided:', error)
  throw error
}

const host = parsed.hostname.replace(/^\[|\]$/g, '')

const databaseConfig = {
  host,
  port: Number(parsed.port) || 5432,
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, '') || 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
}

const pool = new Pool({
  ...databaseConfig,
})

pool.on('error', error => {
  console.error('Unexpected database error:', error)
})

console.log('Pool configured host:', databaseConfig.host, 'port:', databaseConfig.port)
console.log('Pool options sample:', {
  host: pool.options.host,
  port: pool.options.port,
  user: pool.options.user,
  database: pool.options.database,
})

module.exports = { pool }

