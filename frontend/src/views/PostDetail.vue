<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- 返回 -->
      <button
        @click="goBack"
        class="flex items-center gap-2 text-sm text-ink-500 hover:text-brand-600 transition-colors mb-4"
      >
        <ArrowLeft class="w-4 h-4" /> 返回列表
      </button>

      <div v-if="post" class="animate-enter">
        <!-- 帖子头部 -->
        <div class="card p-8 mb-6">
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <span
                v-if="post.category_name"
                class="px-3 py-1 text-xs bg-brand-50 text-brand-700 rounded-full font-medium"
              >
                {{ post.category_name }}
              </span>
              <span
                v-if="post.is_pinned"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-md"
              >
                <Pin class="w-3 h-3" /> 置顶
              </span>
              <span
                v-if="showTranslation"
                class="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-md"
              >
                {{ langLabel }} 译文
              </span>
            </div>

            <div class="flex items-center gap-2">
              <el-dropdown trigger="click" @command="translateAll">
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600 transition-colors disabled:opacity-50"
                  :disabled="translating"
                >
                  <Languages class="w-3.5 h-3.5" />
                  {{ translating ? '翻译中...' : 'AI 翻译' }}
                  <ChevronDown class="w-3 h-3" />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="en">English</el-dropdown-item>
                    <el-dropdown-item command="ja">日本語</el-dropdown-item>
                    <el-dropdown-item command="ko">한국어</el-dropdown-item>
                    <el-dropdown-item command="zh">简体中文</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <button
                v-if="translatedTitle"
                @click="showTranslation = !showTranslation"
                class="px-3 py-1.5 text-xs rounded-lg border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
              >
                {{ showTranslation ? '显示原文' : '显示译文' }}
              </button>
            </div>
          </div>

          <h1 class="text-3xl font-bold text-ink-800 mb-4 leading-tight">
            {{ showTranslation && translatedTitle ? translatedTitle : post.title }}
          </h1>

          <div class="flex items-center gap-4 pb-4 border-b border-ink-100">
            <router-link
              :to="`/user/${post.user_id}`"
              class="flex items-center gap-4 group"
              title="查看用户主页"
            >
              <img
                :src="post.avatar || defaultAvatar"
                class="w-10 h-10 rounded-full border-2 border-brand-100"
              />
              <div>
                <p class="font-medium text-ink-700 group-hover:text-brand-600 transition-colors">
                  {{ post.nickname || post.username }}
                </p>
                <p class="text-xs text-ink-400">{{ formatDate(post.created_at) }}</p>
              </div>
            </router-link>
            <div class="flex-1"></div>
            <div class="flex items-center gap-4 text-sm text-ink-400">
              <span class="flex items-center gap-1">
                <Eye class="w-4 h-4" /> {{ post.views }}
              </span>
              <span class="flex items-center gap-1">
                <ThumbsUp class="w-4 h-4" /> {{ post.likes }}
              </span>
              <span class="flex items-center gap-1">
                <MessageSquare class="w-4 h-4" /> {{ post.comment_count }}
              </span>
            </div>
          </div>

          <!-- AI 摘要 -->
          <div v-if="summaryLoading || summary" class="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <div class="flex items-center gap-1.5 mb-2">
              <Sparkles class="w-3.5 h-3.5 text-brand-500" />
              <span class="text-xs font-semibold text-brand-700">AI 摘要</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-ink-400">
                {{ summarySource === 'ai' ? 'AI 生成' : summarySource === 'cache' ? '已缓存' : '本地摘要' }}
              </span>
            </div>
            <div v-if="summaryLoading" class="space-y-2">
              <div class="h-3 w-2/3 bg-white/90 rounded animate-pulse"></div>
              <div class="h-3 w-full bg-white/90 rounded animate-pulse"></div>
              <div class="h-3 w-4/5 bg-white/90 rounded animate-pulse"></div>
            </div>
            <template v-else>
              <p class="text-sm font-medium text-ink-800">{{ oneLiner }}</p>
              <p class="text-xs text-ink-500 mt-1.5 leading-relaxed">{{ summary }}</p>
            </template>
          </div>
          <button
            v-else
            @click="fetchSummary"
            class="mt-5 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700"
          >
            <Sparkles class="w-3.5 h-3.5" /> 生成 AI 摘要
          </button>

          <!-- 正文 -->
          <div
            class="post-content mt-6 whitespace-pre-wrap"
          >{{ showTranslation && translatedContent ? translatedContent : post.content }}</div>

          <!-- 标签 -->
          <div v-if="post.tags?.length" class="flex items-center gap-2 mt-6 pt-4 border-t border-ink-100">
            <Tag class="w-4 h-4 text-ink-400" />
            <span
              v-for="tag in post.tags"
              :key="tag.id"
              class="px-2 py-1 text-xs bg-ink-100 text-ink-600 rounded"
            >
              {{ tag.name }}
            </span>
          </div>

          <!-- 操作栏 -->
          <div class="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-ink-100">
            <button
              @click="toggleLike"
              class="flex flex-col items-center gap-1 px-6 py-3 rounded-xl transition-all"
              :class="
                post.is_liked
                  ? 'bg-brand-50 text-brand-600'
                  : 'hover:bg-ink-50 text-ink-500'
              "
            >
              <ThumbsUp class="w-5 h-5" :class="{ 'fill-current': post.is_liked }" />
              <span class="text-xs">{{ post.is_liked ? '已点赞' : '点赞' }}</span>
            </button>
            <button
              @click="toggleFavorite"
              class="flex flex-col items-center gap-1 px-6 py-3 rounded-xl transition-all"
              :class="
                post.is_favorited
                  ? 'bg-amber-50 text-amber-600'
                  : 'hover:bg-ink-50 text-ink-500'
              "
            >
              <Star class="w-5 h-5" :class="{ 'fill-current': post.is_favorited }" />
              <span class="text-xs">{{ post.is_favorited ? '已收藏' : '收藏' }}</span>
            </button>
          </div>
        </div>

        <!-- 评论区 -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-ink-800 mb-4 flex items-center gap-2">
            <MessageSquare class="w-5 h-5 text-brand-500" />
            评论 ({{ comments.length }})
          </h3>

          <!-- 发表评论 -->
          <div class="mb-6">
            <el-input
              v-model="newComment"
              type="textarea"
              :rows="3"
              placeholder="写下你的评论..."
              class="mb-3"
            />
            <div class="flex justify-end">
              <el-button
                type="primary"
                :loading="submitting"
                :disabled="!userStore.isLoggedIn"
                @click="submitComment"
                class="rounded-full px-6"
              >
                {{ userStore.isLoggedIn ? '发表评论' : '请先登录' }}
              </el-button>
            </div>
          </div>

          <!-- 评论列表 -->
          <div v-if="comments.length" class="divide-y divide-ink-100">
            <CommentItem
              v-for="c in comments"
              :key="c.id"
              :comment="c"
              :translations="showTranslation ? commentTranslations : {}"
              @reply="handleReply"
              @delete="handleDeleteComment"
            />
          </div>
          <el-empty v-else description="还没有评论，快来抢沙发吧！" />
        </div>
      </div>

      <div v-else-if="!loading" class="text-center py-20">
        <p class="text-ink-500">帖子不存在或已删除</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import Navbar from '@/components/Navbar.vue'
