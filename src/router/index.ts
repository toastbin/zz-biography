import { createRouter, createWebHistory } from 'vue-router'
import CharacterSelect from '@/views/CharacterSelect.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/select' },
    { path: '/select', component: CharacterSelect },
  ],
})

export default router
