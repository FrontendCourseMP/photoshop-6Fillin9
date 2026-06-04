<script setup>
import { ref, watch, nextTick } from 'vue'
import { PRESETS, EDGE_STRATEGIES, applyConvolution } from '../utils/convolution.js'

const props = defineProps({ availableChannels: Array })
const emit = defineEmits(['preview', 'restore', 'apply', 'cancel'])

const dialogRef    = ref(null)
const sourceData   = ref(null)
const preset       = ref('identity')
const kernelVals   = ref([...PRESETS[0].kernel])
const edgeStrategy = ref('black')
const prevEnabled  = ref(false)
const processing   = ref(false)
const progress     = ref(0)
const channelStates = ref({})

const LABELS = { R: 'R', G: 'G', B: 'B', A: 'A', Grey: 'Y' }

let dragActive = false, dragDx = 0, dragDy = 0
let rafId = null

watch(() => props.availableChannels, (chs) => {
  const s = {}
  for (const ch of (chs || [])) s[ch] = ch !== 'A'
  channelStates.value = s
}, { immediate: true })

watch(preset, () => {
  const p = PRESETS.find(p => p.id === preset.value)
  if (p) kernelVals.value = [...p.kernel]
  if (prevEnabled.value) schedulePreview()
})

function onKernelInput() { if (prevEnabled.value) schedulePreview() }
function onChannelChange() { if (prevEnabled.value) schedulePreview() }
function onEdgeChange() { if (prevEnabled.value) schedulePreview() }

function onPreviewToggle() {
  if (prevEnabled.value) schedulePreview()
  else emit('restore')
}

function schedulePreview() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => runFilter('preview'))
}

async function runFilter(mode) {
  if (!sourceData.value || processing.value) return
  processing.value = true
  progress.value = 0
  const enabled = Object.entries(channelStates.value).filter(([, v]) => v).map(([k]) => k)
  try {
    const result = await applyConvolution(
      sourceData.value, kernelVals.value, enabled, edgeStrategy.value,
      p => { progress.value = p }
    )
    if (mode === 'preview') {
      emit('preview', result)
    } else {
      cleanup()
      emit('apply', result)
      dialogRef.value?.close()
    }
  } finally {
    processing.value = false
    progress.value = 0
  }
}

function apply() { runFilter('apply') }

function reset() {
  preset.value = 'identity'
  kernelVals.value = [...PRESETS[0].kernel]
  edgeStrategy.value = 'black'
  if (prevEnabled.value) { prevEnabled.value = false; emit('restore') }
}

function cancel() { cleanup(); emit('cancel'); dialogRef.value?.close() }
function onEsc(e) { if (e.key === 'Escape') cancel() }
function cleanup() {
  document.removeEventListener('keydown', onEsc)
  if (rafId) cancelAnimationFrame(rafId)
}

function open(imageData) {
  sourceData.value = imageData
  preset.value = 'identity'
  kernelVals.value = [...PRESETS[0].kernel]
  edgeStrategy.value = 'black'
  prevEnabled.value = false
  processing.value = false
  progress.value = 0
  const s = {}
  for (const ch of (props.availableChannels || [])) s[ch] = ch !== 'A'
  channelStates.value = s
  dialogRef.value.show()
  document.addEventListener('keydown', onEsc)
  nextTick(() => {
    const el = dialogRef.value
    el.style.left = Math.round((window.innerWidth  - el.offsetWidth)  / 2) + 'px'
    el.style.top  = Math.round((window.innerHeight - el.offsetHeight) / 2) + 'px'
  })
}

