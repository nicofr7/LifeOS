import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')

export interface JWTPayload {
  userId: string
  email: string
  name: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('lifeos-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function createUser(email: string, password: string, name: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new Error('User already exists')
  }
  
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      settings: {
        create: {}
      }
    }
  })
  
  return { id: user.id, email: user.email, name: user.name }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new Error('Invalid credentials')
  }
  
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    throw new Error('Invalid credentials')
  }
  
  return { id: user.id, email: user.email, name: user.name }
}
