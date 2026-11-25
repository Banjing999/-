<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-ink-800 mb-6 flex items-center gap-2">
        <PenLine class="w-6 h-6 text-brand-500" /> 发布新帖子
      </h1>

      <div class="card p-6 animate-enter">
        <el-form :model="form" label-width="80px" label-position="top">
          <el-form-item label="标题" required>
            <el-input
              v-model="form.title"
              placeholder="一个吸引人的标题..."
              maxlength="200"
              show-word-limit
              size="large"
            />
          </el-form-item>

          <el-form-item label="分类">
            <el-select
              v-model="form.category_id"
              placeholder="选择分类"
              class="w-full"
              size="large"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="标签">
            <el-select
              v-model="form.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入标签后回车添加"
              class="w-full"
              size="large"
            >
              <el-option
                v-for="tag in availableTags"
                :key="tag.id"
                :label="tag.name"
                :value="tag.name"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="正文" required>
            <div class="w-full">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-ink-500">编写内容</span>
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    @click="runExpand"
                    :disabled="expanding"
                    class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    <Wand2 class="w-3.5 h-3.5" />
                    {{ expanding ? '扩写中...' : 'AI 扩写' }}
                  </button>
                  <button
                    type="button"
                    @click="runCheck"
                    :disabled="checking"
                    class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    <Sparkles class="w-3.5 h-3.5" />
                    {{ checking ? '检查中...' : 'AI 自检' }}
                  </button>
                  <span class="text-xs text-ink-400">{{ form.content.length }} 字</span>
                </div>
              </div>
              <textarea
                v-model="form.content"
                placeholder="在这里编写你的帖子内容，直接输入文字即可，空行可分隔段落..."
                rows="18"
                class="w-full px-4 py-3 text-sm leading-7 border border-ink-200 rounded-lg resize-y focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              ></textarea>

              <!-- AI 自检结果 -->
              <div
                v-if="checkResult"
                class="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4"
              >
                <div class="flex items-center gap-2 mb-2">
                  <Sparkles class="w-4 h-4 text-brand-500" />
                  <span class="text-sm font-semibold text-ink-800">AI 自检</span>
                  <span
                    class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="
                      checkResult.score >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : checkResult.score >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    "
                  >
                    {{ checkResult.score }} 分
                  </span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-ink-400">
                    {{ checkResult.source === 'ai' ? 'AI 生成' : '本地规则' }}
                  </span>
                </div>
                <p class="text-xs text-ink-500 mb-3">{{ checkResult.summary }}</p>

                <ul v-if="checkResult.issues.length" class="space-y-2.5">
                  <li
                    v-for="(issue, idx) in checkResult.issues"
                    :key="idx"
                    class="flex items-start gap-2 text-xs"
                  >
                    <span
                      class="px-1.5 py-0.5 rounded shrink-0"
                      :class="
                        issue.severity === 'high'
                          ? 'bg-red-100 text-red-600'
                          : issue.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-ink-100 text-ink-500'
                      "
                    >
                      {{ issue.type }}
                    </span>
                    <div class="min-w-0">
                      <p class="text-ink-700">{{ issue.message }}</p>
                      <p v-if="issue.suggestion" class="text-ink-400 mt-0.5">
                        建议：{{ issue.suggestion }}
                      </p>
                    </div>
                  </li>
                </ul>
                <p v-else class="text-xs text-emerald-600">未发现明显问题，可以放心发布。</p>
              </div>
            </div>
          </el-form-item>

          <div class="flex justify-end gap-3 pt-4">
            <el-button size="large" @click="router.back()">取消</el-button>
            <el-button
              type="primary"
              size="large"
              :loading="submitting"
              class="rounded-full px-8 bg-gradient-to-r from-brand-500 to-brand-600 border-0"
              @click="submit"
            >
              发布帖子
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- AI 扩写结果预览 -->
      <el-dialog
        v-model="expandVisible"
        title="AI 扩写结果"
        width="680px"
        :close-on-click-modal="false"
      >
        <div
          class="text-sm text-ink-600 leading-7 whitespace-pre-wrap max-h-[50vh] overflow-y-auto rounded-lg bg-ink-50 p-4"
        >
          {{ expandResult }}
        </div>
        <p class="mt-3 text-xs text-ink-400">
          AI 在你的草稿基础上补全语句和段落，技术细节请在发布前自行核对。
        </p>
        <template #footer>
          <el-button @click="expandVisible = false">取消</el-button>
          <el-button @click="applyExpand('append')">追加到正文</el-button>
          <el-button type="primary" @click="applyExpand('replace')">替换正文</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import { PenLine, Sparkles, Wand2 } from 'lucide-vue-next'

const router = useRouter()
const submitting = ref(false)
const categories = ref<any[]>([])
const availableTags = ref<any[]>([])

const checking = ref(false)
const checkResult = ref<any>(null)

const expanding = ref(false)
const expandVisible = ref(false)
const expandResult = ref('')

const form = reactive({
  title: '',
  content: '',
  category_id: null as number | null,
  tags: [] as string[],
})

const fetchCategories = async () => {
  try {
    categories.value = await request.get('/categories')
  } catch {}
}

const runExpand = async () => {
  if (!form.title.trim()) {
    ElMessage.warning('请先填写标题')
    return
  }
  if (form.content.trim().length < 10) {
    ElMessage.warning('请先写几句草稿，AI 会在此基础上扩写')
    return
  }
  expanding.value = true
  try {
    const data = await request.post(
      '/ai/expand',
      {
        title: form.title.trim(),
        content: form.content.trim(),
      },
      { timeout: 180000 }
    )
    expandResult.value = data.content
    expandVisible.value = true
  } catch {} finally {
    expanding.value = false
  }
}

const applyExpand = (mode: 'replace' | 'append') => {
  form.content =
    mode === 'replace'
      ? expandResult.value
      : `${form.content.trim()}\n\n${expandResult.value}`
  expandVisible.value = false
  ElMessage.success(mode === 'replace' ? '已替换正文' : '已追加到正文')
}

const runCheck = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请先填写标题和正文')
    return
  }
  checking.value = true
  try {
    checkResult.value = await request.post(
      '/ai/check',
      {
        title: form.title,
        content: form.content,
      },
      { timeout: 180000 }
    )
  } catch {} finally {
    checking.value = false
  }
}

// 内容变化后清空旧的检查结果
watch(
  () => [form.title, form.content],
  () => {
    checkResult.value = null
  }
)

const submit = async () => {
  if (!form.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!form.content.trim()) {
    ElMessage.warning('请输入正文')
    return
  }
  submitting.value = true
  try {
    const data = await request.post('/posts', {
      title: form.title.trim(),
      content: form.content,
      category_id: form.category_id,
      tags: form.tags,
    })
    ElMessage.success('发帖成功！')
    router.push(`/post/${data.id}`)
  } catch {} finally {
    submitting.value = false
  }
}

onMounted(fetchCategories)
</script>
