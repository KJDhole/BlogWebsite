import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function verifyAdminPassword({ username, password, config }) {
  if (username !== config.adminUsername) return false
  if (typeof password !== 'string' || password.length === 0) return false
  return bcrypt.compare(password, config.adminPasswordHash)
}