import CommentItem from '@/components/CommentItem.vue'
import request from '@/utils/request'
import {
  ArrowLeft,
  Pin,
  Eye,
  ThumbsUp,
  MessageSquare,
  Star,
  Tag,
  Sparkles,
  Languages,
  ChevronDown,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'
const post = ref<any>(null)
const comments = ref<any[]>([])
const loading = ref(true)
const submitting = ref(false)
const newComment = ref('')

// AI 摘要
const summary = ref('')
const oneLiner = ref('')
const summarySource = ref('')
const summaryLoading = ref(false)

// AI 翻译
const langLabelMap: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  zh: '简体中文',
}
const langLabel = ref('English')
const translating = ref(false)
const showTranslation = ref(false)
const translatedTitle = ref('')
const translatedContent = ref('')
const commentTranslations = ref<Record<number, string>>({})

const fetchSummary = async () => {
  if (!post.value || summaryLoading.value) return
  summaryLoading.value = true
  try {
    const data = await request.post(`/ai/posts/${post.value.id}/summary`, undefined, { timeout: 180000 })
    summary.value = data.summary
    oneLiner.value = data.oneLiner
    summarySource.value = data.cached ? 'cache' : data.source
  } catch {
    summary.value = ''
  } finally {
    summaryLoading.value = false
  }
}

