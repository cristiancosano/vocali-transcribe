<script setup lang="ts">
type ButtonVariant = 'primary' | 'link' | 'icon'

const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariant
  loading?: boolean
}>(), {
  type: 'button',
  variant: 'primary',
  loading: false
})

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'rounded-lg bg-violet-600 px-4 py-3 text-white hover:bg-violet-700',
  link: 'p-0 text-violet-700 underline hover:text-violet-900',
  icon: 'rounded p-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800'
}
</script>

<template>
  <button
    :type="props.type"
    class="cursor-pointer font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-60"
    :class="[variantClasses[props.variant], props.loading ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed']"
  >
    <slot />
  </button>
</template>
