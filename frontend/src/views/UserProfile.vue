<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div v-if="user" class="card p-6 mb-6 animate-enter">
        <div class="flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            :src="user.avatar || defaultAvatar"
            class="w-20 h-20 rounded-full border-4 border-brand-100 shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h2 class="text-2xl font-bold text-ink-800">
                {{ user.nickname || user.username }}
              </h2>
              <span
                v-if="user.role_name === 'admin'"
                class="px-2 py-0.5 text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full font-medium"
              >
                管理员
              </span>
              <span
                v-if="user.is_mutual"
                class="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-600 rounded-full font-medium"
              >
                互相关注
              </span>
            </div>
            <p class="text-sm text-ink-400 mb-2">@{{ user.username }}</p>
            <div class="flex items-center gap-5 text-sm text-ink-600">
              <span>
                <Calendar class="w-4 h-4 inline mr-1" />
                加入于 {{ formatDate(user.created_at) }}
              </span>
              <span><b class="text-ink-800">{{ user.follower_count }}</b> 粉丝</span>
              <span><b class="text-ink-800">{{ user.following_count }}</b> 关注</span>
            </div>
          </div>

          <div v-if="!isSelf" class="flex items-center gap-2 shrink-0">
            <el-button
              v-if="!user.is_following"
              type="primary"
              round
              :loading="followLoading"
              class="bg-gradient-to-r from-brand-500 to-brand-600 border-0"
              @click="toggleFollow"
            >
              <UserPlus class="w-4 h-4 mr-1" /> 关注
            </el-button>
            <el-button v-else round :loading="followLoading" @click="toggleFollow">
              <UserCheck class="w-4 h-4 mr-1" /> 已关注
            </el-button>

            <el-button
              round
              :disabled="!user.is_mutual"
              :title="user.is_mutual ? '发送私信' : '互相关注后才能私信'"
              @click="openChat"
            >
              <MessageSquare class="w-4 h-4 mr-1" /> 私信
            </el-button>
          </div>
        </div>

        <p v-if="!isSelf && !user.is_mutual" class="mt-4 text-xs text-ink-400">
          互相关注后即可发送私信。
        </p>
      </div>

      <div v-if="user" class="flex gap-2 mb-6 border-b border-ink-200">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-4 py-3 text-sm font-medium transition-colors relative"
          :class="activeTab === tab.value ? 'text-brand-600' : 'text-ink-500 hover:text-ink-700'"
        >
          {{ tab.label }}
          <span
            v-if="activeTab === tab.value"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
          ></span>
        </button>
      </div>

      <!-- 帖子 -->
      <div v-show="activeTab === 'posts'" class="space-y-3">
        <router-link
          v-for="post in posts"
          :key="post.id"
          :to="`/post/${post.id}`"
          class="card p-5 block hover:-translate-y-0.5 transition-all"
        >
          <h3 class="text-lg font-semibold text-ink-800 mb-1 hover:text-brand-600 transition-colors">
            {{ post.title }}
          </h3>
          <p class="text-sm text-ink-500 line-clamp-2 mb-2">{{ post.content }}</p>
          <div class="flex items-center gap-4 text-xs text-ink-400">
            <span v-if="post.category_name">{{ post.category_name }}</span>
            <span>👁 {{ post.views }}</span>
            <span>👍 {{ post.likes }}</span>
            <span>💬 {{ post.comment_count }}</span>
            <span>{{ formatDate(post.created_at) }}</span>
          </div>
        </router-link>
        <el-empty v-if="posts.length === 0" description="还没有发布帖子" />
      </div>

      <!-- 关注 -->
      <div v-show="activeTab === 'following'" class="card divide-y divide-ink-100">
        <router-link
          v-for="item in following"
          :key="item.id"
          :to="`/user/${item.id}`"
          class="flex items-center gap-3 px-5 py-3 hover:bg-ink-50 transition-colors"
        >
          <img :src="item.avatar || defaultAvatar" class="w-10 h-10 rounded-full bg-ink-50" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink-800 truncate">
              {{ item.nickname || item.username }}
            </p>
            <p class="text-xs text-ink-400">@{{ item.username }}</p>
          </div>
          <span v-if="item.is_mutual" class="text-xs text-emerald-600">互相关注</span>
        </router-link>
        <el-empty v-if="following.length === 0" description="还没有关注任何人" />
      </div>

      <!-- 粉丝 -->
      <div v-show="activeTab === 'followers'" class="card divide-y divide-ink-100">
        <router-link
          v-for="item in followers"
          :key="item.id"
          :to="`/user/${item.id}`"
          class="flex items-center gap-3 px-5 py-3 hover:bg-ink-50 transition-colors"
        >
          <img :src="item.avatar || defaultAvatar" class="w-10 h-10 rounded-full bg-ink-50" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink-800 truncate">
              {{ item.nickname || item.username }}
            </p>
            <p class="text-xs text-ink-400">@{{ item.username }}</p>
          </div>
          <span v-if="item.is_mutual" class="text-xs text-emerald-600">互相关注</span>
        </router-link>
        <el-empty v-if="followers.length === 0" description="还没有粉丝" />
      </div>

      <el-empty v-if="!user && !loading" description="用户不存在" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { Calendar, UserPlus, UserCheck, MessageSquare } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const userId = computed(() => Number(route.params.id))
const isSelf = computed(() => userStore.user?.id === userId.value)

const user = ref<any>(null)
const posts = ref<any[]>([])
const following = ref<any[]>([])
const followers = ref<any[]>([])
const activeTab = ref('posts')
const loading = ref(false)
const followLoading = ref(false)

const tabs = [
  { label: '帖子', value: 'posts' },
  { label: '关注', value: 'following' },
  { label: '粉丝', value: 'followers' },
]

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

const fetchUser = async () => {
  loading.value = true
  try {
    user.value = await request.get(`/users/${userId.value}`)
  } catch {
    user.value = null
  } finally {
    loading.value = false
  }
}

const fetchPosts = async () => {
  try {
    const data = await request.get(`/users/${userId.value}/posts`, { params: { pageSize: 20 } })
    posts.value = data.list
  } catch {}
}

const fetchFollowing = async () => {
  try {
    following.value = await request.get(`/users/${userId.value}/following`)
  } catch {}
}

const fetchFollowers = async () => {
  try {
    followers.value = await request.get(`/users/${userId.value}/followers`)
  } catch {}
}

const toggleFollow = async () => {
  if (!userStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  followLoading.value = true
  try {
    if (user.value.is_following) {
      await request.delete(`/users/${userId.value}/follow`)
      user.value.is_following = false
      user.value.is_mutual = false
      user.value.follower_count = Math.max(0, user.value.follower_count - 1)
      ElMessage.success('已取消关注')
    } else {
      const data = await request.post(`/users/${userId.value}/follow`)
      user.value.is_following = data.is_following
      user.value.is_mutual = data.is_mutual
      user.value.follower_count += 1
      ElMessage.success(data.is_mutual ? '已关注，你们现在是互相关注' : '关注成功')
    }
    fetchFollowers()
  } catch {} finally {
    followLoading.value = false
  }
}

const openChat = () => {
  if (!user.value?.is_mutual) return
  router.push({ path: '/messages', query: { to: userId.value } })
}

const loadTabData = () => {
  if (activeTab.value === 'posts') fetchPosts()
  else if (activeTab.value === 'following') fetchFollowing()
  else fetchFollowers()
}

watch(activeTab, loadTabData)

watch(userId, () => {
  activeTab.value = 'posts'
  fetchUser()
  fetchPosts()
})

onMounted(() => {
  fetchUser()
  fetchPosts()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
