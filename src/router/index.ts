import { createRouter, createWebHistory } from 'vue-router'
import type { NavigationGuard } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import CharacterSelect from '@/views/CharacterSelect.vue'
import StoryView from '@/views/StoryView.vue'

const devOnly: NavigationGuard = (_, __, next) =>
  import.meta.env.DEV ? next() : next('/')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView },
    { path: '/select', component: CharacterSelect },
    { path: '/story/:characterId', component: StoryView },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminHome.vue'),
      beforeEnter: devOnly,
    },
    {
      path: '/admin/:characterId',
      component: () => import('@/views/admin/AdminStory.vue'),
      beforeEnter: devOnly,
    },
  ],
})

export default router
