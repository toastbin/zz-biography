<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminApi, type CharacterSummary } from '@/composables/useAdminApi'

const router = useRouter()
const api = useAdminApi()

const characters = ref<CharacterSummary[]>([])
const loading = ref(true)
const error = ref('')

const showNewModal = ref(false)
const newCharId = ref('')
const newCharError = ref('')
const creating = ref(false)

onMounted(async () => {
  try {
    characters.value = await api.listCharacters()
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
})

async function confirmCreate() {
  const id = newCharId.value.trim()
  if (!id || !/^[\w-]+$/.test(id)) {
    newCharError.value = '请输入有效的 ID（字母、数字、连字符）'
    return
  }
  creating.value = true
  newCharError.value = ''
  try {
    const created = await api.createCharacter(id)
    characters.value.push(created)
    showNewModal.value = false
    newCharId.value = ''
    router.push(`/admin/${id}`)
  } catch (e) {
    newCharError.value = String(e)
  } finally {
    creating.value = false
  }
}

function openNewModal() {
  newCharId.value = ''
  newCharError.value = ''
  showNewModal.value = true
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
        <button class="btn primary" @click="openNewModal">+ 新建角色</button>
      </div>
    </div>

    <!-- New Character Modal -->
    <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
      <div class="modal">
        <h2 class="modal-title">新建角色</h2>
        <label class="field-label">
          角色 ID
          <input
            v-model="newCharId"
            class="field-input"
            placeholder="e.g. scholar"
            @keyup.enter="confirmCreate"
            autofocus
          />
        </label>
        <p v-if="newCharError" class="field-error">{{ newCharError }}</p>
        <p class="modal-note">
          注意：创建后需手动在 <code>src/data/characters.ts</code> 中添加角色信息，才能在角色选择界面中显示。
        </p>
        <div class="modal-actions">
          <button class="btn" @click="showNewModal = false">取消</button>
          <button class="btn primary" :disabled="creating" @click="confirmCreate">
            {{ creating ? '创建中…' : '确认创建' }}
          </button>
        </div>
      </div>
    </div>
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
.nav-link:hover { color: #f0c040; }

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
.char-manifest.ok { color: #6dbf7a; }

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
.state-msg.error { color: #e06c75; }

/* Buttons */
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
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.modal {
  background: rgba(12, 14, 24, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 2rem;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f0c040;
  margin: 0;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.field-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #f0f0f0;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.field-input:focus { border-color: rgba(240, 192, 64, 0.6); }

.field-error {
  color: #e06c75;
  font-size: 0.82rem;
  margin: -0.25rem 0 0;
}

.modal-note {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.5;
  margin: 0;
}
.modal-note code {
  font-family: monospace;
  color: rgba(240, 192, 64, 0.7);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
</style>
