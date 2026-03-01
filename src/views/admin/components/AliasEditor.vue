<script setup lang="ts">
import type { AliasRow } from '../composables/useAliasManager'

const props = defineProps<{
  title: string
  rows: AliasRow[]
  saving: boolean
  error: string
  success: boolean
  valuePlaceholder?: string
}>()

const emit = defineEmits<{
  'update:rows': [rows: AliasRow[]]
  save: []
}>()

function addRow() {
  emit('update:rows', [...props.rows, { key: '', value: '' }])
}

function removeRow(i: number) {
  const updated = [...props.rows]
  updated.splice(i, 1)
  emit('update:rows', updated)
}

function updateKey(i: number, key: string) {
  emit(
    'update:rows',
    props.rows.map((r, idx) => (idx === i ? { ...r, key } : r)),
  )
}

function updateValue(i: number, value: string) {
  emit(
    'update:rows',
    props.rows.map((r, idx) => (idx === i ? { ...r, value } : r)),
  )
}
</script>

<template>
  <section class="section">
    <h2 class="section-title">{{ title }}</h2>
    <table class="alias-table">
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td>
            <input
              :value="row.key"
              class="alias-input"
              placeholder="alias"
              @input="updateKey(i, ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td class="arrow-cell">→</td>
          <td>
            <input
              :value="row.value"
              class="alias-input wide"
              :placeholder="valuePlaceholder ?? '/path/…'"
              @input="updateValue(i, ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td>
            <button class="icon-btn" @click="removeRow(i)">✕</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="error" class="field-error">{{ error }}</p>
    <p v-if="success" class="field-success">已保存</p>
    <div class="section-actions">
      <button class="btn sm" @click="addRow">+ Add</button>
      <button class="btn primary sm" :disabled="saving" @click="emit('save')">
        {{ saving ? '…' : 'Save' }}
      </button>
    </div>
    <p class="alias-warning">⚠ 修改别名 key 不会更新引用该别名的场景文件</p>
  </section>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  margin: 0 0 0.2rem;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.alias-table {
  border-collapse: collapse;
  width: 100%;
}
.alias-table td {
  padding: 2px 4px 2px 0;
  vertical-align: middle;
}

.alias-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  color: #f0f0f0;
  padding: 0.3rem 0.5rem;
  font-size: 0.82rem;
  outline: none;
  width: 80px;
  font-family: monospace;
}
.alias-input.wide {
  width: 140px;
}
.alias-input:focus {
  border-color: rgba(240, 192, 64, 0.5);
}

.arrow-cell {
  color: rgba(255, 255, 255, 0.3);
  padding: 0 4px;
  font-size: 0.85rem;
}

.alias-warning {
  font-size: 0.72rem;
  color: rgba(240, 192, 64, 0.45);
  margin: 0;
}

.field-error {
  color: #e06c75;
  font-size: 0.8rem;
  margin: 0;
}
.field-success {
  color: #6dbf7a;
  font-size: 0.8rem;
  margin: 0;
}

.btn {
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  font-family: inherit;
}
.btn.sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
.btn:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.1);
  border-color: rgba(240, 192, 64, 0.45);
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

.icon-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0 4px;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.icon-btn:hover {
  color: #e06c75;
}
</style>
