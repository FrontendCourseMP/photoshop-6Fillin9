<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { INTERP_METHODS } from '../utils/interpolation.js'

const emit = defineEmits(['resize', 'cancel'])

const dialogRef = ref(null)
const origW = ref(0)
const origH = ref(0)
const mode = ref('percent')
const wInput = ref('100')
const hInput = ref('100')
const linked = ref(true)
const method = ref('bilinear')
const errors = ref({ w: '', h: '' })

let dragActive = false, dragDx = 0, dragDy = 0

const currentMethod = computed(() => INTERP_METHODS.find(m => m.id === method.value))

const megaBefore = computed(() => (origW.value * origH.value / 1_000_000).toFixed(2))

const megaAfter = computed(() => {
  const { w, h } = parsedDims.value
  if (!w || !h) return '—'
  return (w * h / 1_000_000).toFixed(2)
})

const parsedDims = computed(() => {
  if (mode.value === 'percent') {
    const p = parseFloat(wInput.value)
    const q = parseFloat(hInput.value)
    if (!isValid(p, 'pct') || !isValid(q, 'pct')) return { w: 0, h: 0 }
    return {
      w: Math.round(origW.value * p / 100),
      h: Math.round(origH.value * q / 100),
    }
  }
  const w = parseInt(wInput.value)
  const h = parseInt(hInput.value)
  if (!isValid(w, 'px') || !isValid(h, 'px')) return { w: 0, h: 0 }
  return { w, h }
})

function isValid(v, type) {
  if (!isFinite(v) || isNaN(v)) return false
  if (type === 'pct') return v >= 1 && v <= 1000
  return Number.isInteger(v) && v >= 1 && v <= 16000
}

function validate() {
  const parseW = mode.value === 'percent' ? parseFloat(wInput.value) : parseInt(wInput.value)
  const parseH = mode.value === 'percent' ? parseFloat(hInput.value) : parseInt(hInput.value)
  const type = mode.value === 'percent' ? 'pct' : 'px'
  errors.value.w = isValid(parseW, type) ? '' : (mode.value === 'percent' ? 'Введите число от 1 до 1000' : 'Введите целое число от 1 до 16000')
  errors.value.h = isValid(parseH, type) ? '' : (mode.value === 'percent' ? 'Введите число от 1 до 1000' : 'Введите целое число от 1 до 16000')
  return !errors.value.w && !errors.value.h
}

function onWChange() {
  errors.value.w = ''
  if (!linked.value) return
  if (mode.value === 'percent') {
    hInput.value = wInput.value
  } else {
    const v = parseInt(wInput.value)
    if (origW.value && isFinite(v) && v > 0) {
      hInput.value = String(Math.round(v * origH.value / origW.value))
    }
  }
}

function onHChange() {
  errors.value.h = ''
  if (!linked.value) return
  if (mode.value === 'percent') {
    wInput.value = hInput.value
  } else {
    const v = parseInt(hInput.value)
    if (origH.value && isFinite(v) && v > 0) {
      wInput.value = String(Math.round(v * origW.value / origH.value))
    }
  }
}

watch(mode, () => {
  if (mode.value === 'percent') {
    wInput.value = '100'
    hInput.value = '100'
  } else {
    wInput.value = String(origW.value)
    hInput.value = String(origH.value)
  }
  errors.value = { w: '', h: '' }
})

function cancel() {
  cleanup()
  emit('cancel')
  dialogRef.value.close()
}

function apply() {
  if (!validate()) return
  const { w, h } = parsedDims.value
  if (!w || !h) return
  cleanup()
  emit('resize', { width: w, height: h, method: method.value })
  dialogRef.value.close()
}

function onEsc(e) { if (e.key === 'Escape') cancel() }
function cleanup() { document.removeEventListener('keydown', onEsc) }

