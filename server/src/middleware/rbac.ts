import type { FastifyRequest, FastifyReply } from 'fastify'

// ── Route → permission map ────────────────────────────────────────────────────
// Only mutating routes need entries. GETs/listing routes fall through to allow
// (the route-level `app.authenticate` preHandler still enforces login).
//
// Wildcards: a key ending in '/*' matches any path that starts with the prefix.

const ROUTE_PERMISSIONS: Record<string, { module: string; action: string }> = {
  // ── Purchase Requisition (Intake) ──
  'POST /api/pr':                     { module: 'INTAKE',  action: 'create'  },
  'PUT /api/pr/:id':                  { module: 'INTAKE',  action: 'edit'    },
  'POST /api/pr/:id/submit':          { module: 'INTAKE',  action: 'submit'  },
  'POST /api/pr/:id/approve':         { module: 'INTAKE',  action: 'approve' },

  // ── Purchase Order ──
  'POST /api/po':                     { module: 'PO',      action: 'create'  },
  'PUT /api/po/:id':                  { module: 'PO',      action: 'edit'    },
  'POST /api/po/:id/submit':          { module: 'PO',      action: 'submit'  },
  'POST /api/po/:id/issue':           { module: 'PO',      action: 'submit'  },
  'POST /api/po/:id/approve':         { module: 'PO',      action: 'approve' },

  // ── GRN ──
  'POST /api/grn':                    { module: 'GRN',     action: 'create'  },
  'PUT /api/grn/:id':                 { module: 'GRN',     action: 'edit'    },
  'POST /api/grn/:id/approve':        { module: 'GRN',     action: 'approve' },
  'POST /api/srn':                    { module: 'GRN',     action: 'create'  },

  // ── Invoice ──
  'POST /api/invoices':               { module: 'INVOICE', action: 'create'  },
  'PUT /api/invoices/:id':            { module: 'INVOICE', action: 'edit'    },
  'POST /api/invoices/:id/submit':    { module: 'INVOICE', action: 'submit'  },
  'POST /api/invoices/:id/approve':   { module: 'INVOICE', action: 'approve' },
  'POST /api/invoices/:id/reject':    { module: 'INVOICE', action: 'approve' },
  'POST /api/invoices/:id/hold':      { module: 'INVOICE', action: 'approve' },

  // ── Payment ──
  'POST /api/payments':               { module: 'PAYMENT', action: 'create'  },
  'PUT /api/payments/:id':            { module: 'PAYMENT', action: 'edit'    },
  'POST /api/payments/:id/approve':   { module: 'PAYMENT', action: 'approve' },

  // ── Vendor ──
  'POST /api/vendors':                { module: 'VENDOR',  action: 'create'  },
  'PUT /api/vendors/:id':             { module: 'VENDOR',  action: 'edit'    },
  'POST /api/vendors/:id/submit':     { module: 'VENDOR',  action: 'submit'  },
  'POST /api/vendors/:id/approve':    { module: 'VENDOR',  action: 'approve' },

  // ── Budget ──
  'POST /api/budgets':                { module: 'BUDGET',  action: 'create'  },
  'PUT /api/budgets/:id':             { module: 'BUDGET',  action: 'edit'    },
  'POST /api/budgets/:id/revise':     { module: 'BUDGET',  action: 'approve' },

  // ── Masters (wildcard) ──
  'POST /api/masters/*':              { module: 'MASTERS', action: 'create'  },
  'PUT /api/masters/*':               { module: 'MASTERS', action: 'edit'    },

  // ── Admin ──
  'POST /api/admin/tenants':          { module: 'ADMIN',   action: 'create'  },
  'PUT /api/admin/tenants/:id':       { module: 'ADMIN',   action: 'edit'    },
  'POST /api/admin/users':            { module: 'ADMIN',   action: 'create'  },
  'PUT /api/admin/users/:id':         { module: 'ADMIN',   action: 'edit'    },
}

// Normalise dynamic path segments so /api/invoices/abc-123/approve →
// /api/invoices/:id/approve, and /api/pr/PR-0001 → /api/pr/:id.
function normaliseRoute(method: string, url: string): string {
  const path = url.split('?')[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
    .replace(/\/[A-Z]{2,4}-\d{4,}/g, '/:id')                                              // refs (PR-0001)
  return `${method.toUpperCase()} ${path}`
}

function lookupPermission(normalised: string) {
  // Exact match first
  if (ROUTE_PERMISSIONS[normalised]) return ROUTE_PERMISSIONS[normalised]
  // Then wildcard prefix
  for (const key of Object.keys(ROUTE_PERMISSIONS)) {
    if (key.endsWith('/*')) {
      const prefix = key.replace('/*', '')
      if (normalised.startsWith(prefix)) return ROUTE_PERMISSIONS[key]
    }
  }
  return undefined
}

export async function rbacHook(req: FastifyRequest, reply: FastifyReply) {
  const required = lookupPermission(normaliseRoute(req.method, req.url))
  // No mapping → allow (read routes, health, refresh tokens, etc.)
  if (!required) return

  const user = (req as any).user
  // Super admin bypasses all checks
  if (user?.role === 'SUPER_ADMIN') return

  const tenantId = (req as any).tenant?.id
  if (!tenantId) return reply.code(401).send({ code: 'UNAUTHORIZED' })

  const prisma = (req.server as any).prisma

  // Get user's per-entity role assignments
  const entityRoles = await prisma.userEntityRole.findMany({
    where:  { userId: user.sub, isActive: true },
    select: { roleCode: true },
  })

  // Fall back to the User row's primary role if no entity roles assigned
  const roleCodes = entityRoles.length
    ? [...new Set(entityRoles.map((r: { roleCode: string }) => r.roleCode))]
    : [user.role]

  const rolePrivileges = await prisma.rolePrivilege.findMany({
    where:  { tenantId, roleCode: { in: roleCodes }, status: 'ACTIVE' },
    select: { roleCode: true, permissions: true },
  })

  const hasPermission = rolePrivileges.some((rp: { permissions: unknown }) => {
    const perms = rp.permissions as Record<string, Record<string, boolean>> | null
    return perms?.[required.module]?.[required.action] === true
  })

  if (!hasPermission) {
    return reply.code(403).send({
      code:    'FORBIDDEN',
      module:  required.module,
      action:  required.action,
      message: `You do not have ${required.action} rights for ${required.module}. Contact your administrator.`,
    })
  }
}
