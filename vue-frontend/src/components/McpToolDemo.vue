<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  useMcpTools,
  useMcpToolCall,
  type McpTool,
  type ToolProperty,
} from '../composables/useMcpTool';

// ─── Composables ──────────────────────────────────────────────────────────────

const {
  tools,
  isLoading: isLoadingTools,
  error: toolsError,
  fetchTools,
} = useMcpTools();

const {
  result,
  isLoading: isCalling,
  error: callError,
  callTool,
  reset,
} = useMcpToolCall();

// ─── Local State ──────────────────────────────────────────────────────────────

const selectedToolName = ref('');
/** User-edited raw string values for each input field */
const rawArgs = ref<Record<string, string>>({});

// ─── Derived ─────────────────────────────────────────────────────────────────

const selectedTool = computed<McpTool | undefined>(() =>
  tools.value.find((t: McpTool) => t.name === selectedToolName.value),
);

interface FieldMeta {
  key: string;
  prop: ToolProperty;
  required: boolean;
}

const fields = computed<FieldMeta[]>(() => {
  const schema = selectedTool.value?.inputSchema;
  if (!schema?.properties) return [];
  return Object.entries(schema.properties).map(([key, prop]) => ({
    key,
    prop,
    required: schema.required?.includes(key) ?? false,
  }));
});

const resultText = computed<string>(() => {
  if (!result.value) return '';
  return result.value.content
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text?: string }) => c.text ?? '')
    .join('\n');
});

const isResultError = computed(() => result.value?.isError === true);

// ─── Watchers ─────────────────────────────────────────────────────────────────

// Reset args + results whenever the user switches tools
watch(selectedToolName, () => {
  rawArgs.value = {};
  reset();
  // Pre-populate empty strings so v-model has initial bindings
  for (const { key } of fields.value) {
    rawArgs.value[key] = '';
  }
});

// ─── Actions ──────────────────────────────────────────────────────────────────

async function handleCallTool(): Promise<void> {
  if (!selectedToolName.value) return;

  // Coerce raw string values to the declared JSON Schema type
  const parsedArgs: Record<string, unknown> = {};
  for (const { key, prop } of fields.value) {
    const raw = rawArgs.value[key] ?? '';
    switch (prop.type) {
      case 'number':
        parsedArgs[key] = Number(raw);
        break;
      case 'boolean':
        parsedArgs[key] = raw === 'true';
        break;
      default:
        parsedArgs[key] = raw;
    }
  }

  await callTool({ name: selectedToolName.value, arguments: parsedArgs });
}

function handleReset(): void {
  selectedToolName.value = '';
  rawArgs.value = {};
  reset();
}
</script>

<template>
  <div class="demo-card">
    <h2 class="demo-title">🔧 MCP Tool Demo</h2>

    <!-- ── Load Tools ────────────────────────────────────── -->
    <section class="section">
      <button
        class="btn btn-primary"
        :disabled="isLoadingTools"
        @click="fetchTools"
      >
        <span v-if="isLoadingTools" class="spinner" aria-hidden="true" />
        {{ isLoadingTools ? '加载中…' : '加载工具列表' }}
      </button>

      <p v-if="toolsError" class="alert alert-error" role="alert">
        ⚠️ {{ toolsError }}
      </p>

      <ul v-if="tools.length" class="tool-chips" role="list">
        <li
          v-for="tool in tools"
          :key="tool.name"
          class="chip"
          :class="{ 'chip-active': selectedToolName === tool.name }"
          role="button"
          tabindex="0"
          :aria-pressed="selectedToolName === tool.name"
          @click="selectedToolName = tool.name"
          @keydown.enter.space.prevent="selectedToolName = tool.name"
        >
          {{ tool.name }}
        </li>
      </ul>
    </section>

    <!-- ── Tool Description ──────────────────────────────── -->
    <section v-if="selectedTool" class="section">
      <p class="tool-description">📖 {{ selectedTool.description ?? '暂无描述' }}</p>
    </section>

    <!-- ── Input Form ────────────────────────────────────── -->
    <section v-if="fields.length" class="section">
      <h3 class="sub-title">输入参数</h3>
      <form class="arg-form" @submit.prevent="handleCallTool">
        <div v-for="{ key, prop, required } in fields" :key="key" class="field">
          <label :for="`field-${key}`" class="field-label">
            {{ key }}
            <span v-if="required" class="required-mark" aria-label="必填">*</span>
            <span class="field-type">({{ prop.type }})</span>
          </label>

          <select
            v-if="prop.enum"
            :id="`field-${key}`"
            v-model="rawArgs[key]"
            class="input"
            :required="required"
          >
            <option value="">— 请选择 —</option>
            <option v-for="opt in prop.enum" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <select
            v-else-if="prop.type === 'boolean'"
            :id="`field-${key}`"
            v-model="rawArgs[key]"
            class="input"
            :required="required"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>

          <input
            v-else
            :id="`field-${key}`"
            v-model="rawArgs[key]"
            :type="prop.type === 'number' ? 'number' : 'text'"
            :placeholder="prop.description ?? key"
            :required="required"
            class="input"
          />
        </div>

        <div class="actions">
          <button type="submit" class="btn btn-primary" :disabled="isCalling || !selectedToolName">
            <span v-if="isCalling" class="spinner" aria-hidden="true" />
            {{ isCalling ? '调用中…' : '调用工具' }}
          </button>
          <button type="button" class="btn btn-ghost" @click="handleReset">重置</button>
        </div>
      </form>
    </section>

    <!-- ── Results ───────────────────────────────────────── -->
    <section v-if="result || callError" class="section">
      <h3 class="sub-title">执行结果</h3>

      <p v-if="callError && isResultError" class="alert alert-error" role="alert">
        ⚠️ {{ callError }}
      </p>

      <pre
        v-if="resultText"
        class="result-block"
        :class="{ 'result-error': isResultError }"
        aria-live="polite"
      >{{ resultText }}</pre>
    </section>
  </div>
</template>

<style scoped>
.demo-card {
  max-width: 680px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.06);
  font-family: system-ui, -apple-system, sans-serif;
}

.demo-title {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a202c;
}

.sub-title {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #4a5568;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section {
  margin-bottom: 1.5rem;
}

/* ─── Buttons ─── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-primary {
  background: #4f46e5;
  color: #fff;
}
.btn-primary:not(:disabled):hover {
  filter: brightness(1.1);
}
.btn-ghost {
  background: transparent;
  color: #4f46e5;
  border: 1px solid #4f46e5;
}
.btn-ghost:hover {
  background: #eef2ff;
}

/* ─── Tool chips ─── */
.tool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}
.chip {
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.chip:hover {
  border-color: #4f46e5;
  color: #4f46e5;
}
.chip-active {
  background: #eef2ff;
  border-color: #4f46e5;
  color: #4f46e5;
}

/* ─── Form ─── */
.tool-description {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.5;
}
.arg-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}
.field-type {
  font-weight: 400;
  color: #9ca3af;
  font-size: 0.8rem;
  margin-left: 0.3rem;
}
.required-mark {
  color: #ef4444;
  margin-left: 2px;
}
.input {
  padding: 0.45rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  background: #f8fafc;
}
.input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgb(79 70 229 / 0.15);
  background: #fff;
}

/* ─── Actions ─── */
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

/* ─── Result ─── */
.alert {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin: 0;
}
.alert-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.result-block {
  margin: 0;
  padding: 1rem;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 0.875rem;
  font-family: 'Menlo', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1e293b;
  max-height: 300px;
  overflow-y: auto;
}
.result-error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

/* ─── Spinner ─── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
