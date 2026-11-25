<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-ink-800">仪表盘</h1>
      <p class="text-sm text-ink-500 mt-1">欢迎回来，{{ userStore.nickname }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div
        v-for="(stat, idx) in statsCards"
        :key="idx"
        class="card p-5 animate-enter cursor-pointer group"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-ink-500 mb-1">{{ stat.label }}</p>
            <p class="text-3xl font-bold text-ink-800">{{ stat.value }}</p>
            <p v-if="stat.sub" class="text-xs text-brand-600 mt-1">
              今日 {{ stat.sub }}
            </p>
          </div>
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            :style="{ background: stat.bg }"
          >
            <component :is="stat.icon" class="w-6 h-6" :style="{ color: stat.color }" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- 趋势图 -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-ink-800 mb-4">近 7 天活跃度</h3>
        <div ref="trendChartRef" class="h-64">
          <canvas ref="trendCanvas"></canvas>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-ink-800 mb-4">快捷操作</h3>
        <div class="grid grid-cols-2 gap-3">
          <router-link
            to="/admin/users"
            class="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-all flex items-center gap-3"
          >
            <Users class="w-5 h-5 text-blue-600" />
            <div>
              <p class="text-sm font-medium text-ink-800">用户管理</p>
              <p class="text-xs text-ink-500">管理社区成员</p>
            </div>
          </router-link>
          <router-link
            to="/admin/posts"
            class="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 hover:shadow-md transition-all flex items-center gap-3"
          >
            <FileText class="w-5 h-5 text-brand-600" />
            <div>
              <p class="text-sm font-medium text-ink-800">帖子管理</p>
              <p class="text-xs text-ink-500">审核和管理内容</p>
            </div>
          </router-link>
          <router-link
            to="/admin/categories"
            class="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-md transition-all flex items-center gap-3"
          >
            <Layers class="w-5 h-5 text-amber-600" />
            <div>
              <p class="text-sm font-medium text-ink-800">分类管理</p>
              <p class="text-xs text-ink-500">管理论坛板块</p>
            </div>
          </router-link>
          <router-link
            to="/admin/stats"
            class="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-md transition-all flex items-center gap-3"
          >
            <BarChart3 class="w-5 h-5 text-purple-600" />
            <div>
              <p class="text-sm font-medium text-ink-800">数据统计</p>
              <p class="text-xs text-ink-500">查看详细报表</p>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import request from '@/utils/request'
import {
  Users,
  FileText,
  MessageSquare,
  Layers,
  UserPlus,
  TrendingUp,
  BarChart3,
} from 'lucide-vue-next'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const userStore = useUserStore()
const data = ref<any>({})
const trendCanvas = ref<HTMLCanvasElement>()

const statsCards = computed(() => [
  {
    label: '用户总数',
    value: data.value.totalUsers || 0,
    sub: data.value.todayUsers,
    icon: Users,
    bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    color: '#ea580c',
  },
  {
    label: '帖子总数',
    value: data.value.totalPosts || 0,
    sub: data.value.todayPosts,
    icon: FileText,
    bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    color: '#d97706',
  },
  {
    label: '评论总数',
    value: data.value.totalComments || 0,
    icon: MessageSquare,
    bg: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
    color: '#c2410c',
  },
  {
    label: '分类数量',
    value: data.value.totalCategories || 0,
    icon: Layers,
    bg: 'linear-gradient(135deg, #fecaca 0%, #fed7aa 100%)',
    color: '#9a3412',
  },
])

const fetchData = async () => {
  try {
    data.value = await request.get('/admin/stats/dashboard')
    await nextTick()
    renderChart()
  } catch {}
}

const renderChart = () => {
  if (!trendCanvas.value || !data.value.trend) return

  const trend = data.value.trend
  const labels = trend.map((t: any) => new Date(t.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }))

  new Chart(trendCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '帖子',
          data: trend.map((t: any) => t.posts_count),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '评论',
          data: trend.map((t: any) => t.comments_count),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  })
}

onMounted(fetchData)
</script>
