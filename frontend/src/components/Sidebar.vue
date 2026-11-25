<template>
  <aside class="w-72 flex-shrink-0 space-y-4 hidden lg:block">
    <!-- 分类 -->
    <div class="card p-4">
      <h3 class="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
        <Layers class="w-4 h-4 text-brand-500" /> 浏览板块
      </h3>
      <div class="space-y-1">
        <router-link
          to="/"
          class="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-brand-50 hover:text-brand-700"
          :class="
            !route.params.id && (!route.query.sort || route.query.sort === 'latest')
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-600'
          "
        >
          <span>全部最新</span>
        </router-link>
        <router-link
          :to="{ path: '/', query: { sort: 'hot' } }"
          class="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-brand-50 hover:text-brand-700"
          :class="
            !route.params.id && route.query.sort === 'hot'
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-600'
          "
        >
          <span>全部热门</span>
        </router-link>
        <div class="h-px bg-ink-100 my-2"></div>
        <router-link
          v-for="cat in categories"
          :key="cat.id"
          :to="`/category/${cat.id}`"
          class="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-brand-50 hover:text-brand-700"
          :class="
            route.params.id == cat.id
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-600'
          "
        >
          <span>{{ cat.name }}</span>
          <span class="text-xs text-ink-400">{{ cat.post_count || 0 }}</span>
        </router-link>
      </div>
    </div>

    <!-- 热门帖子 -->
    <div class="card p-4">
      <h3 class="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
        <Flame class="w-4 h-4 text-red-500" /> 热门帖子
      </h3>
      <div class="space-y-3">
        <router-link
          v-for="(post, idx) in hotPosts"
          :key="post.id"
          :to="`/post/${post.id}`"
          class="flex items-start gap-3 group"
        >
          <span
            class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-bold rounded"
            :class="
              idx < 3
                ? 'bg-gradient-to-br from-red-400 to-red-500 text-white'
                : 'bg-ink-100 text-ink-500'
            "
          >
            {{ idx + 1 }}
          </span>
          <div class="flex-1 min-w-0">
            <p
              class="text-sm text-ink-700 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug"
            >
              {{ post.title }}
            </p>
            <p class="text-xs text-ink-400 mt-0.5">{{ post.views }} 浏览</p>
          </div>
        </router-link>
      </div>
    </div>

    <!-- 最新帖子 -->
    <div class="card p-4">
      <h3 class="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
        <Clock class="w-4 h-4 text-blue-500" /> 最新发布
      </h3>
      <div class="space-y-2">
        <router-link
          v-for="post in latestPosts"
          :key="post.id"
          :to="`/post/${post.id}`"
          class="block group"
        >
          <p
            class="text-sm text-ink-600 group-hover:text-brand-600 transition-colors truncate"
          >
            {{ post.title }}
          </p>
          <p class="text-xs text-ink-400">{{ post.nickname }}</p>
        </router-link>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/utils/request'
import { Layers, Flame, Clock } from 'lucide-vue-next'

const route = useRoute()
const categories = ref<any[]>([])
const hotPosts = ref<any[]>([])
const latestPosts = ref<any[]>([])

onMounted(async () => {
  try {
    const [cats, hot, latest] = await Promise.all([
      request.get('/categories'),
      request.get('/posts/hot', { params: { limit: 5 } }),
      request.get('/posts/latest', { params: { limit: 5 } }),
    ])
    categories.value = cats || []
    hotPosts.value = hot || []
    latestPosts.value = latest || []
  } catch {}
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
