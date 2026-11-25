<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <!-- 页面头部 -->
    <div class="bg-white border-b border-ink-100">
      <div class="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center"
            :class="isFollowers ? 'bg-emerald-50' : 'bg-indigo-50'"
          >
            <Users v-if="isFollowers" class="w-5 h-5 text-emerald-500" />
            <UserPlus v-else class="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-ink-800">
              {{ isFollowers ? '我的粉丝' : '我的关注' }}
            </h1>
            <p class="text-xs text-ink-400 mt-0.5">共 {{ list.length }} 人</p>
          </div>
        </div>
        <router-link
          to="/profile"
          class="text-sm text-ink-500 hover:text-brand-600 transition-colors"
        >
          返回个人中心
        </router-link>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-6">
      <div class="card divide-y divide-ink-100">
        <router-link
          v-for="item in list"
          :key="item.id"
          :to="`/user/${item.id}`"
          class="flex items-center gap-3 px-5 py-4 hover:bg-brand-50/40 transition-colors group"
        >
          <img
            :src="item.avatar || defaultAvatar"
            class="w-11 h-11 rounded-full bg-ink-50 border-2 border-transparent group-hover:border-brand-200 transition-colors"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink-800 truncate group-hover:text-brand-600 transition-colors">
              {{ item.nickname || item.username }}
            </p>
            <p class="text-xs text-ink-400">@{{ item.username }}</p>
          </div>
          <span
            v-if="item.is_mutual"
            class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
          >
            互相关注
          </span>
          <span class="text-xs text-ink-400">{{ formatDate(item.created_at) }}</span>
        </router-link>
        <el-empty
          v-if="list.length === 0"
          :description="isFollowers ? '还没有粉丝' : '还没有关注任何人'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import { Users, UserPlus } from 'lucide-vue-next'

const route = useRoute()
const userStore = useUserStore()
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const isFollowers = computed(() => route.path.includes('followers'))
const list = ref<any[]>([])

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

onMounted(async () => {
  try {
    const id = userStore.user!.id
    list.value = await request.get(
      `/users/${id}/${isFollowers.value ? 'followers' : 'following'}`
    )
  } catch {}
})
</script>
