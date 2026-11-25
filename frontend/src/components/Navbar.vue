<template>
  <header
    class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-ink-100"
  >
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2 group">
        <div
          class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30"
        >
          <MessageCircle class="w-5 h-5 text-white" />
        </div>
        <span class="text-xl font-bold tracking-tight text-ink-800 group-hover:text-brand-600 transition-colors">
          日日升
        </span>
      </router-link>

      <!-- 搜索 -->
      <div class="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div class="relative w-full">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            v-model="searchKeyword"
            @keyup.enter="doSearch"
            type="text"
            placeholder="搜索帖子..."
            class="w-full pl-10 pr-4 py-2 text-sm bg-ink-50 border border-transparent rounded-full focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
          />
        </div>
      </div>

      <!-- 右侧操作 -->
      <div class="flex items-center gap-3">
        <template v-if="userStore.isLoggedIn">
          <router-link
            to="/messages"
            class="relative p-2 rounded-full text-ink-500 hover:bg-ink-50 hover:text-brand-600 transition-colors"
            title="私信"
          >
            <MessageSquare class="w-5 h-5" />
            <span
              v-if="unread > 0"
              class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center"
            >
              {{ unread > 99 ? '99+' : unread }}
            </span>
          </router-link>
          <router-link
            to="/post/create"
            class="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all"
          >
            <PenLine class="w-4 h-4" />
            发帖
          </router-link>
          <el-dropdown trigger="click" @command="handleCommand">
            <button
              class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-ink-50 transition-colors"
            >
              <img
                :src="userStore.user?.avatar || defaultAvatar"
                class="w-8 h-8 rounded-full border-2 border-ink-100"
              />
              <span class="text-sm font-medium text-ink-700">{{ userStore.nickname }}</span>
              <ChevronDown class="w-4 h-4 text-ink-400" />
            </button>
            <template #dropdown>
              <el-dropdown-menu class="w-48">
                <el-dropdown-item command="profile">
                  <User class="w-4 h-4 mr-2" /> 个人中心
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <Settings class="w-4 h-4 mr-2" /> 账号设置
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="userStore.isAdmin"
                  command="admin"
                  divided
                >
                  <LayoutDashboard class="w-4 h-4 mr-2" /> 管理后台
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <LogOut class="w-4 h-4 mr-2" /> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <router-link
            to="/login"
            class="px-4 py-2 text-sm font-medium text-ink-600 hover:text-brand-600 transition-colors"
          >
            登录
          </router-link>
          <router-link
            to="/register"
            class="px-4 py-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-brand-500/30 transition-all"
          >
            注册
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import request from '@/utils/request'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  MessageCircle,
  MessageSquare,
  Search,
  PenLine,
  ChevronDown,
  User,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const unread = ref(0)
let unreadTimer: number | undefined
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=techforum'

const fetchUnread = async () => {
  if (!userStore.isLoggedIn) {
    unread.value = 0
    return
  }
  try {
    const data = await request.get('/messages/unread')
    unread.value = data.total
  } catch {}
}

onMounted(() => {
  fetchUnread()
  unreadTimer = window.setInterval(fetchUnread, 30000)
})

onUnmounted(() => {
  if (unreadTimer) window.clearInterval(unreadTimer)
})

const doSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/', query: { keyword: searchKeyword.value.trim() } })
  }
}

const handleCommand = async (cmd: string) => {
  if (cmd === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
      })
      userStore.logout()
      ElMessage.success('已退出登录')
      router.push('/')
    } catch {}
  } else if (cmd === 'profile') {
    router.push('/profile')
  } else if (cmd === 'settings') {
    router.push('/settings')
  } else if (cmd === 'admin') {
    router.push('/admin')
  }
}
</script>
