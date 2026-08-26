import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // For PostgreSQL, use the driver adapter
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql')) {
    try {
      const { PrismaPg } = require('@prisma/adapter-pg')
      const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      })
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      })
    } catch (e) {
      console.warn('Failed to load PostgreSQL adapter, using default connection')
    }
  }
  
  // Fallback: use default connection (works for SQLite and basic PostgreSQL)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
