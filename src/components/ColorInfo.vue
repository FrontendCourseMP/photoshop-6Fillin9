<script setup>
import { computed } from 'vue'

const props = defineProps({
  pixel: Object,
  isActive: Boolean,
})

const hex = computed(() => {
  if (!props.pixel) return ''
  const { r, g, b } = props.pixel
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
})
</script>

<template>
  <section class="eyedropper-section">
    <div class="sect-head">
      <span class="sect-title">Пипетка</span>
      <span class="status-badge" :class="{ active: isActive }">
        {{ isActive ? 'Активна' : 'Ожидает' }}
      </span>
    </div>

    <div v-if="pixel" class="info-box">
      <div class="swatch-row">
        <span
          class="swatch"
          :style="{ background: `rgba(${pixel.r},${pixel.g},${pixel.b},${pixel.a / 255})` }"
        />
        <div class="swatch-text">
          <p class="hex">{{ hex }}</p>
          <p class="pos">X {{ pixel.x }},&nbsp; Y {{ pixel.y }}</p>
        </div>
      </div>

      <div class="info-rows">
        <div class="info-row">
          <dt>RGB</dt>
          <dd>{{ pixel.r }}, {{ pixel.g }}, {{ pixel.b }}</dd>
        </div>
        <div class="info-row">
          <dt>A</dt>
          <dd>{{ pixel.a }}</dd>
        </div>
        <div class="info-row last">
          <dt>LAB</dt>
          <dd>{{ pixel.lab.L }} / {{ pixel.lab.a }} / {{ pixel.lab.b }}</dd>
        </div>
      </div>
    </div>

    <p v-else class="empty">Выберите инструмент и кликните по изображению.</p>
  </section>
</template>

<style scoped>
.eyedropper-section {
  padding: 10px;
  flex: 1;
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

.status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-lo);
}

.status-badge.active {
  background: #d0d0d0;
  border-color: #b8b8b8;
  color: #111;
}

.info-box {
  background: var(--widget);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--r);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.swatch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.swatch {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  flex-shrink: 0;
  display: block;
}

.swatch-text {
  min-width: 0;
}

.hex {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-hi);
  font-family: 'Consolas', 'Menlo', monospace;
  letter-spacing: 0.5px;
}

.pos {
  font-size: 11px;
  color: var(--text-lo);
  margin-top: 2px;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-row {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 6px;
  padding-bottom: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
}

.info-row.last {
  padding-bottom: 0;
  margin-bottom: 0;
  border-bottom: none;
}

dt {
  color: var(--text-lo);
}

dd {
  color: var(--text-hi);
  font-family: 'Consolas', 'Menlo', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty {
  font-size: 11px;
  color: var(--text-lo);
  background: var(--widget);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--r);
  padding: 8px 10px;
  line-height: 1.6;
}
</style>
