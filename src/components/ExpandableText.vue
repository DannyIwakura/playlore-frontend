<template>
  <div class="expandable-text">
    <div ref="contentRef" class="expandable-content" :class="{ expanded }" :style="contentStyle">
      {{ text || fallback }}
    </div>
    <button v-if="isLong" type="button" class="expand-btn" @click.stop="expanded = !expanded">
      {{ expanded ? 'Contraer' : 'Expandir' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  text?: string | null
  fallback?: string
  maxLines?: number
}>(), {
  fallback: 'Sin descripción',
  maxLines: 2,
})

const contentRef = ref<HTMLElement | null>(null)
const expanded = ref(false)
const isLong = ref(false)

const lineHeight = 1.4
const collapsedMaxHeight = computed(() => `${props.maxLines * lineHeight}em`)

const contentStyle = computed(() => ({
  maxHeight: expanded.value ? '300px' : collapsedMaxHeight.value,
  overflowY: expanded.value ? 'auto' : 'hidden',
}))

function checkOverflow() {
  nextTick(() => {
    const el = contentRef.value
    if (!el) return
    isLong.value = el.scrollHeight > el.offsetHeight + 1
  })
}

onMounted(checkOverflow)
watch(() => props.text, () => { expanded.value = false; checkOverflow() })
</script>

<style scoped>
.expandable-text {
  position: relative;
}
.expandable-content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  word-break: break-word;
  line-height: 1.4;
}
@media (prefers-reduced-motion: no-preference) {
  .expandable-content {
    transition: max-height var(--pl-duration-slow) var(--pl-ease-standard);
  }
}
.expandable-content:not(.expanded) {
  -webkit-line-clamp: v-bind('props.maxLines');
}
.expandable-content.expanded {
  -webkit-line-clamp: unset;
}
.expand-btn {
  background: none;
  border: none;
  color: var(--pl-primary);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 0;
  font-weight: 500;
}
.expand-btn:hover {
  text-decoration: underline;
}
</style>
