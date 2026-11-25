import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/Register.vue'),
      meta: { guest: true },
    },
    {
      path: '/post/:id',
      name: 'post-detail',
      component: () => import('@/views/PostDetail.vue'),
    },
    {
      path: '/post/create',
      name: 'post-create',
      component: () => import('@/views/CreatePost.vue'),
      meta: { auth: true },
    },
    {
      path: '/category/:id',
      name: 'category',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue'),
      meta: { auth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      meta: { auth: true },
    },
    {
      path: '/my/posts',
      name: 'my-posts',
      component: () => import('@/views/MyPosts.vue'),
      meta: { auth: true },
    },
    {
      path: '/my/favorites',
      name: 'my-favorites',
      component: () => import('@/views/MyPosts.vue'),
      meta: { auth: true },
    },
    {
      path: '/my/followers',
      name: 'my-followers',
      component: () => import('@/views/MyFollows.vue'),
      meta: { auth: true },
    },
    {
      path: '/my/following',
      name: 'my-following',
      component: () => import('@/views/MyFollows.vue'),
      meta: { auth: true },
    },
    {
      path: '/user/:id',
      name: 'user-profile',
      component: () => import('@/views/UserProfile.vue'),
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('@/views/Messages.vue'),
      meta: { auth: true },
    },
    // 管理后台嵌套路由
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { auth: true, admin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/Dashboard.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/UserManage.vue'),
        },
        {
          path: 'posts',
          name: 'admin-posts',
          component: () => import('@/views/admin/PostManage.vue'),
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: () => import('@/views/admin/CategoryManage.vue'),
        },
        {
          path: 'stats',
          name: 'admin-stats',
          component: () => import('@/views/admin/Stats.vue'),
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.guest && userStore.isLoggedIn) {
    next('/')
    return
  }

  if (to.meta.auth && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.admin && !userStore.isAdmin) {
    next('/')
    return
  }

  next()
})

export default router
