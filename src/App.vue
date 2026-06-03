<script setup>
import { ref } from 'vue'
import MenuBar from './components/MenuBar.vue'
import ToolStrip from './components/ToolStrip.vue'
import CanvasArea from './components/CanvasArea.vue'
import ChannelsPanel from './components/ChannelsPanel.vue'
import ColorInfo from './components/ColorInfo.vue'
import StatusBar from './components/StatusBar.vue'
import LevelsDialog from './components/LevelsDialog.vue'
import ResizeDialog from './components/ResizeDialog.vue'
import { applyLevels } from './utils/levels.js'
import { resizeImage } from './utils/interpolation.js'

const canvasArea    = ref(null)
const levelsDialog  = ref(null)
const resizeDialog  = ref(null)
const meta          = ref({ filename: '', width: 0, height: 0, colorDepth: '' })
const zoom          = ref(1)
const cursor        = ref({ x: 0, y: 0 })
const activeTool    = ref(null)
const imageData     = ref(null)
const availableChannels = ref([])
const pickedPixel   = ref(null)
const snapshot      = ref(null)

function onOpen(file) { canvasArea.value?.loadFile(file); activeTool.value = null; pickedPixel.value = null }
function onSave(format) { canvasArea.value?.saveAs(format) }
function onMeta(m) { meta.value = m }
function onZoomChange(z) { zoom.value = z }
function onCursor(pos) { cursor.value = pos }
function onStatusZoom(z) { canvasArea.value?.setZoom(z) }

function onImageData(id) {
  imageData.value = id; pickedPixel.value = null
  availableChannels.value = detectChannels(id)
}

function detectChannels(id) {
  const d = id.data
  let hasAlpha = false, isGrey = true
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 255) hasAlpha = true
    if (d[i] !== d[i + 1] || d[i] !== d[i + 2]) isGrey = false
    if (!isGrey && hasAlpha) break
  }
  return isGrey ? (hasAlpha ? ['Grey','A'] : ['Grey']) : (hasAlpha ? ['R','G','B','A'] : ['R','G','B'])
}

function onChannelsChange(enabledSet) { canvasArea.value?.applyChannelToggle(enabledSet) }
function onPixelPick(pixel) { pickedPixel.value = pixel }

function openLevels() {
  if (!imageData.value) return
  snapshot.value = new ImageData(new Uint8ClampedArray(imageData.value.data), imageData.value.width, imageData.value.height)
  levelsDialog.value?.open(snapshot.value)
}

function onLevelsPreview(s) {
  if (!snapshot.value) return
  canvasArea.value?.putImageData(applyLevels(snapshot.value, s))
}

function onLevelsRestore() {
  if (snapshot.value) canvasArea.value?.putImageData(snapshot.value)
}

function onLevelsApply(s) {
  if (!snapshot.value) return
  const result = applyLevels(snapshot.value, s)
  canvasArea.value?.commitImageData(result)
  imageData.value = result
  availableChannels.value = detectChannels(result)
  snapshot.value = null
}

function onLevelsCancel() {
  if (snapshot.value) { canvasArea.value?.putImageData(snapshot.value); snapshot.value = null }
}

function openResize() {
  if (!imageData.value) return
  resizeDialog.value?.open(imageData.value)
}

function onResize({ width, height, method }) {
  if (!imageData.value) return
  const result = resizeImage(imageData.value, width, height, method)
  canvasArea.value?.commitImageData(result)
  imageData.value = result
  availableChannels.value = detectChannels(result)
  meta.value = { ...meta.value, width: result.width, height: result.height }
}
</script>

<template>
  <div class="app">
    <MenuBar @open="onOpen" @save="onSave" />
    <div class="workspace">
      <ToolStrip v-model:activeTool="activeTool" @levels="openLevels" @resize="openResize" />
      <CanvasArea ref="canvasArea" :tool="activeTool"
        @meta="onMeta" @zoom-change="onZoomChange" @cursor="onCursor"
        @imagedata="onImageData" @pixel-pick="onPixelPick" />
      <aside class="sidebar">
        <header class="inspector-header"><span>Инспектор</span></header>
        <div class="inspector-body">
          <ChannelsPanel v-if="imageData" :imageData="imageData"
            :availableChannels="availableChannels" @change="onChannelsChange" />
          <ColorInfo :pixel="pickedPixel" :isActive="activeTool === 'eyedropper'" />
        </div>
      </aside>
    </div>
    <StatusBar :meta="meta" :zoom="zoom" :cursor="cursor" @zoom-change="onStatusZoom" />
    <LevelsDialog ref="levelsDialog" :availableChannels="availableChannels"
      @preview="onLevelsPreview" @restore="onLevelsRestore"
      @apply="onLevelsApply" @cancel="onLevelsCancel" />
    <ResizeDialog ref="resizeDialog" @resize="onResize" @cancel="() => {}" />
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--bg); }
.workspace { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 216px; background: #24262c; border-left: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.inspector-header { padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,.07); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .18em; color: var(--text-lo); flex-shrink: 0; }
.inspector-body { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
</style>
