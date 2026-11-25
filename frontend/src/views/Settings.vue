<template>
  <div class="min-h-screen bg-ink-50">
    <Navbar />

    <div class="max-w-3xl mx-auto px-4 py-8">
      <!-- 页面头部 -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-ink-800 flex items-center gap-2">
          <Settings class="w-6 h-6 text-brand-500" /> 账号设置
        </h1>
        <p class="text-sm text-ink-400 mt-1">管理你的个人资料与账号安全</p>
      </div>

      <div class="flex gap-1 mb-6 bg-white rounded-full p-1 shadow-sm w-fit">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-5 py-2 text-sm rounded-full transition-all font-medium flex items-center gap-1.5"
          :class="
            activeTab === tab.value
              ? 'bg-brand-500 text-white shadow shadow-brand-500/30'
              : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
          "
        >
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- 基本资料 -->
      <div v-show="activeTab === 'profile'" class="card p-6 animate-enter">
        <div class="flex items-center gap-4 mb-6 pb-5 border-b border-ink-100">
          <img
            :src="profileForm.avatar || userStore.user?.avatar || defaultAvatar"
            class="w-16 h-16 rounded-full border-2 border-brand-100 shadow"
          />
          <div>
            <h2 class="text-lg font-semibold text-ink-800">基本资料</h2>
            <p class="text-xs text-ink-400 mt-0.5">这些信息会展示在你的主页和帖子中</p>
          </div>
        </div>
        <el-form :model="profileForm" label-width="84px" class="max-w-md">
          <el-form-item label="用户名">
            <el-input :model-value="userStore.user?.username" disabled />
            <p class="text-xs text-ink-400 mt-1">用户名不可修改</p>
          </el-form-item>
          <el-form-item label="昵称">
            <el-input v-model="profileForm.nickname" maxlength="50" show-word-limit />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="profileForm.email" placeholder="name@example.com" />
          </el-form-item>
          <el-form-item label="头像 URL">
            <el-input v-model="profileForm.avatar" placeholder="留空使用默认头像" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="profileSaving" @click="saveProfile">
              保存修改
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 修改密码 -->
      <div v-show="activeTab === 'password'" class="card p-6 animate-enter">
        <div class="flex items-center gap-4 mb-6 pb-5 border-b border-ink-100">
          <div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <KeyRound class="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-ink-800">修改密码</h2>
            <p class="text-xs text-ink-400 mt-0.5">定期更换密码可以保护账号安全</p>
          </div>
        </div>
        <el-form :model="passwordForm" label-width="84px" class="max-w-md">
          <el-form-item label="旧密码">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="passwordForm.newPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认新密码">
            <el-input v-model="passwordForm.confirm" type="password" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="passwordSaving" @click="savePassword">
              确认修改
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import Navbar from '@/components/Navbar.vue'
import request from '@/utils/request'
import { Settings, User, KeyRound } from 'lucide-vue-next'

const userStore = useUserStore()
const defaultAvatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=default'

const tabs = [
  { label: '基本资料', value: 'profile', icon: User },
  { label: '修改密码', value: 'password', icon: KeyRound },
]
const activeTab = ref('profile')

const profileSaving = ref(false)
const profileForm = reactive({ nickname: '', email: '', avatar: '' })

const passwordSaving = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirm: '' })

const saveProfile = async () => {
  if (!profileForm.nickname.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  profileSaving.value = true
  try {
    const data = await request.put('/users/me/profile', profileForm)
    if (userStore.user) {
      userStore.user.nickname = data.nickname
      userStore.user.email = data.email
      userStore.user.avatar = data.avatar
    }
    ElMessage.success('资料已更新')
  } catch {} finally {
    profileSaving.value = false
  }
}

const savePassword = async () => {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    ElMessage.warning('请填写完整')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  passwordSaving.value = true
  try {
    await request.put('/users/me/password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirm = ''
  } catch {} finally {
    passwordSaving.value = false
  }
}

onMounted(async () => {
  profileForm.nickname = userStore.nickname || ''
  profileForm.avatar = userStore.user?.avatar || ''
  try {
    const data = await request.get('/users/me')
    profileForm.email = data.email || ''
  } catch {}
})
</script>
