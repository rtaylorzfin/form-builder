import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserResponse {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  token: string | null
  user: UserResponse | null

  setAuth: (token: string, user: UserResponse) => void
  logout: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      isAuthenticated: () => !!get().token,

      isAdmin: () => get().user?.role === 'ADMIN',
    }),
    {
      name: 'auth-storage',
    }
  )
)
