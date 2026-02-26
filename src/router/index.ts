import { createRouter, createWebHistory } from 'vue-router'
import CharacterSelect from '@/views/CharacterSelect.vue'
import StoryView from '@/views/StoryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/select' },
    { path: '/select', component: CharacterSelect },
    { path: '/story/:characterId', component: StoryView },
  ],
})

export default router
