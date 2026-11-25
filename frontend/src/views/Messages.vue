<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <div class="max-w-6xl mx-auto px-4 py-6">
      <div class="card overflow-hidden flex" style="height: calc(100vh - 7.5rem)">
        <!-- 会话列表 -->
        <aside class="w-64 sm:w-72 border-r border-ink-100 flex flex-col shrink-0">
          <div class="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
            <span class="text-sm font-semibold text-ink-800">私信</span>
            <span class="text-xs text-ink-400">{{ conversations.length }} 个会话</span>
          </div>
          <div class="flex-1 overflow-y-auto">
            <button
              v-for="item in conversations"
              :key="item.id"
              @click="selectPeer(item.id)"
              class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              :class="item.id === peerId ? 'bg-brand-50/70' : 'hover:bg-ink-50'"
            >
              <img
                :src="item.avatar || defaultAvatar"
                class="w-10 h-10 rounded-full bg-ink-50 shrink-0"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-ink-800 truncate">
                    {{ item.nickname || item.username }}
                  </span>
                  <span class="text-[10px] text-ink-400 shrink-0">
                    {{ formatTime(item.last_at) }}
                  </span>
                </div>
                <p class="text-xs text-ink-400 truncate mt-0.5">{{ item.last_content }}</p>
              </div>
              <span
                v-if="item.unread > 0"
                class="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center shrink-0"
              >
                {{ item.unread > 99 ? '99+' : item.unread }}
              </span>
            </button>
            <el-empty
              v-if="conversations.length === 0"
              :image-size="60"
              description="还没有会话"
            />
          </div>
        </aside>

        <!-- 聊天窗口 -->
        <section class="flex-1 flex flex-col min-w-0">
          <template v-if="peer">
            <div class="px-5 py-3 border-b border-ink-100 flex items-center gap-3">
              <img
                :src="peer.avatar || defaultAvatar"
                class="w-9 h-9 rounded-full bg-ink-50"
              />
              <div class="min-w-0 flex-1">
                <router-link
                  :to="`/user/${peer.id}`"
                  class="text-sm font-semibold text-ink-800 hover:text-brand-600 transition-colors"
                >
                  {{ peer.nickname || peer.username }}
                </router-link>
                <p class="text-xs text-ink-400">@{{ peer.username }}</p>
              </div>
              <span
                v-if="mutual"
                class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
              >
                互相关注
              </span>
            </div>

            <div ref="listRef" class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex"
                :class="msg.sender_id === meId ? 'justify-end' : 'justify-start'"
              >
                <img
                  v-if="msg.sender_id !== meId"
                  :src="peer.avatar || defaultAvatar"
                  class="w-8 h-8 rounded-full mr-2 self-end bg-ink-50"
                />
                <div class="max-w-[70%]">
                  <div
                    class="px-3.5 py-2 rounded-2xl text-sm leading-6 whitespace-pre-wrap break-words"
                    :class="
                      msg.sender_id === meId
                        ? 'bg-brand-500 text-white rounded-br-sm'
                        : 'bg-white border border-ink-100 text-ink-700 rounded-bl-sm'
                    "
                  >
                    {{ msg.content }}
                  </div>
                  <p
                    class="text-[10px] text-ink-400 mt-1"
                    :class="msg.sender_id === meId ? 'text-right' : ''"
                  >
                    {{ formatTime(msg.created_at) }}
                  </p>
                </div>
              </div>
              <p
                v-if="messages.length === 0 && !blocked && !loadingThread"
                class="text-center text-xs text-ink-400 py-10"
              >
                还没有消息，打个招呼吧
              </p>
            </div>

            <div v-if="blocked" class="border-t border-ink-100 p-5 text-center">
              <p class="text-sm text-ink-500 mb-3">你们还不是互相关注关系，互相关注后才能私信。</p>
              <router-link
                :to="`/user/${peer.id}`"
                class="inline-flex items-center px-4 py-2 rounded-full text-sm text-white bg-gradient-to-r from-brand-500 to-brand-600"
              >
                去用户主页关注
              </router-link>
            </div>
            <div v-else class="border-t border-ink-100 p-3 flex items-end gap-2">
              <textarea
                v-model="input"
                rows="1"
                placeholder="输入消息，Enter 发送，Shift + Enter 换行"
                class="flex-1 px-3 py-2 text-sm leading-6 border border-ink-200 rounded-lg resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                @keydown.enter.exact.prevent="send"
              ></textarea>
              <el-button
                type="primary"
                :loading="sending"
                :disabled="!input.trim()"
                @click="send"
              >
                发送
              </el-button>
            </div>
          </template>

          <div v-else class="flex-1 flex flex-col items-center justify-center text-sm text-ink-400">
            <MessageSquare class="w-10 h-10 text-ink-200 mb-3" />
            <p>选择左侧会话，或到用户主页发起私信</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { MessageSquare } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const meId = computed(() => userStore.user?.id)
