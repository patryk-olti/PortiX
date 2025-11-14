const bcrypt = require('bcrypt')
const { pool } = require('./db')

const SALT_ROUNDS = 10

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

async function createUser({ username, password, role = 'guest', canViewPortfolio = false, canViewIdeas = false, canViewClosedPositions = false, passwordPlaintext = null }) {
  const normalizedUsername = username.trim().toLowerCase()
  if (!normalizedUsername) {
    throw Object.assign(new Error('Username is required'), { code: 'INVALID_USERNAME' })
  }

  if (!password || password.length < 3) {
    throw Object.assign(new Error('Password must be at least 3 characters'), { code: 'INVALID_PASSWORD' })
  }

  if (role && !['guest', 'user', 'admin'].includes(role)) {
    throw Object.assign(new Error('Invalid role'), { code: 'INVALID_ROLE' })
  }

  // Sprawdź, czy użytkownik już istnieje
  const existing = await pool.query('select id from users where username = $1', [normalizedUsername])
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Username already exists'), { code: 'USERNAME_EXISTS' })
  }

  const passwordHash = await hashPassword(password)
  const storedPlaintext = passwordPlaintext !== null ? passwordPlaintext : password

  const result = await pool.query(
    `
      insert into users (username, password_hash, password_plaintext, role, can_view_portfolio, can_view_ideas, can_view_closed_positions)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning
        id,
        username,
        role,
        can_view_portfolio as "canViewPortfolio",
        can_view_ideas as "canViewIdeas",
        can_view_closed_positions as "canViewClosedPositions",
        password_plaintext as "passwordPlaintext",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [normalizedUsername, passwordHash, storedPlaintext, role, canViewPortfolio, canViewIdeas, canViewClosedPositions],
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
        role,
        can_view_portfolio as "canViewPortfolio",
        can_view_ideas as "canViewIdeas",
        can_view_closed_positions as "canViewClosedPositions",
        password_plaintext as "passwordPlaintext",
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
        role,
        can_view_portfolio as "canViewPortfolio",
        can_view_ideas as "canViewIdeas",
        can_view_closed_positions as "canViewClosedPositions",
        password_plaintext as "passwordPlaintext",
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

  // Pobierz pełne dane użytkownika
  const fullUser = await getUserById(user.id)
  if (!fullUser) {
    return null
  }

  // Zwróć użytkownika bez hasła hash, ale z rolą i uprawnieniami
  return {
    id: fullUser.id,
    username: fullUser.username,
    role: fullUser.role || 'guest',
    canViewPortfolio: fullUser.canViewPortfolio || false,
    canViewIdeas: fullUser.canViewIdeas || false,
    canViewClosedPositions: fullUser.canViewClosedPositions || false,
    createdAt: fullUser.createdAt,
    updatedAt: fullUser.updatedAt,
  }
}

async function updateUser(id, { username, password, role, canViewPortfolio, canViewIdeas, canViewClosedPositions, passwordPlaintext }) {
  const updates = []
  const values = []
  let paramIndex = 1

  if (username !== undefined) {
    const normalizedUsername = username.trim().toLowerCase()
    if (!normalizedUsername) {
      throw Object.assign(new Error('Username cannot be empty'), { code: 'INVALID_USERNAME' })
    }
    updates.push(`username = $${paramIndex}`)
    values.push(normalizedUsername)
    paramIndex++
  }

  if (password !== undefined) {
    if (password.length < 3) {
      throw Object.assign(new Error('Password must be at least 3 characters'), { code: 'INVALID_PASSWORD' })
    }
    const passwordHash = await hashPassword(password)
    updates.push(`password_hash = $${paramIndex}`)
    values.push(passwordHash)
    paramIndex++
    
    // Update plaintext password
    const storedPlaintext = passwordPlaintext !== null ? passwordPlaintext : password
    updates.push(`password_plaintext = $${paramIndex}`)
    values.push(storedPlaintext)
    paramIndex++
  } else if (passwordPlaintext !== undefined) {
    // Only update plaintext if password is not being changed
    updates.push(`password_plaintext = $${paramIndex}`)
    values.push(passwordPlaintext)
    paramIndex++
  }

  if (role !== undefined) {
    if (!['guest', 'user', 'admin'].includes(role)) {
      throw Object.assign(new Error('Invalid role'), { code: 'INVALID_ROLE' })
    }
    updates.push(`role = $${paramIndex}`)
    values.push(role)
    paramIndex++
  }

  if (canViewPortfolio !== undefined) {
    updates.push(`can_view_portfolio = $${paramIndex}`)
    values.push(canViewPortfolio)
    paramIndex++
  }

  if (canViewIdeas !== undefined) {
    updates.push(`can_view_ideas = $${paramIndex}`)
    values.push(canViewIdeas)
    paramIndex++
  }

  if (canViewClosedPositions !== undefined) {
    updates.push(`can_view_closed_positions = $${paramIndex}`)
    values.push(canViewClosedPositions)
    paramIndex++
  }

  if (updates.length === 0) {
    // No updates, just return the user
    return await getUserById(id)
  }

  updates.push(`updated_at = now()`)
  values.push(id)

  const result = await pool.query(
    `
      update users
      set ${updates.join(', ')}
      where id = $${paramIndex}::uuid
      returning
        id,
        username,
        role,
        can_view_portfolio as "canViewPortfolio",
        can_view_ideas as "canViewIdeas",
        can_view_closed_positions as "canViewClosedPositions",
        password_plaintext as "passwordPlaintext",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    values,
  )

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0]
}

async function ensureInitialUser() {
  const username = 'oltix'
  const password = '997'

  const existing = await getUserByUsername(username)
  if (existing) {
    // Update existing user to admin if not already
    try {
      await updateUser(existing.id, { role: 'admin', canViewPortfolio: true, canViewIdeas: true, canViewClosedPositions: true })
    } catch (error) {
      console.error('Failed to update initial user:', error)
    }
    return
  }

  try {
    await createUser({ 
      username, 
      password, 
      role: 'admin',
      canViewPortfolio: true,
      canViewIdeas: true,
      canViewClosedPositions: true,
      passwordPlaintext: password
    })
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
  updateUser,
  ensureInitialUser,
  hashPassword,
  verifyPassword,
}

