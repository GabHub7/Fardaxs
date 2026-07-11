import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is not set')

  // Accept either a 32-byte hex string (64 chars) or a base64-encoded 32-byte key
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }
  const decoded = Buffer.from(key, 'base64')
  if (decoded.length !== KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex (64 chars) or base64 string')
  }
  return decoded
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: iv(16) + tag(16) + ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const data = Buffer.from(ciphertext, 'base64')

  if (data.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext length')
  }

  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted) + decipher.final('utf8')
}
