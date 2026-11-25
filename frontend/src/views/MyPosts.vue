<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <!-- 页面头部 -->
    <div class="bg-white border-b border-ink-100">
      <div class="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center"
            :class="isFavorites ? 'bg-amber-50' : 'bg-brand-50'"
          >
            <Star v-if="isFavorites" class="w-5 h-5 text-amber-500" />
            <FileText v-else class="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-ink-800">
              {{ isFavorites ? '我的收藏' : '我的帖子' }}
            </h1>
            <p class="text-xs text-ink-400 mt-0.5">共 {{ total }} 条</p>
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

    <div class="max-w-4xl mx-auto px-4 py-6">
      <div class="space-y-3">
        <div
          v-for="post in posts"
          :key="post.id"
          class="card p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <router-link :to="`/post/${post.id}`" class="block">
            <h3 class="text-lg font-semibold text-ink-800 mb-1 hover:text-brand-600 transition-colors">
              {{ post.title }}
            </h3>
            <p v-if="isFavorites" class="text-sm text-ink-500 mb-2">by {{ post.author_name }}</p>
            <p v-else class="text-sm text-ink-500 line-clamp-2 mb-2">
              {{ stripHtml(post.content) }}
            </p>
            <div class="flex items-center gap-4 text-xs text-ink-400">
              <span v-if="post.category_name" class="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">
                {{ post.category_name }}
              </span>
              <span>👁 {{ post.views }}</span>
              <span>👍 {{ post.likes }}</span>
              <span>💬 {{ post.comment_count }}</span>
              <span>{{ formatDate(post.created_at) }}</span>
            </div>
          </router-link>
        </div>
        <el-empty v-if="posts.length === 0 && !loading" :description="isFavorites ? '还没有收藏' : '还没有发帖'" />
      </div>

      <div v-if="total > pageSize" class="flex justify-center mt-8">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          background
          @current-change="fetchData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import { Star, FileText } from 'lucide-vue-next'

const route = useRoute()
const isFavorites = computed(() => route.path.includes('favorites'))

const posts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

const stripHtml = (html: string) => {
  return String(html || '').replace(/<[^>]+>/g, '').slice(0, 150)
}

const fetchData = async () => {
  loading.value = true
  try {
    const url = isFavorites.value ? '/users/me/favorites' : '/users/me/posts'
    const data = await request.get(url, {
      params: { page: page.value, pageSize: pageSize.value },
    })
    posts.value = data.list
    total.value = data.total
  } catch {} finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
