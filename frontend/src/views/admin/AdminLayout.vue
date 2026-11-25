<template>
  <div class="min-h-screen bg-ink-50 flex">
    <!-- 侧边栏 -->
    <aside class="w-60 bg-white border-r border-ink-200 flex-shrink-0 h-screen sticky top-0">
      <div class="p-5 border-b border-ink-200">
        <div class="flex items-center gap-2">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center"
          >
            <MessageCircle class="w-5 h-5 text-white" />
          </div>
          <span class="font-bold text-ink-800">日日升管理</span>
        </div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="border-0"
      >
        <el-menu-item index="/admin">
          <LayoutDashboard class="w-4 h-4" /> 仪表盘
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <Users class="w-4 h-4" /> 用户管理
        </el-menu-item>
        <el-menu-item index="/admin/posts">
          <FileText class="w-4 h-4" /> 帖子管理
        </el-menu-item>
        <el-menu-item index="/admin/categories">
          <Layers class="w-4 h-4" /> 分类管理
        </el-menu-item>
        <el-menu-item index="/admin/stats">
          <BarChart3 class="w-4 h-4" /> 数据统计
        </el-menu-item>
      </el-menu>
      <div class="p-4 border-t border-ink-200 mt-auto absolute bottom-0 left-0 right-0">
        <router-link
          to="/"
          class="flex items-center gap-2 text-sm text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft class="w-4 h-4" /> 返回前台
        </router-link>
      </div>
    </aside>

    <!-- 主内容 -->
    <div class="flex-1 min-w-0 p-8">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MessageCircle, LayoutDashboard, Users, FileText, Layers, BarChart3, ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style>
.el-menu {
  background: transparent;
}
.el-menu-item {
  margin: 4px 8px;
  border-radius: 8px;
  height: 42px;
  line-height: 42px;
}
</style>
