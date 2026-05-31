<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({ imageData: Object })
const thumbRef = ref(null)

function drawThumb(imageData) {
  if (!imageData || !thumbRef.value) return
  const canvas = thumbRef.value
  const { width: w, height: h } = imageData
  const scale = Math.min(42 / w, 28 / h, 1)
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))
  canvas.width = tw
  canvas.height = th
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  tmp.getContext('2d').putImageData(imageData, 0, 0)
  canvas.getContext('2d').drawImage(tmp, 0, 0, tw, th)
}

onMounted(async () => {
  await nextTick()
  drawThumb(props.imageData)
})

watch(() => props.imageData, async (id) => {
  await nextTick()
  drawThumb(id)
})
</script>

<template>
  <div class="layers-panel">
    <div class="header">Слои</div>
    <div class="list">
      <div class="layer-row">
        <span class="eye">◉</span>
        <canvas ref="thumbRef" class="thumb" />
        <span class="name">Фон</span>
      </div>
    </div>
    <div class="toolbar">
      <button class="tb-btn" title="Новый слой">+</button>
      <button class="tb-btn" title="Поднять">↑</button>
      <button class="tb-btn" title="Опустить">↓</button>
      <button class="tb-btn" title="Дублировать">⧉</button>
      <button class="tb-btn" title="Удалить">✕</button>
    </div>
  </div>
</template>

<style scoped>
.layers-panel {
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.header {
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-lo);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--sep);
}

.list {
  padding: 4px 6px;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 6px;
  border-radius: var(--r);
  background: var(--widget);
}

.eye {
  font-size: 11px;
  color: var(--text-hi);
  flex-shrink: 0;
  width: 12px;
  line-height: 1;
}

.thumb {
  max-width: 42px;
  max-height: 28px;
  background: #1a1a1a;
  border: 1px solid var(--sep);
  border-radius: 3px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.name {
  font-size: 11px;
  color: var(--text);
}

.toolbar {
  display: flex;
  border-top: 1px solid var(--sep);
  background: var(--bg);
  padding: 2px 4px;
  gap: 2px;
}

.tb-btn {
  flex: 1;
  height: 20px;
  background: transparent;
  border: none;
  color: var(--text-lo);
  cursor: pointer;
  font-size: 12px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-btn:hover {
  background: var(--hover);
  color: var(--text-hi);
}
</style>