const flattenComments = (list: any[]): any[] => {
  const out: any[] = []
  const walk = (items: any[]) => {
    items.forEach((item) => {
      out.push(item)
      if (item.children?.length) walk(item.children)
    })
  }
  walk(list)
  return out
}

const translateAll = async (lang: string) => {
  if (!post.value || translating.value) return
  translating.value = true
  try {
    const nodes = flattenComments(comments.value)
    const texts = [post.value.title, post.value.content, ...nodes.map((c) => c.content)]
    const translations: string[] = []

    // 分批请求，避免单次内容过多
    for (let i = 0; i < texts.length; i += 20) {
      const data = await request.post(
        '/ai/translate',
        {
          texts: texts.slice(i, i + 20),
          targetLang: lang,
        },
        { timeout: 180000 }
      )
      translations.push(...data.translations)
    }

    translatedTitle.value = translations[0] || ''
    translatedContent.value = translations[1] || ''

    const map: Record<number, string> = {}
    nodes.forEach((comment, index) => {
      if (translations[index + 2]) map[comment.id] = translations[index + 2]
    })
    commentTranslations.value = map
    langLabel.value = langLabelMap[lang] || lang
    showTranslation.value = true
    ElMessage.success('翻译完成')
  } catch {} finally {
    translating.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} 天前`
  return date.toLocaleDateString()
}

const fetchPost = async () => {
  loading.value = true
  try {
    post.value = await request.get(`/posts/${route.params.id}`)
    if (post.value.likes === undefined) post.value.likes = 0
  } catch {
    post.value = null
  } finally {
    loading.value = false
  }
}

const fetchComments = async () => {
  try {
    comments.value = await request.get(`/posts/${route.params.id}/comments`)
  } catch {}
}

const toggleLike = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    const data = await request.post(`/posts/${route.params.id}/like`)
    post.value.is_liked = data.liked
    post.value.likes += data.liked ? 1 : -1
  } catch {}
}

const toggleFavorite = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    const data = await request.post(`/posts/${route.params.id}/favorite`)
    post.value.is_favorited = data.favorited
    ElMessage.success(data.favorited ? '收藏成功' : '已取消收藏')
  } catch {}
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  submitting.value = true
  try {
    await request.post(`/posts/${route.params.id}/comments`, {
      content: newComment.value.trim(),
    })
    ElMessage.success('评论成功')
    newComment.value = ''
    fetchComments()
  } catch {} finally {
    submitting.value = false
  }
}

// 处理子评论回复（带 parent_id）
const handleReply = async (payload: { parentId: number; content: string }) => {
  try {
    await request.post(`/posts/${route.params.id}/comments`, {
      content: payload.content,
      parent_id: payload.parentId,
    })
    ElMessage.success('回复成功')
    fetchComments()
  } catch {}
}

// 删除评论
const handleDeleteComment = async (commentId: number) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？', '提示', { type: 'warning' })
    await request.delete(`/posts/${route.params.id}/comments/${commentId}`)
    ElMessage.success('删除成功')
    fetchComments()
  } catch {}
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

onMounted(async () => {
  await fetchPost()
  fetchComments()
  if (post.value && String(post.value.content || '').length >= 100) fetchSummary()
})
</script>
