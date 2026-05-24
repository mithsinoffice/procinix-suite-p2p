import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { ErrorCode, type AppError } from '../lib/result.js'

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled rejection — exiting')
    process.exit(1)
  })
  process.on('uncaughtException', (err) => {
    app.log.error({ err }, 'Uncaught exception — exiting')
    process.exit(1)
  })

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    // Already an AppError
    if ('code' in error && typeof (error as any).httpStatus === 'number') {
      const e = error as unknown as AppError
      app.log.warn({ path: request.url, code: e.code }, e.message)
      return reply.code(e.httpStatus ?? 400).send(e)
    }
    // Zod error
    if (error instanceof ZodError) {
      const details: Record<string, string> = {}
      for (const i of error.issues) details[i.path.join('.')] = i.message
      return reply.code(400).send({ code: ErrorCode.VALIDATION_ERROR, message: 'Validation failed', details })
    }
    // Prisma unique constraint
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.join(', ') ?? 'field'
        return reply.code(409).send({ code: ErrorCode.DUPLICATE_RECORD, message: `Duplicate value for ${field}` })
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ code: ErrorCode.NOT_FOUND, message: 'Record not found' })
      }
    }
    // HTTP status errors from plugins
    if ('statusCode' in error) {
      const s = (error as FastifyError).statusCode ?? 500
      if (s === 401) return reply.code(401).send({ code: ErrorCode.UNAUTHORISED, message: error.message })
      if (s === 403) return reply.code(403).send({ code: ErrorCode.FORBIDDEN, message: error.message })
      if (s === 429) return reply.code(429).send({ code: 'RATE_LIMITED', message: 'Too many requests' })
    }
    // Unknown — log full error, return safe response
    app.log.error({ path: request.url, err: error }, 'Unhandled error')
    return reply.code(500).send({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      ...(app.config.NODE_ENV !== 'production' && { details: { message: error.message } }),
    })
  })

  app.setNotFoundHandler((request, reply) => {
    const isApiPath = /^\/(api|auth|health|webhooks)(\/|$)/.test(request.url)
    const wantsHtml = !isApiPath
      && request.method === 'GET'
      && (request.headers.accept ?? '').includes('text/html')
    if (wantsHtml) {
      return reply.type('text/html').sendFile('index.html')
    }
    reply.code(404).send({ code: ErrorCode.NOT_FOUND, message: `Route ${request.method} ${request.url} not found` })
  })
})
