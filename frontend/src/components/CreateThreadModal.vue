<template>
  <el-dialog 
    v-model="visible" 
    :title="category ? 'Nowy wątek w: ' + category.name : 'Nowy wątek'" 
    width="800px"
    :before-close="handleClose"
  >
    <div v-if="!category" class="error-message">
      <el-alert
        title="Błąd kategorii"
        type="error"
        description="Nie wybrano kategorii. Proszę wybrać kategorię ponownie."
        show-icon
        :closable="false"
      />
      <el-button @click="handleClose" type="primary" style="margin-top: 15px;">
        Zamknij
      </el-button>
    </div>

    <el-form v-else :model="form" :rules="rules" ref="threadForm" label-width="100px">
      <el-form-item label="Tytuł" prop="title">
        <el-input 
          v-model="form.title" 
          placeholder="Wpisz tytuł wątku"
          size="large"
        />
      </el-form-item>
      
      <el-form-item label="Treść" prop="content">
        <div class="editor-container">
          <v-md-editor 
            v-model="form.content" 
            :disabled-menus="[]" 
            height="400px"
            placeholder="Napisz treść swojego wątku..."
            left-toolbar="undo redo clear | h bold italic strikethrough quote | ul ol table hr | link image code | emoji"
            right-toolbar="preview"
            @upload-image="handleImageUpload"
          />
          
          <div class="editor-tips">
            <h4>Podpowiedzi formatowania:</h4>
            <ul>
              <li><strong>**pogrubienie**</strong> - tekst pogrubiony</li>
              <li><em>*kursywa*</em> - tekst kursywą</li>
              <li><code>`kod`</code> - fragment kodu</li>
              <li>> cytat - blok cytatu</li>
              <li>[link](https://...) - hiperłącze</li>
              <li>![obraz](url) - obrazek</li>
            </ul>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="Tag" prop="tag">
        <el-select 
          v-model="form.tag" 
          placeholder="Wybierz tag (opcjonalnie)"
          clearable
          filterable
          allow-create
        >
          <el-option 
            v-for="tag in popularTags" 
            :key="tag" 
            :label="tag" 
            :value="tag"
          />
        </el-select>
      </el-form-item>
    </el-form>
    
    <template v-if="category" #footer>
      <div class="dialog-footer">
        <div class="footer-left">
          <el-button @click="togglePreview" size="small">
            <Icon :icon="previewMode ? 'mdi:pencil' : 'mdi:eye'" />
            {{ previewMode ? 'Edytuj' : 'Podgląd' }}
          </el-button>
        </div>
        <div class="footer-right">
          <el-button @click="handleClose">
            Anuluj
          </el-button>
          <el-button 
            type="primary" 
            @click="submitForm" 
            :loading="submitting"
            :disabled="!form.content.trim()"
          >
            Utwórz wątek
          </el-button>
        </div>
      </div>
    </template>
    
    <!-- Podgląd markdown -->
    <el-dialog 
      v-model="previewMode" 
      title="Podgląd wątku" 
      width="900px"
      append-to-body
    >
      <div class="preview-container">
        <h1 class="preview-title">{{ form.title || 'Brak tytułu' }}</h1>
        <div class="preview-content" v-html="compiledMarkdown(form.content)" />
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default {
  name: 'CreateThreadModal',
  components: {
    Icon
  },
  props: {
    show: Boolean,
    category: {
      type: Object,
      default: null
    },
    user: Object
  },
  data() {
    return {
      visible: this.show,
      submitting: false,
      previewMode: false,
      form: {
        title: '',
        content: '',
        tag: ''
      },
      rules: {
        title: [
          { required: true, message: 'Tytuł wątku jest wymagany', trigger: 'blur' },
          { min: 5, message: 'Tytuł musi mieć co najmniej 5 znaków', trigger: 'blur' },
          { max: 200, message: 'Tytuł nie może przekraczać 200 znaków', trigger: 'blur' }
        ],
        content: [
          { required: true, message: 'Treść wątku jest wymagana', trigger: 'blur' },
          { min: 10, message: 'Treść musi mieć co najmniej 10 znaków', trigger: 'blur' }
        ]
      },
      popularTags: [
        'pytanie',
        'problem',
        'pomoc',
        'dyskusja',
        'porada',
        'bug',
        'feature',
        'tutorial',
        'news',
        'offtop'
      ]
    };
  },
  watch: {
    show(newVal) {
      this.visible = newVal;
      if (newVal) {
        this.resetForm();
      }
    },
    category(newCategory) {
      if (this.visible && newCategory) {
        //console.log('Kategoria zmieniona na:', newCategory);
      }
    }
  },
  methods: {
    resetForm() {
      this.form = {
        title: '',
        content: '',
        tag: ''
      };
      this.previewMode = false;
      if (this.$refs.threadForm) {
        this.$refs.threadForm.clearValidate();
      }
    },
    
    handleClose() {
      this.visible = false;
      this.$emit('update:show', false);
      this.$emit('closed');
      this.resetForm();
    },
    
    togglePreview() {
      this.previewMode = !this.previewMode;
    },
    
    submitForm() {
      
      if (!this.category) {
        this.$message.error('Nie wybrano kategorii');
        return;
      }

      // Ręczna walidacja
      if (!this.form.title || !this.form.title.trim()) {
        this.$message.warning('Tytuł wątku jest wymagany');
        return;
      }

      if (!this.form.content || !this.form.content.trim()) {
        this.$message.warning('Treść wątku jest wymagana');
        return;
      }

      this.submitting = true;
      
      // PRZEKAŻ DANE POPRAWNIE - bez await!
      const threadData = {
        category_id: this.category.id,
        title: this.form.title.trim(),
        content: this.form.content.trim(),
        author: this.user.username,
        tag: this.form.tag ? this.form.tag.trim() : ''
      };
      
      // Emituj zdarzenie - NIE używaj await!
      this.$emit('create-thread', threadData);
      
        try {
	  axios.post('/user-activity', {
	    activity_type: 'thread_created'
	  });
	} catch (error) {
	  console.error('Error logging activity:', error);
	}
      
      // Zamknij modal po emisji
      this.handleClose();
      this.submitting = false;
    },
    
    handleImageUpload(event, insertImage, files) {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          insertImage({
            url: e.target.result,
            desc: 'Uploaded image'
          });
        };
        reader.readAsDataURL(file);
      }
    },
    
    compiledMarkdown(content) {
      if (!content) return '';
      const rawMarkdown = marked.parse(content);
      return DOMPurify.sanitize(rawMarkdown);
    }
  }
}
</script>

