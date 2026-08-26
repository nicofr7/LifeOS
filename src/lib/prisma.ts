import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (prismaInstance) return prismaInstance
  
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql')) {
    // Use dynamic import for pg adapter at runtime only
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    })
    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
  } else {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
  }
  
  return prismaInstance
}

// Lazy proxy that creates the client on first use
function createLazyPrismaProxy() {
  return new Proxy({} as PrismaClient, {
    get(_, prop) {
      const client = getPrismaClient()
      const value = (client as any)[prop]
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createLazyPrismaProxy()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
