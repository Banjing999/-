<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <!-- Hero 轮播图 -->
    <el-carousel
      v-if="!route.query.keyword && !route.params.id"
      height="320px"
      :interval="4000"
      arrow="never"
      class="hero-carousel"
    >
      <el-carousel-item v-for="slide in slides" :key="slide.title">
        <div
          class="h-full bg-cover bg-center flex items-center justify-center text-center"
          :style="{ backgroundImage: `url(${slide.image})` }"
        >
          <div class="absolute inset-0 bg-black/45"></div>
          <div class="relative px-6">
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-3">{{ slide.title }}</h2>
            <p class="text-ink-200 mb-5">{{ slide.subtitle }}</p>
            <router-link
              :to="slide.link"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-white text-sm font-medium hover:bg-brand-400 transition-all"
            >
              {{ slide.button }}
            </router-link>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex gap-6">
        <!-- 主内容 -->
        <main class="flex-1 min-w-0">
          <!-- 筛选 -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.value"
                @click="onTabChange(tab.value)"
                class="px-4 py-2 text-sm rounded-full transition-all"
                :class="
                  activeTab === tab.value
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'bg-white text-ink-600 hover:bg-ink-100'
                "
              >
                {{ tab.label }}
              </button>
            </div>
            <span class="text-sm text-ink-500">
              共 {{ total }} 篇帖子
            </span>
          </div>

          <!-- 帖子列表 -->
          <div class="space-y-4">
            <PostCard v-for="post in posts" :key="post.id" :post="post" />
            <el-empty
              v-if="posts.length === 0 && !loading"
              description="暂无帖子"
              class="py-16"
            />
          </div>

          <!-- 分页 -->
          <div v-if="total > pageSize" class="flex justify-center mt-8">
            <el-pagination
              v-model:current-page="page"
              :page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              background
              @current-change="fetchPosts"
            />
          </div>
        </main>

        <!-- 侧边栏 -->
        <Sidebar />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import PostCard from '@/components/PostCard.vue'
import Sidebar from '@/components/Sidebar.vue'
import request from '@/utils/request'

const img = (prompt: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=landscape_16_9`

const slides = [
  {
    title: '知识分享，共同成长',
    subtitle: '汇聚开发者的智慧社区，探索代码、分享经验',
    button: '发布帖子',
    link: '/post/create',
    image: img('modern tech community workspace, developers collaborating around laptops, warm orange tones, cinematic, photorealistic'),
  },
  {
    title: '热门讨论，一触即达',
    subtitle: '看看社区里大家最近都在聊什么',
    button: '浏览热门',
    link: '/?sort=hot',
    image: img('futuristic digital forum interface with glowing chat bubbles and code snippets, dark blue and orange, photorealistic'),
  },
  {
    title: 'AI 助手，写作更轻松',
    subtitle: '摘要、翻译、自检、扩写，一站式 AI 辅助',
    button: '立即体验',
    link: '/post/create',
    image: img('friendly AI assistant hologram helping write code on a screen, soft warm lighting, photorealistic'),
  },
]

const route = useRoute()
const router = useRouter()

const tabs = [
  { label: '最新', value: 'latest' },
  { label: '热门', value: 'hot' },
]

const posts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const activeTab = ref((route.query.sort as string) || 'latest')

const fetchPosts = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
      sort: activeTab.value,
    }
    if (route.params.id) params.categoryId = route.params.id
    if (route.query.keyword) params.keyword = route.query.keyword

    const data = await request.get('/posts', { params })
    posts.value = data.list
    total.value = data.total
  } catch {} finally {
    loading.value = false
  }
}

// tab 切换 → 同步 URL query
const onTabChange = async (tab: string) => {
  activeTab.value = tab
  page.value = 1
  await router.replace({
    query: { ...route.query, sort: tab },
    params: route.params,
  })
  fetchPosts()
}

watch(
  () => [route.params.id, route.query.keyword, route.query.sort],
  () => {
    activeTab.value = (route.query.sort as string) || 'latest'
    page.value = 1
    fetchPosts()
  }
)

onMounted(fetchPosts)
</script>
