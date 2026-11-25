<template>
  <div class="p-4 border-b border-ink-100 animate-enter">
    <div class="flex gap-3">
      <img
        :src="comment.avatar || defaultAvatar"
        class="w-10 h-10 rounded-full flex-shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-medium text-ink-700">
            {{ comment.nickname || comment.username }}
          </span>
          <span class="text-xs text-ink-400">{{ formatDate(comment.created_at) }}</span>
        </div>
        <p class="text-sm text-ink-600 leading-relaxed">
          {{ translations?.[comment.id] || comment.content }}
          <span
            v-if="translations?.[comment.id]"
            class="ml-1 text-[10px] px-1 py-0.5 rounded bg-blue-50 text-blue-500 align-middle"
          >译</span>
        </p>
        <div class="flex items-center gap-3 mt-2 text-xs text-ink-400">
          <button
            v-if="userStore.isLoggedIn"
            @click="showReplyInput = !showReplyInput"
            class="hover:text-brand-600 transition-colors flex items-center gap-1"
          >
            <MessageCircle class="w-3.5 h-3.5" /> 回复
          </button>
          <button
            v-if="canDelete"
            @click="$emit('delete', comment.id)"
            class="hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 class="w-3.5 h-3.5" /> 删除
          </button>
        </div>

        <!-- 内联回复输入框 -->
        <div v-if="showReplyInput" class="mt-3">
          <el-input
            v-model="replyText"
            type="textarea"
            :rows="2"
            :placeholder="`回复 ${comment.nickname || comment.username}...`"
            class="mb-2"
          />
          <div class="flex justify-end gap-2">
            <el-button size="small" @click="showReplyInput = false">取消</el-button>
            <el-button
              type="primary"
              size="small"
              :loading="replying"
              :disabled="!replyText.trim()"
              @click="submitReply"
            >
              回复
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 子评论（递归） -->
    <div v-if="comment.children?.length" class="ml-12 mt-2 space-y-0">
      <CommentItem
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :translations="translations"
        @reply="$emit('reply', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { MessageCircle, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  comment: any
  translations?: Record<number, string>
}>()
const emit = defineEmits(['reply', 'delete'])

const userStore = useUserStore()
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const showReplyInput = ref(false)
const replyText = ref('')
const replying = ref(false)

const canDelete = computed(
  () => userStore.isAdmin || userStore.user?.id === props.comment.user_id
)

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

const submitReply = () => {
  if (!replyText.value.trim()) return
  replying.value = true
  emit('reply', {
    parentId: props.comment.id,
    content: replyText.value.trim(),
  })
  replyText.value = ''
  showReplyInput.value = false
  replying.value = false
}
</script>
