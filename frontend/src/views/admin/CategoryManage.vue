<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-ink-800">分类管理</h1>
        <p class="text-sm text-ink-500 mt-1">管理论坛板块分类</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增分类</el-button>
    </div>

    <div class="card p-6">
      <el-table :data="categories" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="图标" width="80">
          <template #default="{ row }">
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center"
            >
              <component :is="getIcon(row.icon)" class="w-5 h-5 text-brand-600" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="sort_order" label="排序" width="100" />
        <el-table-column prop="post_count" label="帖子数" width="100" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleDateString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑分类' : '新增分类'" width="440px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="分类名称" maxlength="20" />
        </el-form-item>
        <el-form-item label="图标">
          <div class="grid grid-cols-6 gap-2 w-full">
            <button
              v-for="ic in iconOptions"
              :key="ic.name"
              type="button"
              class="w-11 h-11 rounded-lg flex items-center justify-center border transition-all"
              :class="
                form.icon === ic.name
                  ? 'border-brand-500 bg-brand-50 text-brand-600'
                  : 'border-ink-200 text-ink-500 hover:border-brand-300'
              "
              :title="ic.name"
              @click="form.icon = ic.name"
            >
              <component :is="ic.comp" class="w-5 h-5" />
            </button>
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Monitor,
  Atom,
  BookOpen,
  Gamepad2,
  Film,
  Trophy,
  UtensilsCrossed,
  MapPin,
  Home,
  Heart,
  GraduationCap,
  Briefcase,
  Tag,
} from 'lucide-vue-next'
import request from '@/utils/request'

// 可选图标（name 与数据库 seed 中保存的 kebab-case 名称一致）
const iconOptions = [
  { name: 'monitor', comp: Monitor },
  { name: 'atom', comp: Atom },
  { name: 'book-open', comp: BookOpen },
  { name: 'gamepad-2', comp: Gamepad2 },
  { name: 'film', comp: Film },
  { name: 'trophy', comp: Trophy },
  { name: 'utensils-crossed', comp: UtensilsCrossed },
  { name: 'map-pin', comp: MapPin },
  { name: 'home', comp: Home },
  { name: 'heart', comp: Heart },
  { name: 'graduation-cap', comp: GraduationCap },
  { name: 'briefcase', comp: Briefcase },
  { name: 'tag', comp: Tag },
]

const iconMap: Record<string, any> = Object.fromEntries(
  iconOptions.map((ic) => [ic.name, ic.comp])
)
const getIcon = (name: string) => iconMap[name] || Tag

const loading = ref(false)
const categories = ref<any[]>([])
const dialogVisible = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', icon: 'tag', sort_order: 0 })

const fetchCategories = async () => {
  loading.value = true
  try {
    categories.value = await request.get('/admin/categories')
  } catch {} finally {
    loading.value = false
  }
}

const openDialog = (row?: any) => {
  if (row) {
    editing.value = row
    form.name = row.name
    form.icon = row.icon || 'tag'
    form.sort_order = row.sort_order
  } else {
    editing.value = null
    form.name = ''
    form.icon = 'tag'
    form.sort_order = 0
  }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  try {
    if (editing.value) {
      await request.put(`/admin/categories/${editing.value.id}`, form)
    } else {
      await request.post('/admin/categories', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchCategories()
  } catch {}
}

const deleteCategory = async (row: any) => {
  const hasPosts = row.post_count > 0
  try {
    await ElMessageBox.confirm(
      hasPosts
        ? `分类「${row.name}」下有 ${row.post_count} 篇帖子，删除后这些帖子将变为未分类，确定删除吗？`
        : `确定删除分类「${row.name}」吗？`,
      '警告',
      { type: 'warning', confirmButtonText: '删除' }
    )
    await request.delete(`/admin/categories/${row.id}`)
    ElMessage.success('删除成功')
    fetchCategories()
  } catch {}
}

onMounted(fetchCategories)
</script>
