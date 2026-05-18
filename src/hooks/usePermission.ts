import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/http'
import { useAuthStore } from '../stores/auth.store'

export type PermissionMatrix = Record<string, Record<string, boolean>>

const ALL_TRUE: PermissionMatrix = {
  INTAKE:  { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  PO:      { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  GRN:     { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  INVOICE: { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  PAYMENT: { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  VENDOR:  { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  BUDGET:  { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  MASTERS: { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
  ADMIN:   { create: true, view: true, edit: true, delete: true, submit: true, approve: true },
}

export function usePermissions() {
  const isLoggedIn = useAuthStore(s => s.isAuthenticated)
  return useQuery({
    queryKey:  ['my-permissions'],
    queryFn:   () => http.get<PermissionMatrix>('/auth/my-permissions'),
    staleTime: 5 * 60_000,
    enabled:   isLoggedIn,
  })
}

/** Returns true if any role assigned to the user grants the given (module, action). */
export function usePermission(module: string, action: string): boolean {
  const user      = useAuthStore(s => s.user)
  const { data }  = usePermissions()
  if (user?.role === 'SUPER_ADMIN') return true
  return data?.[module]?.[action] ?? false
}

/** Six-flag projection for a single module — handy in pages that gate buttons. */
export function useModuleAccess(module: string): {
  canCreate:  boolean
  canView:    boolean
  canEdit:    boolean
  canDelete:  boolean
  canSubmit:  boolean
  canApprove: boolean
} {
  const user      = useAuthStore(s => s.user)
  const { data }  = usePermissions()
  const perms     = user?.role === 'SUPER_ADMIN' ? ALL_TRUE[module] : (data?.[module] ?? {})
  return {
    canCreate:  perms?.create  ?? false,
    canView:    perms?.view    ?? false,
    canEdit:    perms?.edit    ?? false,
    canDelete:  perms?.delete  ?? false,
    canSubmit:  perms?.submit  ?? false,
    canApprove: perms?.approve ?? false,
  }
}
