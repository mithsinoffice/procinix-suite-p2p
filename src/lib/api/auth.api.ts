import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../http'
import { useAuthStore } from '../../stores/auth.store'

interface LoginInput { email: string; password: string }
interface AuthUser   { id: string; name: string; email: string; role: string; tenantId: string; tenantCode: string }

// Fetch current user on app load
export function useCurrentUser() {
  const setUser   = useAuthStore(s => s.setUser)
  const clearUser = useAuthStore(s => s.clearUser)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn:  async () => {
      const user = await http.get<AuthUser>('/auth/me')
      setUser(user)
      return user
    },
    retry: false,
    staleTime: 5 * 60_000,
    meta: {
      onError: () => clearUser(),
    },
  })
}

// Login mutation
export function useLogin() {
  const setUser     = useAuthStore(s => s.setUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LoginInput) => http.post<{ user: AuthUser }>('/auth/login', input),
    onSuccess: ({ user }) => {
      setUser(user)
      queryClient.setQueryData(['auth', 'me'], user)
    },
  })
}

// Logout mutation
export function useLogout() {
  const clearUser   = useAuthStore(s => s.clearUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => http.post('/auth/logout', {}),
    onSuccess: () => {
      clearUser()
      queryClient.clear()
    },
  })
}
