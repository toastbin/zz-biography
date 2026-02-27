<script setup lang="ts">
defineEmits<{
  close: []
  'show-tree': []
  save: []
  home: []
}>()
</script>

<template>
  <div class="game-menu-overlay" @click.self="$emit('close')">
    <div class="game-menu-panel">
      <h2 class="menu-title">菜单</h2>
      <button class="menu-item" @click="$emit('show-tree')">📊 查看决策树</button>
      <button class="menu-item" @click="$emit('save')">💾 存档</button>
      <button class="menu-item" @click="$emit('home')">🏠 回到主界面</button>
      <button class="menu-item close-btn" @click="$emit('close')">✕ 关闭</button>
    </div>
  </div>
</template>

<style scoped>
.game-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.game-menu-panel {
  background: rgba(10, 10, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 220px;
}

.menu-title {
  color: #f0f0f0;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  letter-spacing: 0.05em;
}

.menu-item {
  background: rgba(255, 255, 255, 0.06);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 0.65rem 1.5rem;
  font-size: 0.95rem;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.menu-item:hover {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
  color: #f0c040;
}
</style>
