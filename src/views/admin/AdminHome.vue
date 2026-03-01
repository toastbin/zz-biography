<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminApi, type CharacterSummary } from '@/composables/useAdminApi'
import { useCharacterList } from './composables/useCharacterList'
import NewCharacterModal from './components/NewCharacterModal.vue'

const router = useRouter()
const api = useAdminApi()

const { characters, loading, error } = useCharacterList(api)

const showNewModal = ref(false)

function onCharCreated(summary: CharacterSummary) {
  characters.value.push(summary)
  showNewModal.value = false
  router.push(`/admin/${summary.id}`)
}
</script>

<template>
  <div class="admin-home">
    <div class="panel">
      <header class="panel-header">
        <h1 class="panel-title">故事管理</h1>
        <nav class="panel-nav">
          <router-link to="/" class="nav-link">← 返回主页</router-link>
        </nav>
      </header>

      <div v-if="loading" class="state-msg">加载中…</div>
      <div v-else-if="error" class="state-msg error">{{ error }}</div>

      <ul v-else class="char-list">
        <li v-for="c in characters" :key="c.id" class="char-row">
          <span class="char-id">{{ c.id }}</span>
          <span class="char-meta">{{ c.sceneCount }} 场景</span>
          <span class="char-manifest" :class="{ ok: c.hasManifest }">
            {{ c.hasManifest ? '✓ manifest' : '✗ manifest' }}
          </span>
          <router-link :to="`/admin/${c.id}`" class="edit-btn">编辑 →</router-link>
        </li>
        <li v-if="characters.length === 0" class="state-msg">暂无角色</li>
      </ul>

      <div class="footer-actions">
        <button class="btn primary" @click="showNewModal = true">+ 新建角色</button>
      </div>
    </div>

    <NewCharacterModal
      :open="showNewModal"
      :api="api"
      @created="onCharCreated"
      @cancel="showNewModal = false"
    />
  </div>
</template>

<style scoped>
.admin-home {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 50% 60%, #0d1a2e 0%, #06080f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.panel {
  background: rgba(10, 10, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  width: 100%;
  max-width: 640px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f0c040;
  letter-spacing: 0.15em;
  margin: 0;
}

.nav-link {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}
.nav-link:hover {
  color: #f0c040;
}

.char-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.char-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}

.char-id {
  font-weight: 600;
  color: #f0f0f0;
  min-width: 90px;
  font-family: monospace;
  font-size: 0.95rem;
}

.char-meta {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.85rem;
  min-width: 60px;
}

.char-manifest {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
  flex: 1;
}
.char-manifest.ok {
  color: #6dbf7a;
}

.edit-btn {
  color: #f0c040;
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid rgba(240, 192, 64, 0.4);
  border-radius: 3px;
  transition: background 0.2s, border-color 0.2s;
}
.edit-btn:hover {
  background: rgba(240, 192, 64, 0.15);
  border-color: #f0c040;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
}

.state-msg {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.9rem;
  padding: 0.5rem 0;
}
.state-msg.error {
  color: #e06c75;
}

.btn {
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  padding: 0.55rem 1.25rem;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.btn:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.1);
  border-color: rgba(240, 192, 64, 0.5);
  color: #f0c040;
}
.btn.primary {
  border-color: rgba(240, 192, 64, 0.5);
  color: #f0c040;
}
.btn.primary:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
