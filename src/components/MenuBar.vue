<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['open', 'save'])

const open = ref(false)
const fileInputRef = ref(null)

const items = [
  { label: 'Открыть…',   action: () => triggerOpen() },
  { sep: true },
  { label: 'Сохранить PNG', action: () => emit('save', 'png') },
  { label: 'Сохранить JPG', action: () => emit('save', 'jpg') },
  { label: 'Сохранить GB7', action: () => emit('save', 'gb7') },
  { sep: true },
  { label: 'Выход',      action: () => {} },
]

function triggerOpen() {
  fileInputRef.value.click()
  open.value = false
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (file) emit('open', file)
  e.target.value = ''
}

function run(item) {
  item.action?.()
  open.value = false
}

const close = () => { open.value = false }
onMounted(() => document.addEventListener('click', close))
onUnmounted(() => document.removeEventListener('click', close))
</script>

<template>
  <div class="menubar" @click.stop>
    <input
      ref="fileInputRef"
      type="file"
      accept=".png,.jpg,.jpeg,.gb7"
      style="display:none"
      @change="onFileChange"
    />
    <div class="entry" :class="{ active: open }" @click="open = !open">
      <span class="entry-label">Файл</span>
      <div v-if="open" class="dropdown" @click.stop>
        <template v-for="item in items" :key="item.label ?? 'sep'">
          <div v-if="item.sep" class="sep" />
          <div v-else class="drop-item" @click="run(item)">{{ item.label }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menubar {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  padding: 0 4px;
  position: relative;
  z-index: 100;
}

.entry {
  position: relative;
  height: 22px;
  display: flex;
  align-items: center;
}

.entry-label {
  padding: 0 10px;
  height: 22px;
  display: flex;
  align-items: center;
  border-radius: var(--r);
  cursor: default;
  color: var(--text);
  font-size: 12px;
}

.entry:hover .entry-label,
.entry.active .entry-label {
  background: var(--hover);
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 180px;
  background: var(--widget);
  border: 1px solid var(--sep);
  border-radius: var(--r-lg);
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
  z-index: 200;
}

.drop-item {
  padding: 5px 10px;
  border-radius: var(--r);
  cursor: default;
  white-space: nowrap;
  color: var(--text);
}

.drop-item:hover {
  background: var(--hover);
  color: var(--text-hi);
}

.sep {
  height: 1px;
  background: var(--sep);
  margin: 3px 4px;
}
</style>