<style scoped>
.error-message {
  text-align: center;
  padding: 20px;
}

.editor-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  margin-bottom: 15px;
}

.editor-tips {
  background: var(--el-fill-color-light);
  padding: 15px;
  border-radius: 8px;
  font-size: 13px;
}

.editor-tips h4 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.editor-tips ul {
  margin: 0;
  padding-left: 15px;
  color: var(--text-secondary);
}

.editor-tips li {
  margin-bottom: 5px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.footer-left, .footer-right {
  display: flex;
  gap: 10px;
}

.preview-container {
  padding: 20px;
}

.preview-title {
  color: var(--text-primary);
  margin-bottom: 20px;
  border-bottom: 2px solid var(--el-color-primary);
  padding-bottom: 10px;
}

.preview-content {
  line-height: 1.6;
  color: var(--text-primary);
}

.preview-content :deep(*) {
  margin-bottom: 15px;
}

.preview-content :deep(h1) {
  color: var(--text-primary);
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 5px;
  margin: 25px 0 15px 0;
}

.preview-content :deep(h2) {
  color: var(--text-primary);
  margin: 20px 0 12px 0;
}

.preview-content :deep(h3) {
  color: var(--text-primary);
  margin: 15px 0 10px 0;
}

.preview-content :deep(code) {
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.preview-content :deep(pre) {
  background: var(--el-fill-color-light);
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 15px 0;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid var(--el-color-primary);
  padding-left: 15px;
  margin: 15px 0;
  color: var(--text-secondary);
  font-style: italic;
}

.preview-content :deep(ul), .preview-content :deep(ol) {
  margin: 10px 0;
  padding-left: 20px;
}

.preview-content :deep(li) {
  margin-bottom: 5px;
}

.preview-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

.preview-content :deep(th), .preview-content :deep(td) {
  border: 1px solid var(--el-border-color-light);
  padding: 8px 12px;
  text-align: left;
}

.preview-content :deep(th) {
  background: var(--el-fill-color-light);
  font-weight: 600;
}

.preview-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 10px 0;
}

.preview-content :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.preview-content :deep(a:hover) {
  text-decoration: underline;
}

/* Responsywność */
@media (max-width: 900px) {
  .editor-container {
    grid-template-columns: 1fr;
  }
  
  .editor-tips {
    order: -1;
  }
  
  .dialog-footer {
    flex-direction: column;
    gap: 10px;
  }
  
  .footer-left, .footer-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
