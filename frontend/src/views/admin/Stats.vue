<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-ink-800">数据统计</h1>
      <p class="text-sm text-ink-500 mt-1">社区详细数据分析</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- 分类分布 -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-ink-800 mb-4">分类帖子分布</h3>
        <div class="h-64">
          <canvas ref="pieCanvas"></canvas>
        </div>
      </div>

      <!-- 活跃用户 -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-ink-800 mb-4">活跃用户排行</h3>
        <div class="space-y-3">
          <div
            v-for="(user, idx) in detail.activeUsers"
            :key="user.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50 transition-colors"
          >
            <span
              class="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
              :class="
                idx === 0
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                  : idx < 3
                  ? 'bg-brand-500 text-white'
                  : 'bg-ink-100 text-ink-500'
              "
            >
              {{ idx + 1 }}
            </span>
            <div class="flex-1">
              <p class="text-sm font-medium text-ink-700">{{ user.nickname }}</p>
            </div>
            <span class="text-sm text-brand-600 font-medium">
              {{ user.post_count }} 帖
            </span>
          </div>
          <el-empty v-if="!detail.activeUsers?.length" description="暂无数据" />
        </div>
      </div>

      <!-- 热门帖子 -->
      <div class="card p-6 md:col-span-2">
        <h3 class="text-lg font-semibold text-ink-800 mb-4">热门帖子 TOP 10</h3>
        <div class="space-y-2">
          <div
            v-for="(post, idx) in detail.topPosts"
            :key="post.id"
            class="flex items-center gap-4 p-3 rounded-lg border border-ink-100 hover:border-brand-300 hover:bg-brand-50/30 transition-all cursor-pointer"
            @click="$router.push(`/post/${post.id}`)"
          >
            <span
              class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold"
              :class="
                idx < 3 ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white' : 'bg-ink-100 text-ink-500'
              "
            >
              {{ idx + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-ink-800 truncate">{{ post.title }}</p>
              <p class="text-xs text-ink-500">by {{ post.nickname }}</p>
            </div>
            <div class="flex items-center gap-4 text-xs text-ink-500">
              <span>👁 {{ post.views }}</span>
              <span>👍 {{ post.likes }}</span>
              <span>💬 {{ post.comment_count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import request from '@/utils/request'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const detail = reactive<any>({ activeUsers: [], topPosts: [], categoryDistribution: [] })
const pieCanvas = ref<HTMLCanvasElement>()

const fetchData = async () => {
  try {
    const data = await request.get('/admin/stats/detail')
    Object.assign(detail, data)
    await nextTick()
    renderPieChart()
  } catch {}
}

const renderPieChart = () => {
  if (!pieCanvas.value || !detail.categoryDistribution?.length) return

  const colors = ['#f97316', '#f59e0b', '#fb923c', '#ea580c', '#fdba74', '#c2410c', '#fbbf24', '#fed7aa']

  new Chart(pieCanvas.value, {
    type: 'doughnut',
    data: {
      labels: detail.categoryDistribution.map((c: any) => c.name),
      datasets: [
        {
          data: detail.categoryDistribution.map((c: any) => c.post_count),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
      },
    },
  })
}

onMounted(fetchData)
</script>
