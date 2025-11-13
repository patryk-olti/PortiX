const bcrypt = require('bcrypt')
const { pool } = require('./db')

const SALT_ROUNDS = 10

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

async function createUser({ username, password }) {
  const normalizedUsername = username.trim().toLowerCase()
  if (!normalizedUsername) {
    throw Object.assign(new Error('Username is required'), { code: 'INVALID_USERNAME' })
  }

  if (!password || password.length < 3) {
    throw Object.assign(new Error('Password must be at least 3 characters'), { code: 'INVALID_PASSWORD' })
  }

  // Sprawdź, czy użytkownik już istnieje
  const existing = await pool.query('select id from users where username = $1', [normalizedUsername])
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Username already exists'), { code: 'USERNAME_EXISTS' })
  }

  const passwordHash = await hashPassword(password)

  const result = await pool.query(
    `
      insert into users (username, password_hash)
      values ($1, $2)
      returning
        id,
        username,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [normalizedUsername, passwordHash],
  )

  return result.rows[0]
}

async function getUserByUsername(username) {
  const normalizedUsername = username.trim().toLowerCase()
  const result = await pool.query(
    `
      select
        id,
        username,
        password_hash as "passwordHash",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from users
      where username = $1
    `,
    [normalizedUsername],
  )

  return result.rows[0] ?? null
}

async function getUserById(id) {
  const result = await pool.query(
    `
      select
        id,
        username,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from users
      where id = $1::uuid
    `,
    [id],
  )

  return result.rows[0] ?? null
}

async function listUsers(limit = 50) {
  const result = await pool.query(
    `
      select
        id,
        username,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from users
      order by created_at desc
      limit $1
    `,
    [limit],
  )

  return result.rows
}

async function deleteUser(id) {
  const result = await pool.query(
    `
      delete from users
      where id = $1::uuid
      returning id
    `,
    [id],
  )
  return result.rowCount > 0
}

async function authenticateUser(username, password) {
  const user = await getUserByUsername(username)
  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  // Zwróć użytkownika bez hasła
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function ensureInitialUser() {
  const username = 'oltix'
  const password = '997'

  const existing = await getUserByUsername(username)
  if (existing) {
    return
  }

  try {
    await createUser({ username, password })
    console.log('Initial user created: oltix')
  } catch (error) {
    console.error('Failed to create initial user:', error)
  }
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  listUsers,
  deleteUser,
  authenticateUser,
  ensureInitialUser,
  hashPassword,
  verifyPassword,
}

