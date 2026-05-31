<script setup>
import { ref } from 'vue'
import { decodeGb7, encodeGb7 } from '../utils/gb7.js'
import { applyChannelToggle as computeToggle, rgbToLab } from '../utils/colorspace.js'

const props = defineProps({ tool: String })
const emit = defineEmits(['meta', 'zoom-change', 'cursor', 'imagedata', 'pixel-pick'])

const wrapperRef = ref(null)
const canvasRef = ref(null)
const dragging = ref(false)
const zoom = ref(1)
const naturalSize = ref({ w: 0, h: 0 })
const originalImageData = ref(null)
const viewImageData = ref(null)

defineExpose({ loadFile, saveAs, applyChannelToggle, putImageData, commitImageData, setZoom })

function onWheel(e) {
  e.preventDefault()
  const step = e.deltaY < 0 ? 0.1 : -0.1
  setZoom(Math.round((zoom.value + step) * 100) / 100)
}

function setZoom(z) {
  zoom.value = Math.max(0.12, Math.min(3.0, +z))
  emit('zoom-change', zoom.value)
  const { w, h } = naturalSize.value
  const canvas = canvasRef.value
  if (!canvas || !viewImageData.value) return
  canvas.width = w; canvas.height = h
  canvas.style.width = Math.round(w * zoom.value) + 'px'
  canvas.style.height = Math.round(h * zoom.value) + 'px'
  canvas.getContext('2d').putImageData(viewImageData.value, 0, 0)
}

function onMouseMove(e) {
  const canvas = canvasRef.value
  if (!canvas || !naturalSize.value.w) return
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor((e.clientX - rect.left) * naturalSize.value.w / rect.width)
  const y = Math.floor((e.clientY - rect.top) * naturalSize.value.h / rect.height)
  if (x >= 0 && x < naturalSize.value.w && y >= 0 && y < naturalSize.value.h) emit('cursor', { x, y })
}

function onWrapperClick(e) {
  if (props.tool !== 'eyedropper' || !originalImageData.value) return
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor((e.clientX - rect.left) * naturalSize.value.w / rect.width)
  const y = Math.floor((e.clientY - rect.top) * naturalSize.value.h / rect.height)
  const { width, height, data } = originalImageData.value
  if (x < 0 || y < 0 || x >= width || y >= height) return
  const idx = (y * width + x) * 4
  const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3]
  emit('pixel-pick', { x, y, r, g, b, a, lab: rgbToLab(r, g, b) })
}

function onDragOver(e) { e.preventDefault(); dragging.value = true }
function onDragLeave() { dragging.value = false }
function onDrop(e) {
  e.preventDefault(); dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) loadFile(file)
}

async function loadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  let imageData
  if (ext === 'gb7') {
    imageData = decodeGb7(await file.arrayBuffer())
    emitMeta(file.name, imageData.width, imageData.height, '7-bit grayscale (GB7)')
  } else {
    const bitmap = await createImageBitmap(file)
    const tmp = document.createElement('canvas')
    tmp.width = bitmap.width; tmp.height = bitmap.height
    tmp.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close()
    imageData = tmp.getContext('2d').getImageData(0, 0, tmp.width, tmp.height)
    emitMeta(file.name, imageData.width, imageData.height, detectAlpha(imageData) ? '32-bit RGBA' : '24-bit RGB')
  }
  originalImageData.value = imageData
  viewImageData.value = imageData
  naturalSize.value = { w: imageData.width, h: imageData.height }
  emit('imagedata', imageData)
  const wrapper = wrapperRef.value
  if (wrapper) {
    const aw = wrapper.clientWidth - 100
    const ah = wrapper.clientHeight - 100
    const fit = Math.min(aw / imageData.width, ah / imageData.height, 3.0)
    zoom.value = Math.max(0.12, Math.min(3.0, Math.round(fit * 100) / 100))
  } else {
    zoom.value = 1.0
  }
  emit('zoom-change', zoom.value)
  drawCanvas(viewImageData.value)
}

function drawCanvas(id) {
  const canvas = canvasRef.value
  const { w, h } = naturalSize.value
  canvas.width = w; canvas.height = h
  canvas.style.width = Math.round(w * zoom.value) + 'px'
  canvas.style.height = Math.round(h * zoom.value) + 'px'
  canvas.getContext('2d').putImageData(id, 0, 0)
}

function applyChannelToggle(enabledSet) {
  if (!originalImageData.value) return
  viewImageData.value = computeToggle(originalImageData.value, enabledSet)
  drawCanvas(viewImageData.value)
}

function putImageData(imageData) {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = imageData.width; canvas.height = imageData.height
  canvas.style.width = Math.round(imageData.width * zoom.value) + 'px'
  canvas.style.height = Math.round(imageData.height * zoom.value) + 'px'
  canvas.getContext('2d').putImageData(imageData, 0, 0)
}

function commitImageData(imageData) {
  originalImageData.value = imageData
  viewImageData.value = imageData
  naturalSize.value = { w: imageData.width, h: imageData.height }
  drawCanvas(imageData)
}

function detectAlpha(imageData) {
  const d = imageData.data
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true
  return false
}

function emitMeta(filename, width, height, colorDepth) {
  emit('meta', { filename, width, height, colorDepth })
}

async function saveAs(format) {
  const canvas = canvasRef.value
  if (!canvas || !naturalSize.value.w) return
  if (format === 'gb7') {
    triggerDownload(new Blob([encodeGb7(originalImageData.value)]), 'image.gb7')
  } else {
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png'
    const tmp = document.createElement('canvas')
    tmp.width = naturalSize.value.w; tmp.height = naturalSize.value.h
    tmp.getContext('2d').putImageData(originalImageData.value, 0, 0)
    tmp.toBlob(blob => triggerDownload(blob, `image.${format}`), mime, 0.95)
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click(); URL.revokeObjectURL(url)
}
</script>

<template>
  <div ref="wrapperRef" class="canvas-wrapper"
    :class="{ dragging, 'tool-eyedropper': tool === 'eyedropper' }"
    @wheel.prevent="onWheel" @mousemove="onMouseMove" @click="onWrapperClick"
    @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
    <div class="positioner" :style="{ width: Math.round(naturalSize.w * zoom) + 'px', height: Math.round(naturalSize.h * zoom) + 'px' }">
      <canvas ref="canvasRef" class="canvas" />
    </div>
    <div v-if="!naturalSize.w" class="hint">
      <span class="hint-icon">⊞</span>
      <span>Откройте файл через меню или перетащите сюда</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper { flex: 1; overflow: auto; background: #353535; display: flex; align-items: center; justify-content: center; position: relative; }
.canvas-wrapper.dragging { outline: 2px solid #888; outline-offset: -2px; }
.canvas-wrapper.tool-eyedropper { cursor: crosshair; }
.positioner { position: relative; flex-shrink: 0; }
.canvas { display: block; image-rendering: pixelated; image-rendering: crisp-edges; border-radius: 2px; box-shadow: 0 4px 20px rgba(0,0,0,.55); }
.hint { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-lo); font-size: 12px; pointer-events: none; }
.hint-icon { font-size: 28px; opacity: .35; }
</style>
