<script setup lang="ts">
import { watch } from 'vue'
import type { AppliedDiff } from '@/composables/useAffinity'

const props = defineProps<{ queue: AppliedDiff[] }>()
const emit = defineEmits<{ consumed: [] }>()

watch(
  () => props.queue[0],
  (item) => {
    if (item) {
      setTimeout(() => emit('consumed'), 1800)
    }
  },
)
</script>

<template>
  <Transition name="toast">
    <div v-if="queue[0]" class="affinity-toast">
      <span class="npc-name">{{ queue[0].npcName }}</span>
      <span class="separator"> 好感度 </span>
      <span :class="queue[0].delta >= 0 ? 'delta-pos' : 'delta-neg'">
        {{ queue[0].delta >= 0 ? '+' : '' }}{{ queue[0].delta }}
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.affinity-toast {
  position: fixed;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  background: rgba(10, 10, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 0.45rem 1.1rem;
  font-size: 0.9rem;
  white-space: nowrap;
  pointer-events: none;
}

.npc-name {
  color: #f0c040;
  font-weight: 600;
}

.separator {
  color: rgba(255, 255, 255, 0.65);
}

.delta-pos {
  color: #6dbf7a;
  font-weight: 700;
}

.delta-neg {
  color: #e06c75;
  font-weight: 700;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