function startDrag(e) {
  if (e.target.closest('button, select, input, label')) return
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
  <dialog ref="dialogRef" class="conv-dialog">
    <div class="dlg-header" @mousedown="startDrag">
      <span class="dlg-title">Свёртка ядром</span>
      <button class="dlg-close" @click="cancel">✕</button>
    </div>

    <div class="dlg-body">
      <div class="field-row">
        <label class="field-label">Предустановка</label>
        <select v-model="preset" class="sel">
          <option v-for="p in PRESETS" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </div>

      <div class="kernel-section">
        <span class="section-label">Ядро 3×3</span>
        <div class="kernel-grid">
          <input
            v-for="(_, i) in kernelVals" :key="i"
            type="number" class="kernel-in" step="0.01"
            v-model.number="kernelVals[i]"
            @input="onKernelInput"
          />
        </div>
      </div>

      <div class="channels-section">
        <span class="section-label">Каналы</span>
        <div class="channel-checks">
          <label v-for="ch in (availableChannels || [])" :key="ch" class="ch-label">
            <input type="checkbox" v-model="channelStates[ch]" @change="onChannelChange" />
            {{ LABELS[ch] || ch }}
          </label>
        </div>
      </div>

      <div class="field-row">
        <label class="field-label">Края</label>
        <select v-model="edgeStrategy" class="sel" @change="onEdgeChange">
          <option v-for="s in EDGE_STRATEGIES" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </div>

      <label class="preview-label">
        <input type="checkbox" v-model="prevEnabled" @change="onPreviewToggle" />
        Предпросмотр
      </label>

      <div v-if="processing" class="progress-wrap">
        <div class="progress-bar" :style="{ width: (progress * 100).toFixed(0) + '%' }" />
        <span class="progress-text">Обработка… {{ (progress * 100).toFixed(0) }}%</span>
      </div>
    </div>

    <div class="dlg-footer">
      <button class="btn" @click="reset" :disabled="processing">Сбросить</button>
      <button class="btn" @click="cancel" :disabled="processing">Отмена</button>
      <button class="btn btn-apply" @click="apply" :disabled="processing">Применить</button>
    </div>
  </dialog>
</template>

<style scoped>
.conv-dialog {
  position: fixed; margin: 0;
  background: #242424; border: 1px solid #111;
  border-radius: var(--r-lg); color: var(--text);
  padding: 0; width: 320px;
  box-shadow: 0 12px 40px rgba(0,0,0,.7);
}

.dlg-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 8px; border-bottom: 1px solid var(--sep);
  cursor: move; user-select: none;
}

.dlg-title { font-size: 13px; font-weight: 600; color: var(--text-hi); }
.dlg-close { background: none; border: none; color: var(--text-lo); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
.dlg-close:hover { color: var(--text-hi); }

.dlg-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }

.field-row { display: flex; align-items: center; gap: 8px; }
.field-label { font-size: 11px; color: var(--text-lo); width: 72px; flex-shrink: 0; }

.sel {
  flex: 1; background: var(--widget); border: 1px solid var(--sep);
  border-radius: var(--r); color: var(--text); padding: 3px 6px;
  font-size: 12px; outline: none;
}
.sel:focus { border-color: #666; }

.kernel-section, .channels-section { display: flex; flex-direction: column; gap: 5px; }
.section-label { font-size: 10px; color: var(--text-lo); text-transform: uppercase; letter-spacing: 0.25em; }

.kernel-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
}

.kernel-in {
  background: var(--widget); border: 1px solid var(--sep);
  border-radius: var(--r); color: var(--text-hi);
  padding: 4px 5px; font-size: 12px; font-variant-numeric: tabular-nums;
  outline: none; text-align: center; width: 100%;
  appearance: textfield; -moz-appearance: textfield;
}
.kernel-in::-webkit-inner-spin-button,
.kernel-in::-webkit-outer-spin-button { -webkit-appearance: none; }
.kernel-in:focus { border-color: #666; }

.channel-checks { display: flex; flex-wrap: wrap; gap: 6px 12px; }
.ch-label {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--text); cursor: pointer;
}

.preview-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text); cursor: pointer;
}

.progress-wrap {
  position: relative; height: 18px;
  background: var(--widget); border: 1px solid var(--sep);
  border-radius: var(--r); overflow: hidden;
}
.progress-bar { height: 100%; background: #4a4a4a; transition: width 0.1s; }
.progress-text {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--text-lo);
}

.dlg-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 6px;
  padding: 8px 12px 10px; border-top: 1px solid var(--sep);
}

.btn {
  padding: 4px 14px; background: var(--widget); border: 1px solid var(--sep);
  border-radius: var(--r); color: var(--text); font-size: 12px; cursor: pointer;
}
.btn:hover:not(:disabled) { background: var(--hover); color: var(--text-hi); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-apply { background: var(--active); border-color: #686868; color: var(--text-hi); }
.btn-apply:hover:not(:disabled) { background: #585858; }
</style>
