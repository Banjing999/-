<template>
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div
      class="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-brand-50"
    ></div>
    <div
      class="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl"
    ></div>
    <div
      class="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-200/30 blur-3xl"
    ></div>

    <div class="relative z-10 w-full max-w-md">
      <div class="text-center mb-8 animate-enter">
        <div
          class="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center shadow-xl shadow-brand-500/30 mb-4"
        >
          <Sparkles class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-ink-800">加入日日升</h1>
        <p class="text-sm text-ink-500 mt-1">创建账号，开启技术交流之旅</p>
      </div>

      <div class="card p-8 animate-enter" style="animation-delay: 0.1s">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          size="large"
        >
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="email">
            <el-input v-model="form.email" placeholder="邮箱" :prefix-icon="Mail" />
          </el-form-item>
          <el-form-item prop="nickname">
            <el-input v-model="form.nickname" placeholder="昵称（选填）" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码（至少6位）"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="确认密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="w-full h-11 rounded-full font-medium bg-gradient-to-r from-brand-500 to-brand-600 border-0 hover:shadow-lg hover:shadow-brand-500/30 transition-all"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form>

        <div class="mt-6 text-center text-sm text-ink-500">
          已有账号？
          <router-link to="/login" class="text-brand-600 font-medium hover:text-brand-700">
            立即登录
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Sparkles, User, Mail, Lock } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度3-20位', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      validator: (_: any, value: string, cb: any) => {
        if (value !== form.password) cb(new Error('两次密码不一致'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}

const handleRegister = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    await userStore.register({
      username: form.username,
      email: form.email,
      password: form.password,
      nickname: form.nickname || undefined,
    })
    ElMessage.success('注册成功！')
    router.push('/')
  } catch {} finally {
    loading.value = false
  }
}
</script>
