<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { CHANNEL_LABELS, CHANNEL_SHORT, createChannelThumbnail, scaleImageData } from '../utils/colorspace.js'

const props = defineProps({
  imageData: Object,
  availableChannels: { type: Array, default: () => [] },
})
const emit = defineEmits(['change'])

const enabledSet = ref(new Set())
const thumbRefs = ref([])

const allColorChannelsOff = computed(() => {
  const color = props.availableChannels.filter(ch => ch !== 'A')
  return color.length > 0 && color.every(ch => !enabledSet.value.has(ch))
})

const summary = computed(() => {
  if (!props.availableChannels.length) return '—'
  if (props.availableChannels.includes('Grey')) return 'Gray'
  return props.availableChannels.includes('A') ? 'RGBA' : 'RGB'
})

watch(() => props.availableChannels, (chs) => {
  enabledSet.value = new Set(chs)
  emit('change', new Set(chs))
}, { immediate: true })

function toggle(id) {
  const s = new Set(enabledSet.value)
  s.has(id) ? s.delete(id) : s.add(id)
  enabledSet.value = s
  emit('change', new Set(s))
}

function drawThumb(canvas, imageData, channelId) {
  const { width: w, height: h } = imageData
  const padding = 3
  const tw = 46, th = 30
  canvas.width = tw
  canvas.height = th
  const scale = Math.min((tw - padding * 2) / w, (th - padding * 2) / h, 1)
  const fw = Math.max(1, Math.round(w * scale))
  const fh = Math.max(1, Math.round(h * scale))
  const x = Math.round((tw - fw) / 2)
  const y = Math.round((th - fh) / 2)
  // Scale from raw ImageData to preserve RGB values for alpha=0 pixels (GB7 mask)
  // drawImage through canvas loses RGB for transparent pixels due to premultiplied alpha
  const scaled = scaleImageData(imageData, fw, fh)
  const preview = createChannelThumbnail(scaled, channelId)
  canvas.getContext('2d').putImageData(preview, x, y)
}

function renderAll(imageData) {
  if (!imageData) return
  nextTick(() => {
    props.availableChannels.forEach((ch, i) => {
      const el = thumbRefs.value[i]
      if (el) drawThumb(el, imageData, ch)
    })
  })
}

onMounted(() => renderAll(props.imageData))
watch(() => props.imageData, renderAll)
watch(() => props.availableChannels, () => renderAll(props.imageData))
</script>

<template>
  <section class="channels-section">
    <div class="sect-head">
      <span class="sect-title">Каналы</span>
      <span class="summary">{{ summary }}</span>
    </div>

    <div v-if="availableChannels.length" class="channel-list">
      <button
        v-for="(ch, i) in availableChannels"
        :key="ch"
        class="ch-row"
        :class="{ active: enabledSet.has(ch) }"
        @click="toggle(ch)"
      >
        <canvas :ref="el => { if (el) thumbRefs[i] = el }" class="thumb" />
        <div class="ch-info">
          <span class="ch-name">{{ CHANNEL_LABELS[ch] }}</span>
          <span class="ch-short">{{ CHANNEL_SHORT[ch] }}</span>
        </div>
        <span class="badge" :class="{ 'badge-on': enabledSet.has(ch) }">
          {{ enabledSet.has(ch) ? 'Вкл' : 'Выкл' }}
        </span>
      </button>
    </div>

    <p v-if="allColorChannelsOff" class="warning">
      Цветовые каналы отключены.
    </p>
  </section>
</template>

<style scoped>
.channels-section {
  padding: 10px 10px 6px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sect-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sect-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-lo);
}

.summary {
  font-size: 11px;
  color: var(--text-lo);
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ch-row {
  display: grid;
  grid-template-columns: 46px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--r);
  background: var(--widget);
  cursor: pointer;
  text-align: left;
  opacity: 0.55;
  transition: opacity 0.1s, border-color 0.1s, background 0.1s;
}

.ch-row:hover {
  opacity: 0.85;
}

.ch-row.active {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.06);
  opacity: 1;
}

.thumb {
  width: 46px;
  height: 30px;
  background: #111;
  border: 1px solid rgba(0, 0, 0, 0.4);
  display: block;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.ch-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ch-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-hi);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ch-short {
  font-size: 10px;
  color: var(--text-lo);
  display: block;
}

.badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-lo);
  white-space: nowrap;
}

.badge.badge-on {
  background: #d0d0d0;
  border-color: #b8b8b8;
  color: #111;
}

.warning {
  margin-top: 6px;
  font-size: 11px;
  color: #c8a96e;
  line-height: 1.5;
}
</style>
