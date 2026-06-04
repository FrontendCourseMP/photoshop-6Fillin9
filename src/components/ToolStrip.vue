<script setup>
defineProps({ activeTool: String })
const emit = defineEmits(['update:activeTool', 'levels', 'resize', 'filter'])
</script>

<template>
  <div class="tool-panel">
    <button class="tool-btn" :class="{ active: activeTool === 'eyedropper' }"
      title="Пипетка"
      @click="emit('update:activeTool', activeTool === 'eyedropper' ? null : 'eyedropper')">
      <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2 L18 6 L9 15 L5 11 Z" />
        <path d="M12 4 L16 8" stroke-width="1" opacity="0.55" />
        <path d="M5 11 L2.5 17.5" />
        <circle cx="2" cy="18.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    </button>

    <button class="tool-btn" title="Уровни" @click="emit('levels')">
      <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor">
        <rect x="2"  y="11" width="4" height="7" rx="1" opacity="0.9" />
        <rect x="8"  y="6"  width="4" height="12" rx="1" opacity="0.9" />
        <rect x="14" y="2"  width="4" height="16" rx="1" opacity="0.9" />
      </svg>
    </button>

    <button class="tool-btn" title="Изменить размер" @click="emit('resize')">
      <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="5" width="11" height="10" rx="1" />
        <path d="M15 2 L18 2 L18 5" />
        <path d="M18 2 L14 6" />
        <path d="M13 15 L13 18 L16 18" />
        <path d="M13 18 L17 14" />
      </svg>
    </button>

    <button class="tool-btn" title="Свёртка ядром" @click="emit('filter')">
      <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.55" stroke="none" />
        <rect x="8" y="2" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.85" stroke="none" />
        <rect x="14" y="2" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.55" stroke="none" />
        <rect x="2" y="8" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.85" stroke="none" />
        <rect x="8" y="8" width="4" height="4" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="14" y="8" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.85" stroke="none" />
        <rect x="2" y="14" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.55" stroke="none" />
        <rect x="8" y="14" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.85" stroke="none" />
        <rect x="14" y="14" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.55" stroke="none" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.tool-panel { width: 44px; background: var(--panel); border-right: 1px solid var(--border); flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: 8px 0; gap: 4px; }
.tool-btn { width: 34px; height: 34px; background: transparent; border: 1px solid transparent; border-radius: var(--r); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background 0.1s, border-color 0.1s, color 0.1s; }
.tool-btn:hover { background: var(--hover); border-color: var(--sep); color: var(--text-hi); }
.tool-btn.active { background: var(--active); border-color: #686868; color: var(--text-hi); box-shadow: inset 0 1px 4px rgba(0,0,0,.45); }
</style>
