<script setup>
import { ref } from 'vue'
import MenuBar from './components/MenuBar.vue'
import ToolStrip from './components/ToolStrip.vue'
import CanvasArea from './components/CanvasArea.vue'
import ChannelsPanel from './components/ChannelsPanel.vue'
import StatusBar from './components/StatusBar.vue'

const canvasArea = ref(null)
const meta   = ref({ filename: '', width: 0, height: 0, colorDepth: '' })
const zoom   = ref(1)
const cursor = ref({ x: 0, y: 0 })
const activeTool = ref(null)
const imageData  = ref(null)
const availableChannels = ref([])

function onOpen(file) { canvasArea.value?.loadFile(file); activeTool.value = null }
function onSave(format) { canvasArea.value?.saveAs(format) }
function onMeta(m) { meta.value = m }
function onZoomChange(z) { zoom.value = z }
function onCursor(pos) { cursor.value = pos }
function onStatusZoom(z) { canvasArea.value?.setZoom(z) }

function onImageData(id) {
  imageData.value = id
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
</script>

<template>
  <div class="app">
    <MenuBar @open="onOpen" @save="onSave" />
    <div class="workspace">
      <ToolStrip v-model:activeTool="activeTool" />
      <CanvasArea ref="canvasArea" :tool="activeTool"
        @meta="onMeta" @zoom-change="onZoomChange" @cursor="onCursor" @imagedata="onImageData" />
      <aside class="sidebar">
        <header class="inspector-header"><span>Инспектор</span></header>
        <div class="inspector-body">
          <ChannelsPanel v-if="imageData" :imageData="imageData"
            :availableChannels="availableChannels" @change="onChannelsChange" />
        </div>
      </aside>
    </div>
    <StatusBar :meta="meta" :zoom="zoom" :cursor="cursor" @zoom-change="onStatusZoom" />
  </div>
</template>

<style scoped>
.app { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--bg); }
.workspace { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 216px; background: #24262c; border-left: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.inspector-header { padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,.07); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .18em; color: var(--text-lo); flex-shrink: 0; }
.inspector-body { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
</style>
