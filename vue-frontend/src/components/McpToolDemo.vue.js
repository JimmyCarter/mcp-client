/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, watch } from 'vue';
import { useMcpTools, useMcpToolCall, } from '../composables/useMcpTool';
// ─── Composables ──────────────────────────────────────────────────────────────
const { tools, isLoading: isLoadingTools, error: toolsError, fetchTools, } = useMcpTools();
const { result, isLoading: isCalling, error: callError, callTool, reset, } = useMcpToolCall();
// ─── Local State ──────────────────────────────────────────────────────────────
const selectedToolName = ref('');
/** User-edited raw string values for each input field */
const rawArgs = ref({});
// ─── Derived ─────────────────────────────────────────────────────────────────
const selectedTool = computed(() => tools.value.find((t) => t.name === selectedToolName.value));
const fields = computed(() => {
    const schema = selectedTool.value?.inputSchema;
    if (!schema?.properties)
        return [];
    return Object.entries(schema.properties).map(([key, prop]) => ({
        key,
        prop,
        required: schema.required?.includes(key) ?? false,
    }));
});
const resultText = computed(() => {
    if (!result.value)
        return '';
    return result.value.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
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
async function handleCallTool() {
    if (!selectedToolName.value)
        return;
    // Coerce raw string values to the declared JSON Schema type
    const parsedArgs = {};
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
function handleReset() {
    selectedToolName.value = '';
    rawArgs.value = {};
    reset();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['chip']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "demo-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "demo-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.fetchTools) },
    ...{ class: "btn btn-primary" },
    disabled: (__VLS_ctx.isLoadingTools),
});
if (__VLS_ctx.isLoadingTools) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "spinner" },
        'aria-hidden': "true",
    });
}
(__VLS_ctx.isLoadingTools ? '加载中…' : '加载工具列表');
if (__VLS_ctx.toolsError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "alert alert-error" },
        role: "alert",
    });
    (__VLS_ctx.toolsError);
}
if (__VLS_ctx.tools.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "tool-chips" },
        role: "list",
    });
    for (const [tool] of __VLS_getVForSourceType((__VLS_ctx.tools))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.tools.length))
                        return;
                    __VLS_ctx.selectedToolName = tool.name;
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!(__VLS_ctx.tools.length))
                        return;
                    __VLS_ctx.selectedToolName = tool.name;
                } },
            key: (tool.name),
            ...{ class: "chip" },
            ...{ class: ({ 'chip-active': __VLS_ctx.selectedToolName === tool.name }) },
            role: "button",
            tabindex: "0",
            'aria-pressed': (__VLS_ctx.selectedToolName === tool.name),
        });
        (tool.name);
    }
}
if (__VLS_ctx.selectedTool) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "tool-description" },
    });
    (__VLS_ctx.selectedTool.description ?? '暂无描述');
}
if (__VLS_ctx.fields.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "sub-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleCallTool) },
        ...{ class: "arg-form" },
    });
    for (const [{ key, prop, required }] of __VLS_getVForSourceType((__VLS_ctx.fields))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (key),
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: (`field-${key}`),
            ...{ class: "field-label" },
        });
        (key);
        if (required) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "required-mark" },
                'aria-label': "必填",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "field-type" },
        });
        (prop.type);
        if (prop.enum) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                id: (`field-${key}`),
                value: (__VLS_ctx.rawArgs[key]),
                ...{ class: "input" },
                required: (required),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "",
            });
            for (const [opt] of __VLS_getVForSourceType((prop.enum))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (opt),
                    value: (opt),
                });
                (opt);
            }
        }
        else if (prop.type === 'boolean') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                id: (`field-${key}`),
                value: (__VLS_ctx.rawArgs[key]),
                ...{ class: "input" },
                required: (required),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "false",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                id: (`field-${key}`),
                type: (prop.type === 'number' ? 'number' : 'text'),
                placeholder: (prop.description ?? key),
                required: (required),
                ...{ class: "input" },
            });
            (__VLS_ctx.rawArgs[key]);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: "btn btn-primary" },
        disabled: (__VLS_ctx.isCalling || !__VLS_ctx.selectedToolName),
    });
    if (__VLS_ctx.isCalling) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "spinner" },
            'aria-hidden': "true",
        });
    }
    (__VLS_ctx.isCalling ? '调用中…' : '调用工具');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleReset) },
        type: "button",
        ...{ class: "btn btn-ghost" },
    });
}
if (__VLS_ctx.result || __VLS_ctx.callError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "sub-title" },
    });
    if (__VLS_ctx.callError && __VLS_ctx.isResultError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "alert alert-error" },
            role: "alert",
        });
        (__VLS_ctx.callError);
    }
    if (__VLS_ctx.resultText) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: "result-block" },
            ...{ class: ({ 'result-error': __VLS_ctx.isResultError }) },
            'aria-live': "polite",
        });
        (__VLS_ctx.resultText);
    }
}
/** @type {__VLS_StyleScopedClasses['demo-card']} */ ;
/** @type {__VLS_StyleScopedClasses['demo-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-error']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-chips']} */ ;
/** @type {__VLS_StyleScopedClasses['chip']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-description']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-title']} */ ;
/** @type {__VLS_StyleScopedClasses['arg-form']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['required-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['field-type']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-title']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-error']} */ ;
/** @type {__VLS_StyleScopedClasses['result-block']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            tools: tools,
            isLoadingTools: isLoadingTools,
            toolsError: toolsError,
            fetchTools: fetchTools,
            result: result,
            isCalling: isCalling,
            callError: callError,
            selectedToolName: selectedToolName,
            rawArgs: rawArgs,
            selectedTool: selectedTool,
            fields: fields,
            resultText: resultText,
            isResultError: isResultError,
            handleCallTool: handleCallTool,
            handleReset: handleReset,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
