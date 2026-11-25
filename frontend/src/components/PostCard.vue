<template>
  <router-link
    :to="`/post/${post.id}`"
    class="block card p-5 hover:-translate-y-0.5 animate-enter group"
  >
    <!-- 标签：置顶 -->
    <div class="flex items-center gap-2 mb-2">
      <span
        v-if="post.is_pinned"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-md"
      >
        <Pin class="w-3 h-3" /> 置顶
      </span>
      <span
        v-if="post.category_name"
        class="px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded-md"
      >
        {{ post.category_name }}
      </span>
    </div>

    <!-- 标题 -->
    <h3
      class="text-lg font-semibold text-ink-800 mb-2 group-hover:text-brand-600 transition-colors line-clamp-2"
    >
      {{ post.title }}
    </h3>

    <!-- 摘要 -->
    <p
      v-if="excerpt"
      class="text-sm text-ink-500 line-clamp-2 mb-3 font-serif"
      v-html="excerpt"
    ></p>

    <!-- 底部 -->
    <div class="flex items-center justify-between text-xs text-ink-400">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <img
            :src="post.avatar || defaultAvatar"
            class="w-5 h-5 rounded-full"
          />
          <span>{{ post.nickname || post.username }}</span>
        </div>
        <span>{{ formatDate(post.created_at) }}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1">
          <Eye class="w-3.5 h-3.5" /> {{ post.views }}
        </span>
        <span class="flex items-center gap-1">
          <ThumbsUp class="w-3.5 h-3.5" /> {{ post.likes }}
        </span>
        <span class="flex items-center gap-1">
          <MessageSquare class="w-3.5 h-3.5" /> {{ post.comment_count }}
        </span>
      </div>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pin, Eye, ThumbsUp, MessageSquare } from 'lucide-vue-next'

const props = defineProps<{
  post: any
}>()

const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const excerpt = computed(() => {
  if (!props.post.content) return ''
  // 去除 HTML 标签取前 150 字符
  const text = props.post.content.replace(/<[^>]+>/g, '')
  return text.length > 150 ? text.slice(0, 150) + '...' : text
})

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
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
