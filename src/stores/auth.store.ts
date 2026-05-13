import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id:         string
  name:       string
  email:      string
  role:       string
  tenantId:   string
  tenantCode: string
}

interface AuthState {
  user:            AuthUser | null
  isAuthenticated: boolean
  setUser:         (user: AuthUser) => void
  clearUser:       () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      isAuthenticated: false,
      setUser:  (user) => set({ user, isAuthenticated: true }),
      clearUser: ()   => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'procinix-auth',
      // Only persist non-sensitive fields — token stays in httpOnly cookie
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
