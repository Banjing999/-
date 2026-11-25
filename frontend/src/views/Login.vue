<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <!-- 背景装饰 -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-blue-50"
    ></div>
    <div
      class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-200/30 blur-3xl"
    ></div>
    <div
      class="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl"
    ></div>

    <div class="relative z-10 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8 animate-enter">
        <div
          class="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center shadow-xl shadow-brand-500/30 mb-4"
        >
          <MessageCircle class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-ink-800">欢迎回到日日升</h1>
        <p class="text-sm text-ink-500 mt-1">登录以继续您的技术探索之旅</p>
      </div>

      <!-- 表单卡片 -->
      <div class="card p-8 animate-enter" style="animation-delay: 0.1s">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          @submit.prevent="handleLogin"
          size="large"
        >
          <el-form-item prop="account">
            <el-input
              v-model="form.account"
              placeholder="用户名 / 邮箱"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="w-full h-11 rounded-full font-medium bg-gradient-to-r from-brand-500 to-brand-600 border-0 hover:shadow-lg hover:shadow-brand-500/30 transition-all"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form>

        <div class="mt-6 text-center text-sm text-ink-500">
          还没有账号？
          <router-link
            to="/register"
            class="text-brand-600 font-medium hover:text-brand-700"
          >
            立即注册
          </router-link>
        </div>

        <div class="mt-6 p-3 rounded-lg bg-ink-50 text-xs text-ink-500">
          <div class="font-medium text-ink-600 mb-1">演示账号：</div>
          <div>管理员: admin / admin123</div>
          <div>普通用户: demo / demo123</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { MessageCircle, User, Lock } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  account: '',
  password: '',
})

const rules: FormRules = {
  account: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await userStore.login(form.account, form.password)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>
