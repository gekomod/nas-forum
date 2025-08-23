<template>
  <div class="markdown-editor">
    <div class="editor-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'edit' }"
        @click="activeTab = 'edit'"
      >
        Edytuj
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'preview' }"
        @click="activeTab = 'preview'"
      >
        Podgląd
      </button>
    </div>

    <div class="editor-content">
      <textarea
        v-if="activeTab === 'edit'"
        v-model="localValue"
        :placeholder="placeholder"
        class="editor-textarea"
        @input="updateValue"
        ref="textarea"
      ></textarea>
      
      <div v-else class="preview-content" v-html="compiledMarkdown"></div>
    </div>

    <div class="editor-toolbar">
      <button class="toolbar-btn" @click="insertText('**', '**', 'bold text')" title="Pogrubienie">
        <strong>B</strong>
      </button>
      <button class="toolbar-btn" @click="insertText('_', '_', 'italic text')" title="Kursywa">
        <em>I</em>
      </button>
      <button class="toolbar-btn" @click="insertText('`', '`', 'code')" title="Kod">
        <code>&lt;/&gt;</code>
      </button>
      <button class="toolbar-btn" @click="insertText('[', '](url)', 'link text')" title="Link">
        🔗
      </button>
      <button class="toolbar-btn" @click="insertText('> ', '', 'quote')" title="Cytat">
        ❝
      </button>
      <button class="toolbar-btn" @click="insertText('- ', '', 'list item')" title="Lista">
        •
      </button>
      <button class="toolbar-btn" @click="insertText('1. ', '', 'list item')" title="Lista numerowana">
        1.
      </button>
      <button class="toolbar-btn" @click="insertText('```\n', '\n```', 'code block')" title="Blok kodu">
        { }
      </button>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default {
  name: 'MarkdownEditor',
  props: {
    modelValue: String,
    placeholder: {
      type: String,
      default: 'Napisz swoją wiadomość...'
    },
    height: {
      type: String,
      default: '200px'
    }
  },
  data() {
    return {
      activeTab: 'edit',
      localValue: this.modelValue
    };
  },
  computed: {
    compiledMarkdown() {
      if (!this.localValue) return '';
      const rawMarkdown = marked.parse(this.localValue);
      return DOMPurify.sanitize(rawMarkdown);
    }
  },
  watch: {
    modelValue(newVal) {
      this.localValue = newVal;
    }
  },
  methods: {
    updateValue() {
      this.$emit('update:modelValue', this.localValue);
    },
    
    insertText(before, after, placeholder) {
      const textarea = this.$refs.textarea;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = this.localValue.substring(start, end);
      
      let newText;
      if (selectedText) {
        newText = before + selectedText + after;
      } else {
        newText = before + placeholder + after;
      }
      
      this.localValue = 
        this.localValue.substring(0, start) + 
        newText + 
        this.localValue.substring(end);
      
      // Ustaw kursor
      const newCursorPos = start + newText.length;
      this.$nextTick(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
      
      this.updateValue();
    },
    
    focus() {
      this.$refs.textarea?.focus();
    }
  }
}
</script>

<style scoped>
.markdown-editor {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
}

.tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
}

.tab-btn.active {
  background: white;
  color: var(--text-primary);
  border-bottom: 2px solid var(--el-color-primary);
}

.editor-content {
  min-height: v-bind(height);
}

.editor-textarea {
  width: 100%;
  min-height: v-bind(height);
  padding: 12px;
  border: none;
  resize: vertical;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  background: white;
}

.editor-textarea:focus {
  outline: none;
}

.preview-content {
  padding: 12px;
  min-height: v-bind(height);
  line-height: 1.6;
  color: var(--text-primary);
}

.preview-content :deep(*) {
  margin-bottom: 10px;
}

.preview-content :deep(h1), 
.preview-content :deep(h2), 
.preview-content :deep(h3) {
  color: var(--text-primary);
  margin-top: 20px;
  margin-bottom: 10px;
}

.preview-content :deep(code) {
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.preview-content :deep(pre) {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 10px 0;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid var(--el-color-primary);
  padding-left: 12px;
  margin: 10px 0;
  color: var(--text-secondary);
}

.editor-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-top: 1px solid var(--el-border-color-light);
}

.toolbar-btn {
  padding: 4px 8px;
  background: white;
  border: 1px solid var(--el-border-color-light);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
}

.toolbar-btn:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>