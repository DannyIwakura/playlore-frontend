<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  online: boolean
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'status-sm'
    case 'lg': return 'status-lg'
    default: return 'status-md'
  }
})
</script>

<template>
  <span class="status-dot" :class="[online ? 'online' : 'offline', sizeClass]"></span>
</template>

<style scoped>
.status-dot {
  display: inline-block;
  border-radius: 50%;
  border: 2px solid white;
  flex-shrink: 0;
}
.online {
  background: #22c55e;
}
.offline {
  background: #9ca3af;
}
.status-sm {
  width: 8px;
  height: 8px;
}
.status-md {
  width: 12px;
  height: 12px;
}
.status-lg {
  width: 16px;
  height: 16px;
}
</style>
