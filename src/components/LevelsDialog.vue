<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { computeHistogram } from '../utils/levels.js'

const props = defineProps({
  availableChannels: { type: Array, default: () => [] },
})
const emit = defineEmits(['preview', 'restore', 'apply', 'cancel'])

const dialogRef  = ref(null)
const histCanvas = ref(null)
const localImageData = ref(null)

const CHANNELS_ALL = [
  { id: 'master', label: 'Мастер' },
  { id: 'Grey',   label: 'Серый' },
  { id: 'R',      label: 'Красный' },
  { id: 'G',      label: 'Зелёный' },
  { id: 'B',      label: 'Синий' },
  { id: 'A',      label: 'Альфа' },
]

const visibleChannels = computed(() => {
  const av = props.availableChannels
  return CHANNELS_ALL.filter(ch => {
    if (ch.id === 'master') return true
    if (ch.id === 'Grey')   return av.includes('Grey')
    if (ch.id === 'R')      return av.includes('R')
    if (ch.id === 'G')      return av.includes('G')
    if (ch.id === 'B')      return av.includes('B')
    if (ch.id === 'A')      return av.includes('A')
    return false
  })
})

const dflt = () => ({ black: 0, midPos: 128, white: 255 })

const channel  = ref('master')
const useLog   = ref(false)
const preview  = ref(true)
const settings = ref({
  master: dflt(), Grey: dflt(), R: dflt(), G: dflt(), B: dflt(), A: dflt(),
})

const cur = computed(() => settings.value[channel.value])

const curGamma = computed(() => {
  const { black, midPos, white } = cur.value
  const range = white - black
  if (range < 2) return 1.0
  const norm = (midPos - black) / range
  if (norm <= 0 || norm >= 1) return 1.0
  return +Math.max(0.1, Math.min(9.99, Math.log(0.5) / Math.log(norm))).toFixed(2)
})

function midPosToGamma(ch) {
  const range = ch.white - ch.black
  if (range < 2) return 1.0
  const norm = (ch.midPos - ch.black) / range
  if (norm <= 0 || norm >= 1) return 1.0
  return +Math.max(0.1, Math.min(9.99, Math.log(0.5) / Math.log(norm))).toFixed(2)
}

function gammaToMidPos(gamma, black, white) {
  return Math.round(black + Math.pow(0.5, gamma) * (white - black))
}

function onBlack(e) {
  const v = Math.max(0, Math.min(+e.target.value, 253))
  const ch = settings.value[channel.value]
  ch.black = Math.min(v, ch.white - 2)
  if (ch.midPos <= ch.black) ch.midPos = ch.black + 1
}
function onWhite(e) {
  const v = Math.max(2, Math.min(+e.target.value, 255))
  const ch = settings.value[channel.value]
  ch.white = Math.max(v, ch.black + 2)
  if (ch.midPos >= ch.white) ch.midPos = ch.white - 1
}
function onMidPos(e) {
  const ch = settings.value[channel.value]
  ch.midPos = Math.max(ch.black + 1, Math.min(+e.target.value, ch.white - 1))
}
function onGammaInput(e) {
  const g = Math.max(0.1, Math.min(9.99, +e.target.value))
  const ch = settings.value[channel.value]
  ch.midPos = gammaToMidPos(g, ch.black, ch.white)
}

function drawHistogram() {
  if (!localImageData.value || !histCanvas.value) return
  const canvas = histCanvas.value
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, W, H)
  const histChannel = channel.value === 'Grey' ? 'master' : channel.value
  const counts = computeHistogram(localImageData.value, histChannel)
  let maxCount = 0
  for (let i = 0; i < 256; i++) if (counts[i] > maxCount) maxCount = counts[i]
  if (!maxCount) return
  ctx.fillStyle = '#999'
  const barW = W / 256
  for (let i = 0; i < 256; i++) {
    const h = useLog.value
      ? (Math.log(counts[i] + 1) / Math.log(maxCount + 1)) * H
      : (counts[i] / maxCount) * H
    ctx.fillRect(Math.floor(i * barW), H - h, Math.ceil(barW + 0.5), h)
  }
}

watch([() => channel.value, () => useLog.value], drawHistogram)

let rafId = null
function schedulePreview() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    preview.value ? emit('preview', buildSettings()) : emit('restore')
    rafId = null
  })
}
watch(settings, schedulePreview, { deep: true })
watch(preview, v => v ? schedulePreview() : emit('restore'))

function buildSettings() {
  const s = settings.value
  return Object.fromEntries(
    Object.keys(s).map(k => [k, { black: s[k].black, white: s[k].white, gamma: midPosToGamma(s[k]) }])
  )
}

function reset() { settings.value[channel.value] = dflt() }

function cleanup() { document.removeEventListener('keydown', onEsc) }

function cancel() { cleanup(); emit('cancel'); dialogRef.value.close() }
function apply()  { cleanup(); emit('apply', buildSettings()); dialogRef.value.close() }

function onEsc(e) { if (e.key === 'Escape') cancel() }

function open(imageData) {
  localImageData.value = imageData
  settings.value = { master: dflt(), Grey: dflt(), R: dflt(), G: dflt(), B: dflt(), A: dflt() }
  channel.value = 'master'
  preview.value = true
  useLog.value = false
  dialogRef.value.show()
  document.addEventListener('keydown', onEsc)
  nextTick(() => {
    const el = dialogRef.value
    el.style.left = Math.round((window.innerWidth  - el.offsetWidth)  / 2) + 'px'
    el.style.top  = Math.round((window.innerHeight - el.offsetHeight) / 2) + 'px'
    drawHistogram()
  })
}

