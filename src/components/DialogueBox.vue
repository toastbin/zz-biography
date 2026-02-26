<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  speaker: string | null
  text: string
  isTerminal: boolean
}>()

const emit = defineEmits<{
  advance: []
}>()

const displayed = ref('')
let timer: ReturnType<typeof setInterval> | null = null
const CHAR_INTERVAL = 40

function startTyping() {
  if (timer) clearInterval(timer)
  displayed.value = ''
  let index = 0
  timer = setInterval(() => {
    index++
    displayed.value = props.text.slice(0, index)
    if (index >= props.text.length) {
      clearInterval(timer!)
      timer = null
    }
  }, CHAR_INTERVAL)
}

function handleClick() {
  if (timer) {
    clearInterval(timer)
    timer = null
    displayed.value = props.text
  } else {
    emit('advance')
  }
}

const isDone = computed(() => timer === null && displayed.value === props.text)

watch(() => props.text, startTyping, { immediate: true })

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="dialogue-box" @click="handleClick">
    <div v-if="speaker" class="speaker-name">{{ speaker }}</div>
    <p class="dialogue-text">{{ displayed }}</p>
    <span v-if="isDone && !isTerminal" class="advance-indicator">▼</span>
  </div>
</template>

<style scoped>
.dialogue-box {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 28%;
  background: rgba(10, 10, 20, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding: 1.5rem 2rem 1.5rem 13rem;
  z-index: 3;
  cursor: pointer;
  user-select: none;
}

.speaker-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #f0c040;
  margin-bottom: 0.5rem;
  letter-spacing: 0.05em;
}

.dialogue-text {
  font-size: 1rem;
  line-height: 1.8;
  color: #f0f0f0;
  margin: 0;
}

.advance-indicator {
  position: absolute;
  bottom: 1rem;
  right: 1.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  animation: blink 1.2s ease-in-out infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
</style>
