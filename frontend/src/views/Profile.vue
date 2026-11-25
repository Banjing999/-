<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <!-- 顶部渐变区 -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-600 via-orange-500 to-amber-400"></div>
      <div class="absolute inset-0 opacity-20 page-pattern"></div>
      <div class="relative max-w-4xl mx-auto px-4 pt-12 pb-24">
        <div class="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div class="relative">
            <img
              :src="userStore.user?.avatar || defaultAvatar"
              class="w-28 h-28 rounded-2xl border-4 border-white/40 shadow-2xl bg-white"
            />
            <span
              class="absolute -bottom-2 -right-2 px-2 py-0.5 text-xs rounded-full font-medium shadow"
              :class="
                userStore.isAdmin
                  ? 'bg-amber-400 text-ink-900'
                  : 'bg-white text-brand-600'
              "
            >
              {{ userStore.isAdmin ? '管理员' : '用户' }}
            </span>
          </div>
          <div class="text-white">
            <h1 class="text-3xl font-bold mb-1">{{ userStore.nickname }}</h1>
            <p class="text-white/80 text-sm">@{{ userStore.user?.username }}</p>
            <div class="flex items-center gap-4 text-sm text-white/70 mt-2 flex-wrap">
              <span v-if="meInfo?.email">
                <Mail class="w-4 h-4 inline mr-1" /> {{ meInfo.email }}
              </span>
              <span>
                <Calendar class="w-4 h-4 inline mr-1" />
                加入于 {{ formatDate(userStore.user?.created_at) }}
              </span>
            </div>
          </div>
          <div class="sm:ml-auto flex items-center gap-2">
            <router-link
              to="/settings"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur transition-all"
            >
              <Settings class="w-4 h-4" /> 账号设置
            </router-link>
            <router-link
              v-if="userStore.isAdmin"
              to="/admin"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-ink-900/60 text-white hover:bg-ink-900/80 transition-all"
            >
              <LayoutDashboard class="w-4 h-4" /> 管理后台
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容（负边距上提） -->
    <div class="max-w-4xl mx-auto px-4 -mt-12 pb-10 relative">
      <!-- 统计卡 -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <router-link
          to="/my/posts"
          class="card p-6 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 transition-all group"
        >
          <div class="w-11 h-11 mx-auto mb-3 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-500 transition-colors">
            <FileText class="w-5 h-5 text-brand-500 group-hover:text-white transition-colors" />
          </div>
          <p class="text-3xl font-bold text-ink-800">{{ stats.post_count }}</p>
          <p class="text-sm text-ink-500 mt-1">帖子</p>
        </router-link>
        <router-link
          to="/my/followers"
          class="card p-6 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group"
        >
          <div class="w-11 h-11 mx-auto mb-3 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
            <Users class="w-5 h-5 text-emerald-500 group-hover:text-white transition-colors" />
          </div>
          <p class="text-3xl font-bold text-ink-800">{{ stats.follower_count }}</p>
          <p class="text-sm text-ink-500 mt-1">粉丝</p>
        </router-link>
        <router-link
          to="/my/following"
          class="card p-6 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group"
        >
          <div class="w-11 h-11 mx-auto mb-3 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
            <UserPlus class="w-5 h-5 text-indigo-500 group-hover:text-white transition-colors" />
          </div>
          <p class="text-3xl font-bold text-ink-800">{{ stats.following_count }}</p>
          <p class="text-sm text-ink-500 mt-1">关注</p>
        </router-link>
      </div>

      <!-- 功能入口 -->
      <div class="card divide-y divide-ink-100 overflow-hidden">
        <router-link
          v-for="item in entries"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-4 px-6 py-4 hover:bg-brand-50/40 transition-colors group"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            :class="item.bg"
          >
            <component :is="item.icon" class="w-5 h-5" :class="item.color" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-ink-700">{{ item.label }}</p>
            <p class="text-xs text-ink-400 mt-0.5">{{ item.desc }}</p>
          </div>
          <ChevronRight class="w-4 h-4 text-ink-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import {
  Calendar,
  Mail,
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  UserPlus,
  Star,
  MessageSquare,
  ChevronRight,
} from 'lucide-vue-next'

const userStore = useUserStore()
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const meInfo = ref<any>(null)
const stats = reactive({ post_count: 0, follower_count: 0, following_count: 0 })

const entries = [
  {
    to: '/my/favorites',
    label: '我的收藏',
    desc: '查看收藏的优质内容',
    icon: Star,
    bg: 'bg-amber-50',
    color: 'text-amber-500',
  },
  {
    to: '/messages',
    label: '私信',
    desc: '与互相关注的用户交流',
    icon: MessageSquare,
    bg: 'bg-sky-50',
    color: 'text-sky-500',
  },
  {
    to: '/settings',
    label: '账号设置',
    desc: '修改资料与密码',
    icon: Settings,
    bg: 'bg-ink-100',
    color: 'text-ink-500',
  },
]

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

onMounted(async () => {
  try {
    const data = await request.get('/users/me')
    meInfo.value = data
    stats.post_count = data.post_count || 0
    stats.follower_count = data.follower_count || 0
    stats.following_count = data.following_count || 0
  } catch {}
})
</script>

<style scoped>
.page-pattern {
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0);
  background-size: 24px 24px;
}
</style>