function open(imageData) {
  origW.value = imageData.width
  origH.value = imageData.height
  mode.value = 'percent'
  wInput.value = '100'
  hInput.value = '100'
  linked.value = true
  method.value = 'bilinear'
  errors.value = { w: '', h: '' }
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
  <dialog ref="dialogRef" class="resize-dialog">
    <div class="dlg-header" @mousedown="startDrag">
      <span class="dlg-title">Изменить размер</span>
      <button class="dlg-close" @click="cancel">✕</button>
    </div>

    <div class="dlg-body">
      <div class="mp-row">
        <div class="mp-cell">
          <span class="mp-label">До</span>
          <span class="mp-val">{{ megaBefore }} МП</span>
          <span class="mp-dims">{{ origW }} × {{ origH }}</span>
        </div>
        <span class="mp-arrow">→</span>
        <div class="mp-cell">
          <span class="mp-label">После</span>
          <span class="mp-val">{{ megaAfter }} МП</span>
          <span class="mp-dims" v-if="parsedDims.w">{{ parsedDims.w }} × {{ parsedDims.h }}</span>
        </div>
      </div>

      <div class="field-row">
        <label class="field-label">Единицы</label>
        <select v-model="mode" class="sel">
          <option value="percent">Проценты</option>
          <option value="pixels">Пиксели</option>
        </select>
      </div>

      <div class="dim-block">
        <div class="dim-row">
          <label class="field-label">Ширина</label>
          <div class="input-wrap">
            <input
              type="number" class="dim-in"
              :class="{ error: errors.w }"
              v-model="wInput"
              :min="mode === 'percent' ? 1 : 1"
              :max="mode === 'percent' ? 1000 : 16000"
              :step="mode === 'percent' ? 0.1 : 1"
              @input="onWChange"
            />
            <span class="unit">{{ mode === 'percent' ? '%' : 'пкс' }}</span>
          </div>
          <span v-if="errors.w" class="err-msg">{{ errors.w }}</span>
        </div>

        <div class="link-row">
          <label class="link-label">
            <input type="checkbox" v-model="linked" />
            Сохранять пропорции
          </label>
        </div>

        <div class="dim-row">
          <label class="field-label">Высота</label>
          <div class="input-wrap">
            <input
              type="number" class="dim-in"
              :class="{ error: errors.h }"
              v-model="hInput"
              :min="mode === 'percent' ? 1 : 1"
              :max="mode === 'percent' ? 1000 : 16000"
              :step="mode === 'percent' ? 0.1 : 1"
              @input="onHChange"
            />
            <span class="unit">{{ mode === 'percent' ? '%' : 'пкс' }}</span>
          </div>
          <span v-if="errors.h" class="err-msg">{{ errors.h }}</span>
        </div>
      </div>

      <div class="field-row">
        <label class="field-label">Интерполяция</label>
        <div class="interp-row">
          <select v-model="method" class="sel">
            <option v-for="m in INTERP_METHODS" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
          <div class="tooltip-wrap">
            <span class="info-icon">ℹ</span>
            <div class="tooltip-box">{{ currentMethod?.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="dlg-footer">
      <button class="btn" @click="cancel">Отмена</button>
      <button class="btn btn-apply" @click="apply">Применить</button>
    </div>
  </dialog>
</template>

<style scoped>
.resize-dialog {
  position: fixed;
  margin: 0;
  background: #242424;
  border: 1px solid #111;
  border-radius: var(--r-lg);
  color: var(--text);
  padding: 0;
  width: 300px;
  box-shadow: 0 12px 40px rgba(0,0,0,.7);
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

.dlg-title { font-size: 13px; font-weight: 600; color: var(--text-hi); }

.dlg-close { background: none; border: none; color: var(--text-lo); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
.dlg-close:hover { color: var(--text-hi); }

.dlg-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r);
  padding: 7px 10px;
}

.mp-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mp-label { font-size: 10px; color: var(--text-lo); text-transform: uppercase; letter-spacing: 0.3px; }
.mp-val   { font-size: 13px; font-weight: 600; color: var(--text-hi); }
.mp-dims  { font-size: 10px; color: var(--text-lo); }

.mp-arrow { color: var(--text-lo); font-size: 14px; }

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 11px;
  color: var(--text-lo);
  width: 78px;
  flex-shrink: 0;
}

.sel {
  flex: 1;
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r);
  color: var(--text);
  padding: 3px 6px;
  font-size: 12px;
  outline: none;
}
.sel:focus { border-color: #666; }

.dim-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dim-in {
  flex: 1;
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r);
  color: var(--text-hi);
  padding: 3px 6px;
  font-size: 12px;
  outline: none;
  min-width: 60px;
}
.dim-in:focus { border-color: #666; }
.dim-in.error { border-color: #a05050; }

.unit { font-size: 11px; color: var(--text-lo); }

.err-msg {
  font-size: 10px;
  color: #c07070;
  width: 100%;
  padding-left: 86px;
  margin-top: -2px;
}

.link-row {
  padding-left: 86px;
}

.link-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-lo);
  cursor: pointer;
}

.interp-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tooltip-wrap {
  position: relative;
  flex-shrink: 0;
}

.info-icon {
  font-size: 13px;
  color: var(--text-lo);
  cursor: default;
  user-select: none;
}

.info-icon:hover { color: var(--text); }

.tooltip-box {
  display: none;
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  width: 200px;
  background: #1a1a1a;
  border: 1px solid var(--sep);
  border-radius: var(--r);
  padding: 7px 9px;
  font-size: 11px;
  color: var(--text);
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0,0,0,.6);
  z-index: 10;
  white-space: normal;
}

.tooltip-wrap:hover .tooltip-box { display: block; }

.dlg-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--sep);
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

.btn-apply { background: var(--active); border-color: #686868; color: var(--text-hi); }
.btn-apply:hover { background: #585858; }
</style>
