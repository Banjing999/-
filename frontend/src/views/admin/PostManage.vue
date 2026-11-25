<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-ink-800">帖子管理</h1>
      <p class="text-sm text-ink-500 mt-1">审核、置顶、删除社区帖子</p>
    </div>

    <div class="card p-6">
      <div class="flex gap-3 mb-4">
        <el-input
          v-model="keyword"
          placeholder="搜索帖子标题"
          :prefix-icon="Search"
          clearable
          class="w-64"
          @clear="fetchPosts"
          @keyup.enter="fetchPosts"
        />
        <el-select v-model="statusFilter" placeholder="状态" clearable class="w-40" @change="fetchPosts">
          <el-option label="正常" :value="1" />
          <el-option label="已隐藏" :value="0" />
        </el-select>
        <el-button type="primary" @click="fetchPosts">搜索</el-button>
      </div>

      <el-table :data="posts" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <router-link
              :to="`/post/${row.id}`"
              target="_blank"
              class="text-brand-600 hover:underline"
            >
              {{ row.title }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="作者" width="120" prop="nickname" />
        <el-table-column label="分类" prop="category_name" width="120" />
        <el-table-column label="状态" width="200">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">正常</el-tag>
            <el-tag v-else type="info" size="small">已隐藏</el-tag>
            <span class="mx-1">|</span>
            <el-tag v-if="row.is_pinned" type="danger" size="small">置顶</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数据" width="160">
          <template #default="{ row }">
            <span class="text-xs text-ink-500">
              👁{{ row.views }} 👍{{ row.likes }} 💬{{ row.comment_count }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="AI 审批" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.review_status === 'approved'" type="success" size="small">通过</el-tag>
            <el-tag v-else-if="row.review_status === 'manual'" type="warning" size="small">待人工</el-tag>
            <el-tag v-else-if="row.review_status === 'rejected'" type="danger" size="small">违规</el-tag>
            <el-tag v-else type="info" size="small">未审</el-tag>
            <div
              v-if="row.review_score !== null && row.review_score !== undefined"
              class="text-[10px] text-ink-400 mt-0.5"
            >
              {{ row.review_score }} 分 · {{ riskLabel(row.review_risk) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              plain
              :loading="reviewingId === row.id"
              @click="runReview(row)"
            >
              AI 审批
            </el-button>
            <el-button
              size="small"
              :type="row.status === 1 ? 'info' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '隐藏' : '恢复' }}
            </el-button>
            <el-button size="small" @click="togglePin(row)" :type="row.is_pinned ? 'warning' : ''">
              {{ row.is_pinned ? '取消置顶' : '置顶' }}
            </el-button>
            <el-button size="small" type="danger" @click="deletePost(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchPosts"
          @current-change="fetchPosts"
        />
      </div>
    </div>

    <!-- AI 审批结果 -->
    <el-dialog v-model="reviewVisible" title="AI 内容审批" width="560px">
      <div v-if="reviewResult">
        <div class="flex items-center gap-3 mb-4">
          <span
            class="text-2xl font-bold"
            :class="
              reviewResult.score >= 80
                ? 'text-emerald-600'
                : reviewResult.score >= 50
                  ? 'text-amber-600'
                  : 'text-red-600'
            "
          >
            {{ reviewResult.score }}
          </span>
          <div>
            <el-tag :type="decisionType(reviewResult.decision)" size="small">
              {{ decisionText(reviewResult.decision) }}
            </el-tag>
            <span class="ml-2 text-xs text-ink-400">风险：{{ riskLabel(reviewResult.risk) }}</span>
          </div>
          <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-400">
            {{ reviewResult.source === 'ai' ? 'AI 判定' : '本地规则' }}
          </span>
        </div>

        <div class="rounded-lg bg-ink-50 p-3">
          <p class="text-xs font-medium text-ink-600 mb-2">判定依据</p>
          <ul class="space-y-1">
            <li v-for="(reason, idx) in reviewResult.reasons" :key="idx" class="text-xs text-ink-600">
              · {{ reason }}
            </li>
          </ul>
        </div>

        <p class="text-[11px] text-ink-400 mt-3">AI 结果仅供参考，请结合社区规范人工确认。</p>
      </div>
      <template #footer>
        <el-button @click="reviewVisible = false">关闭</el-button>
        <el-button type="success" @click="applyReview(1)">标记通过并恢复</el-button>
        <el-button type="danger" @click="applyReview(0)">标记违规并隐藏</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from 'lucide-vue-next'
import request from '@/utils/request'

const loading = ref(false)
const posts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const statusFilter = ref<number | string>('')

// AI 审批
const reviewingId = ref<number | null>(null)
const reviewVisible = ref(false)
const reviewResult = ref<any>(null)
const reviewTarget = ref<any>(null)

const riskLabel = (risk: string) =>
  ({ low: '低', medium: '中', high: '高' }[risk as string] || '未知')

const decisionText = (decision: string) =>
  ({ approved: '建议通过', manual: '需人工复核', rejected: '建议拒绝' }[decision as string] || '未知')

const decisionType = (decision: string) =>
  decision === 'approved' ? 'success' : decision === 'manual' ? 'warning' : 'danger'

const runReview = async (row: any) => {
  reviewingId.value = row.id
  try {
    reviewResult.value = await request.post(`/ai/posts/${row.id}/review`, undefined, { timeout: 180000 })
    reviewTarget.value = row
    reviewVisible.value = true
    fetchPosts()
  } catch {} finally {
    reviewingId.value = null
  }
}

const applyReview = async (status: number) => {
  if (!reviewTarget.value) return
  try {
    await request.put(`/admin/posts/${reviewTarget.value.id}`, { status })
    ElMessage.success(status === 1 ? '已通过并恢复显示' : '已隐藏该帖子')
    reviewVisible.value = false
    fetchPosts()
  } catch {}
}

const fetchPosts = async () => {
  loading.value = true
  try {
    const data = await request.get('/admin/posts', {
      params: { page: page.value, pageSize: pageSize.value, keyword: keyword.value, status: statusFilter.value },
    })
    posts.value = data.list
    total.value = data.total
  } catch {} finally {
    loading.value = false
  }
}

const toggleStatus = async (row: any) => {
  const next = row.status === 1 ? 0 : 1
  try {
    await request.put(`/admin/posts/${row.id}`, { status: next })
    ElMessage.success(next === 1 ? '已恢复显示' : '已隐藏')
    fetchPosts()
  } catch {}
}

const togglePin = async (row: any) => {
  try {
    await request.put(`/admin/posts/${row.id}`, { is_pinned: row.is_pinned ? 0 : 1 })
    ElMessage.success('更新成功')
    fetchPosts()
  } catch {}
}

const deletePost = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除帖子「${row.title}」吗？`, '警告', { type: 'warning' })
    await request.delete(`/admin/posts/${row.id}`)
    ElMessage.success('删除成功')
    fetchPosts()
  } catch {}
}

onMounted(fetchPosts)
</script>
