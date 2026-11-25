<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-ink-800">用户管理</h1>
        <p class="text-sm text-ink-500 mt-1">管理社区成员，支持批量导入导出</p>
      </div>
      <div class="flex gap-2">
        <el-upload
          :show-file-list="false"
          :before-upload="handleImport"
          accept=".json,.csv"
        >
          <el-button :icon="Upload">批量导入</el-button>
        </el-upload>
        <el-button type="primary" :icon="Download" @click="handleExport">
          批量导出
        </el-button>
      </div>
    </div>

    <div class="card p-6">
      <!-- 搜索栏 -->
      <div class="flex gap-3 mb-4">
        <el-input
          v-model="keyword"
          placeholder="搜索用户名/邮箱"
          :prefix-icon="Search"
          clearable
          class="w-64"
          @clear="fetchUsers"
          @keyup.enter="fetchUsers"
        />
        <el-select v-model="roleFilter" placeholder="角色" clearable class="w-40" @change="fetchUsers">
          <el-option label="管理员" value="admin" />
          <el-option label="普通用户" value="user" />
        </el-select>
        <el-button type="primary" @click="fetchUsers">搜索</el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <img
                :src="row.avatar || defaultAvatar"
                class="w-8 h-8 rounded-full"
              />
              <div>
                <p class="font-medium text-sm">{{ row.nickname }}</p>
                <p class="text-xs text-ink-400">{{ row.username }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role_name === 'admin' ? 'warning' : 'info'" size="small">
              {{ row.role_name === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editUser(row)">编辑</el-button>
            <el-button size="small" @click="resetPassword(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchUsers"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="420px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role_id" class="w-full">
            <el-option label="管理员" :value="1" />
            <el-option label="普通用户" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Search } from 'lucide-vue-next'
import request from '@/utils/request'

const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'
const loading = ref(false)
const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const roleFilter = ref('')

const editVisible = ref(false)
const editForm = reactive({ id: null as number | null, nickname: '', email: '', role_id: 2, status: 1 })

const formatDate = (d: string) => new Date(d).toLocaleString()

const fetchUsers = async () => {
  loading.value = true
  try {
    const data = await request.get('/admin/users', {
      params: { page: page.value, pageSize: pageSize.value, keyword: keyword.value, role: roleFilter.value },
    })
    users.value = data.list
    total.value = data.total
  } catch {} finally {
    loading.value = false
  }
}

const handleStatusChange = async (row: any) => {
  try {
    await request.put(`/admin/users/${row.id}`, { status: row.status })
    ElMessage.success('状态已更新')
  } catch {
    row.status = row.status === 1 ? 0 : 1
  }
}

const editUser = (row: any) => {
  editForm.id = row.id
  editForm.nickname = row.nickname
  editForm.email = row.email
  editForm.role_id = row.role_id
  editForm.status = row.status
  editVisible.value = true
}

const saveUser = async () => {
  if (!editForm.id) return
  try {
    await request.put(`/admin/users/${editForm.id}`, {
      nickname: editForm.nickname,
      email: editForm.email,
      role_id: editForm.role_id,
      status: editForm.status,
    })
    ElMessage.success('保存成功')
    editVisible.value = false
    fetchUsers()
  } catch {}
}

const resetPassword = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新密码（至少6位）', '重置密码', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputValidator: (val) => {
        if (!val || val.length < 6) return '密码至少6位'
        return true
      },
    })
    await request.put(`/admin/users/${row.id}/reset-password`, { newPassword: value })
    ElMessage.success('密码重置成功')
  } catch {}
}

const handleExport = async () => {
  try {
    const data = await request.get('/admin/users/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {}
}

const handleImport = async (file: any) => {
  try {
    const text = await file.text()
    const users = JSON.parse(text)
    const result = await request.post('/admin/users/import', { users })
    ElMessage.success(`导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`)
    fetchUsers()
  } catch {
    ElMessage.error('导入失败，请检查文件格式')
  }
  return false
}

onMounted(fetchUsers)
</script>
