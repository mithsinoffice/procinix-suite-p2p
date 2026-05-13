import { PrismaClient } from '@prisma/client'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

let _prisma: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma
  _prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  })
  return _prisma
}

export const prismaPlugin = fp(async (app: FastifyInstance) => {
  const prisma = getPrismaClient()
  try {
    await prisma.$queryRaw`SELECT 1`
    app.log.info('Database connected')
  } catch (err) {
    app.log.error('Database connection failed on startup')
    throw err
  }
  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})
