const { Pool } = require('pg')

// Debug: Check if environment variable is available
const connectionUrl = process.env.SUPABASE_DB_URL

if (!connectionUrl) {
  // Additional debugging info
  const allEnvKeys = Object.keys(process.env).sort()
  const relevantKeys = allEnvKeys.filter(key => 
    key.toUpperCase().includes('SUPABASE') || 
    key.toUpperCase().includes('DATABASE') ||
    key.toUpperCase().includes('POSTGRES')
  )
  
  console.error('SUPABASE_DB_URL is not defined!')
  console.error('Available environment variables count:', allEnvKeys.length)
  if (relevantKeys.length > 0) {
    console.error('Relevant environment variables found:', relevantKeys.join(', '))
  } else {
    console.error('No SUPABASE/DATABASE related environment variables found')
  }
  console.error('Sample of all env keys (first 10):', allEnvKeys.slice(0, 10).join(', '))
  
  throw new Error(
    'SUPABASE_DB_URL is not defined. Please set it as an environment variable.\n' +
    'For local development: create backend/.env file with SUPABASE_DB_URL=...\n' +
    'For production (Railway/Render/etc): set SUPABASE_DB_URL in your platform\'s environment variables.\n' +
    'Make sure the variable is set at the SERVICE level, not just the project level.'
  )
}

// Mask sensitive parts of URL for logging
const urlParts = connectionUrl.split('@')
const maskedUrl = urlParts.length > 1 
  ? connectionUrl.substring(0, 20) + '***@' + urlParts[1]
  : connectionUrl.substring(0, 30) + '***'
console.log('Supabase connection URL (masked):', maskedUrl)

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

