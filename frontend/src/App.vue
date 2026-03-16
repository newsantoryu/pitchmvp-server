<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('🚀 PitchMVP Vue 3 + Router + Pinia iniciado')
})
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
/* Reset e estilos globais */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
}

#app {
  min-height: 100vh;
}

/* Estilos para páginas placeholder */
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;
  padding: 2rem;
}

.page h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.page p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.page a {
  color: #ffd700;
  text-decoration: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border: 2px solid #ffd700;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.page a:hover {
  background: #ffd700;
  color: #333;
}

/* Animações globais */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

/* Scrollbar personalizada */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Focus styles */
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #2196f3;
  outline-offset: 2px;
}

/* Selection */
::selection {
  background: #2196f3;
  color: white;
}

/* Loading states */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* Utilities */
.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-column {
  flex-direction: column;
}

.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.gap-4 {
  gap: 1rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-1 {
  padding: 0.25rem;
}

.p-2 {
  padding: 0.5rem;
}

.p-3 {
  padding: 0.75rem;
}

.p-4 {
  padding: 1rem;
}

.w-full {
  width: 100%;
}

.h-full {
  height: 100%;
}

.rounded {
  border-radius: 0.25rem;
}

.rounded-md {
  border-radius: 0.375rem;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.rounded-xl {
  border-radius: 0.75rem;
}

.shadow {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.shadow-md {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.shadow-lg {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* Responsive */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
  
  .page h1 {
    font-size: 2rem;
  }
  
  .page p {
    font-size: 1rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  body {
    background: #1a1a1a;
    color: #e0e0e0;
  }
}
</style>