let dragActive = false, dragDx = 0, dragDy = 0

function startDrag(e) {
  if (e.target.closest('button, select, input')) return
  dragActive = true
  const rect = dialogRef.value.getBoundingClientRect()
  dragDx = e.clientX - rect.left
  dragDy = e.clientY - rect.top
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e) {
  if (!dragActive) return
  dialogRef.value.style.left = (e.clientX - dragDx) + 'px'
  dialogRef.value.style.top  = (e.clientY - dragDy) + 'px'
}

function stopDrag() {
  dragActive = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialogRef" class="levels-dialog">
    <div class="dlg-header" @mousedown="startDrag">
      <span class="dlg-title">Уровни</span>
      <button class="dlg-close" @click="cancel">✕</button>
    </div>

    <div class="dlg-body">
      <div class="row-top">
        <select v-model="channel" class="chan-select">
          <option v-for="ch in visibleChannels" :key="ch.id" :value="ch.id">{{ ch.label }}</option>
        </select>
        <label class="log-toggle">
          <input type="checkbox" v-model="useLog" />
          Лог
        </label>
      </div>

      <canvas ref="histCanvas" class="histogram" width="280" height="80" />
      <div class="grad-bar" />

      <div class="slider-wrap">
        <input type="range" class="sl sl-black" min="0" max="253" :value="cur.black" @input="onBlack" />
        <input type="range" class="sl sl-mid"   min="0" max="255" :value="cur.midPos" @input="onMidPos" />
        <input type="range" class="sl sl-white" min="2" max="255" :value="cur.white" @input="onWhite" />
      </div>

      <div class="val-row">
        <div class="val-group">
          <label class="val-label">Чёрная точка</label>
          <input type="number" class="val-in" min="0" max="253" :value="cur.black" @change="onBlack" />
        </div>
        <div class="val-group">
          <label class="val-label">Гамма</label>
          <input type="number" class="val-in" min="0.10" max="9.99" step="0.01" :value="curGamma" @change="onGammaInput" />
        </div>
        <div class="val-group">
          <label class="val-label">Белая точка</label>
          <input type="number" class="val-in" min="2" max="255" :value="cur.white" @change="onWhite" />
        </div>
      </div>

      <label class="preview-row">
        <input type="checkbox" :checked="preview" @change="e => preview = e.target.checked" />
        Предпросмотр
      </label>
    </div>

    <div class="dlg-footer">
      <button class="btn" @click="reset">Сброс</button>
      <div class="footer-right">
        <button class="btn" @click="cancel">Отмена</button>
        <button class="btn btn-apply" @click="apply">Применить</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.levels-dialog {
  position: fixed;
  margin: 0;
  background: #242424;
  border: 1px solid #111;
  border-radius: var(--r-lg);
  color: var(--text);
  padding: 0;
  width: 320px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
}

.dlg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--sep);
  cursor: move;
  user-select: none;
}

.dlg-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-hi);
}

.dlg-close {
  background: none;
  border: none;
  color: var(--text-lo);
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  line-height: 1;
}
.dlg-close:hover { color: var(--text-hi); }

.dlg-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chan-select {
  flex: 1;
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r);
  color: var(--text);
  padding: 3px 6px;
  font-size: 12px;
  outline: none;
}
.chan-select:focus { border-color: #666; }

.log-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-lo);
  cursor: pointer;
  white-space: nowrap;
}

.histogram {
  display: block;
  width: 100%;
  height: 80px;
  border-radius: 3px;
  border: 1px solid var(--sep);
}

.grad-bar {
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(to right, #000, #fff);
  border: 1px solid var(--sep);
}

.slider-wrap {
  position: relative;
  height: 20px;
}

.sl {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  pointer-events: none;
  margin: 0;
  padding: 0;
  outline: none;
}

.sl::-webkit-slider-runnable-track { height: 4px; background: transparent; }

.sl::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: all;
  width: 10px;
  height: 16px;
  border-radius: 2px;
  cursor: ew-resize;
  margin-top: -6px;
  border: 1px solid;
}

.sl-black::-webkit-slider-thumb { background: #1a1a1a; border-color: #777; }
.sl-mid::-webkit-slider-thumb   { background: #888;    border-color: #bbb; }
.sl-white::-webkit-slider-thumb { background: #e8e8e8; border-color: #bbb; }

.sl::-moz-range-thumb {
  pointer-events: all;
  width: 10px;
  height: 16px;
  border-radius: 2px;
  cursor: ew-resize;
  border: 1px solid;
}
.sl-black::-moz-range-thumb { background: #1a1a1a; border-color: #777; }
.sl-mid::-moz-range-thumb   { background: #888;    border-color: #bbb; }
.sl-white::-moz-range-thumb { background: #e8e8e8; border-color: #bbb; }

.val-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.val-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.val-label {
  font-size: 10px;
  color: var(--text-lo);
}

.val-in {
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r);
  color: var(--text-hi);
  padding: 3px 5px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  outline: none;
  width: 100%;
}
.val-in:focus { border-color: #666; }

.preview-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text);
}

.dlg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--sep);
}

.footer-right {
  display: flex;
  gap: 6px;
}

.btn {
  padding: 4px 14px;
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.btn:hover { background: var(--hover); color: var(--text-hi); }

.btn-apply {
  background: var(--active);
  border-color: #686868;
  color: var(--text-hi);
}
.btn-apply:hover { background: #585858; }
</style>