const peerId = computed(() => Number(route.query.to) || 0)

const conversations = ref<any[]>([])
const peer = ref<any>(null)
const messages = ref<any[]>([])
const mutual = ref(true)
const blocked = ref(false)
const input = ref('')
const sending = ref(false)
const loadingThread = ref(false)
const listRef = ref<HTMLElement | null>(null)

const formatTime = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === now.toDateString()) return time
  return `${date.getMonth() + 1}-${date.getDate()} ${time}`
}

const scrollToBottom = async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}

const isNearBottom = () => {
  const el = listRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

const fetchConversations = async () => {
  try {
    conversations.value = await request.get('/messages/conversations')
  } catch {}
}

const loadThread = async (id: number, silent = false) => {
  if (!id) return
  if (!silent) loadingThread.value = true
  try {
    const data = await request.get(`/messages/${id}`, { params: { pageSize: 50 } })
    peer.value = data.peer
    messages.value = data.list
    mutual.value = data.mutual
    blocked.value = false
    if (!silent || isNearBottom()) scrollToBottom()
    fetchConversations()
  } catch (err: any) {
    if (err?.response?.status === 403) {
      blocked.value = true
      mutual.value = false
      messages.value = []
      !silent && loadPeerInfo(id)
    }
  } finally {
    if (!silent) loadingThread.value = false
  }
}

const loadPeerInfo = async (id: number) => {
  try {
    peer.value = await request.get(`/users/${id}`)
  } catch {}
}

const selectPeer = (id: number) => {
  if (id === peerId.value) return
  router.push({ path: '/messages', query: { to: String(id) } })
}

const send = async () => {
  const content = input.value.trim()
  if (!content || !peerId.value || sending.value) return
  sending.value = true
  try {
    await request.post(`/messages/${peerId.value}`, { content })
    input.value = ''
    await loadThread(peerId.value, true)
    scrollToBottom()
  } catch {} finally {
    sending.value = false
  }
}

// 轮询：会话列表 + 当前会话新消息
let timer: number | undefined
const poll = async () => {
  fetchConversations()
  if (!peerId.value || blocked.value) return
  try {
    const data = await request.get(`/messages/${peerId.value}`, { params: { pageSize: 50 } })
    const last = messages.value[messages.value.length - 1]
    const nextLast = data.list[data.list.length - 1]
    if (data.list.length !== messages.value.length || nextLast?.id !== last?.id) {
      const atBottom = isNearBottom()
      messages.value = data.list
      if (atBottom) scrollToBottom()
      fetchConversations()
    }
  } catch {}
}

watch(peerId, (id) => {
  if (!id) {
    peer.value = null
    messages.value = []
    blocked.value = false
    return
  }
  loadThread(id)
})

onMounted(async () => {
  await fetchConversations()
  if (peerId.value) loadThread(peerId.value)
  timer = window.setInterval(poll, 4000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>
