<script setup lang="ts">
import McpToolDemo from './components/McpToolDemo.vue';
</script>

<template>
  <div class="app-wrapper">
    <header class="app-header">
      <h1>Vue3 × MCP Integration1</h1>
      <p>Vue3 (Vite) → Node.js Bridge → MCP Server (StreamableHTTP)</p>
    </header>
    <main>
      <McpToolDemo />
    </main>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f1f5f9;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1a202c;
}

.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1rem 3rem;
}

.app-header {
  text-align: center;
  padding: 2.5rem 1rem 0;
}

.app-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: #4f46e5;
}

.app-header p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}
</style>
