<script setup>
import { computed } from 'vue'

const props = defineProps({ meta: Object, zoom: Number, cursor: Object })
const emit = defineEmits(['zoom-change'])

const dims = computed(() => props.meta?.width ? `${props.meta.width} × ${props.meta.height}` : '—')
const pos  = computed(() => props.cursor?.x != null ? `${props.cursor.x}, ${props.cursor.y}` : '—')
const displayZoom = computed(() => Math.round((props.zoom ?? 1) * 100))

function onZoomInput(e) {
  const v = Math.max(12, Math.min(300, parseInt(e.target.value) || 100))
  emit('zoom-change', v / 100)
}
</script>

<template>
  <div class="statusbar">
    <div class="zoom-ctrl">
      <input
        type="number" class="zoom-in" min="12" max="300" step="1"
        :value="displayZoom"
        @change="onZoomInput"
      />
      <span class="pct">%</span>
    </div>
    <div class="div" />
    <span class="cell mono">{{ dims }}</span>
    <div class="div" />
    <span class="cell">{{ meta?.colorDepth || '—' }}</span>
    <div class="div" />
    <span class="cell filename">{{ meta?.filename || 'Файл не открыт' }}</span>
    <div class="spacer" />
    <span class="cell mono">{{ pos }}</span>
  </div>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  height: 22px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  padding: 0 4px;
}

.zoom-ctrl {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 0 4px;
}

.zoom-in {
  width: 40px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  color: var(--text-lo);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  padding: 0 2px;
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

.zoom-in::-webkit-inner-spin-button,
.zoom-in::-webkit-outer-spin-button { -webkit-appearance: none; }

.zoom-in:hover,
.zoom-in:focus {
  border-color: var(--sep);
  color: var(--text);
  background: var(--widget);
}

.pct {
  font-size: 11px;
  color: var(--text-lo);
}

.cell {
  padding: 0 8px;
  font-size: 11px;
  color: var(--text-lo);
  white-space: nowrap;
}
.cell.mono { font-variant-numeric: tabular-nums; }
.cell.filename { color: var(--text); }

.div {
  width: 1px;
  height: 12px;
  background: var(--sep);
  flex-shrink: 0;
}

.spacer { flex: 1; }
</style>
