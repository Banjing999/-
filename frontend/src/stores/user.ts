import { defineStore } from 'pinia'
import request from '@/utils/request'

interface User {
  id: number
  username: string
  nickname?: string
  email: string
  avatar?: string
  role: string
  status: number
  created_at?: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    token: '' as string,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    nickname: (state) => state.user?.nickname || state.user?.username || '',
  },

  actions: {
    async login(account: string, password: string) {
      const data = await request.post('/auth/login', { account, password })
      this.user = data.user
      this.token = data.token
      return data
    },

    async register(payload: { username: string; email: string; password: string; nickname?: string }) {
      const data = await request.post('/auth/register', payload)
      this.user = data.user
      this.token = data.token
      return data
    },

    async fetchMe() {
      try {
        const data = await request.get('/auth/me')
        this.user = data
      } catch {
        this.logout()
      }
    },

    logout() {
      this.user = null
      this.token = ''
    },
  },

  persist: {
    key: 'techforum_user',
    paths: ['user', 'token'],
  },
})
