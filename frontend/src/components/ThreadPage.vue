<template>
  <div class="thread-page">
    <div class="breadcrumbs">
      <a href="#" class="breadcrumb-link" @click.prevent="$emit('back-to-category')">
        <Icon icon="mdi:home" />
        Forum
      </a>
      <span class="breadcrumb-separator">/</span>
      <a href="#" class="breadcrumb-link" @click.prevent="$emit('back-to-category')">
        {{ category.name }}
      </a>
      <span class="breadcrumb-separator">/</span>
      <span>{{ thread.title }}</span>
    </div>

    <div class="thread-header">
      <h1>{{ thread.title }}</h1>
      <div class="thread-meta">
        <span class="thread-author">
          <UserAvatar :user="thread.author" :status="thread.author_status" />
          {{ thread.author }}
        </span>
        <span class="thread-date">
          <Icon icon="mdi:clock-outline" />
          {{ formatDate(thread.date) }}
        </span>
        <span class="thread-views">
          <Icon icon="mdi:eye" />
          {{ thread.views }} wyświetleń
        </span>
      </div>
    </div>

    <div class="posts-container">
      <div v-for="(post, index) in posts" :key="post.id" 
           class="post reply" 
           :class="{'post-even': index % 2 === 0, 'post-odd': index % 2 === 1, 'editing': post.editing}">
        <div class="post-sidebar">
          <UserAvatar :user="post.author" :status="post.author_status" />
          <div class="user-info">
            <div class="username">{{ post.author }}</div>
            <div class="user-status" :class="post.author_status">
              {{ getUserStatusText(post.author_status) }}
            </div>
          </div>
        </div>
        <div class="post-content">
          <div v-if="!post.editing" class="post-body" v-html="compiledMarkdown(post.content)" />
          
          <!-- Edycja posta -->
          <div v-else class="edit-container">
            <v-md-editor 
              v-model="post.editContent" 
              :disabled-menus="[]" 
              height="200px"
              placeholder="Edytuj swoją odpowiedź..."
              left-toolbar="undo redo clear | h bold italic strikethrough quote | ul ol table hr | link image code"
            />
            <div class="edit-actions">
              <el-button @click="cancelEdit(post)">
                Anuluj
              </el-button>
              <el-button type="primary" @click="saveEdit(post)" :loading="post.saving">
                Zapisz zmiany
              </el-button>
            </div>
          </div>
          
          <div class="post-footer">
            <div class="post-date">{{ formatDateTime(post.date) }}</div>
            <div class="post-actions" v-if="user">
              <button class="action-btn" @click="quotePost(post)">
                <Icon icon="mdi:format-quote-close" />
                Cytuj
              </button>
              
              <!-- Przycisk edycji (właściciel posta, admin, moderator) -->
              <button v-if="canEditPost(post)" class="action-btn" @click="startEdit(post)">
                <Icon icon="mdi:pencil" />
                Edytuj
              </button>
              
              <!-- Przycisk usuwania (admin, moderator) -->
              <button v-if="canDeletePost(post)" class="action-btn delete-btn" @click="confirmDelete(post)">
                <Icon icon="mdi:delete" />
                Usuń
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Szybka odpowiedź -->
    <div class="quick-reply" v-if="user && (!category.is_locked || user.role_id === 1 || user.role_id === 2)">
      <h3>Odpowiedz w tym wątku</h3>
      <div class="reply-editor">
        <v-md-editor 
          v-model="replyContent" 
          :disabled-menus="[]" 
          height="200px"
          placeholder="Napisz swoją odpowiedź..."
          left-toolbar="undo redo clear | h bold italic strikethrough quote | ul ol table hr | link image code"
        />
        <div class="editor-actions">
          <el-button @click="previewMode = !previewMode">
            <Icon :icon="previewMode ? 'mdi:pencil' : 'mdi:eye'" />
            {{ previewMode ? 'Edytuj' : 'Podgląd' }}
          </el-button>
          <el-button type="primary" @click="submitReply" :loading="submitting">
            <Icon icon="mdi:send" />
            Wyślij odpowiedź
          </el-button>
        </div>
        
        <div v-if="previewMode" class="preview-container">
          <div class="preview-header">Podgląd odpowiedzi:</div>
          <div class="preview-content" v-html="compiledMarkdown(replyContent)" />
        </div>
      </div>
    </div>

    <div class="thread-locked" v-else-if="category.is_locked">
      <el-alert
        title="Wątek zablokowany"
        type="warning"
        description="Ten wątek jest zablokowany. Nie możesz dodawać odpowiedzi."
        show-icon
        :closable="false"
      />
    </div>

    <div class="thread-locked" v-else>
      <el-alert
        title="Wymagane logowanie"
        type="info"
        description="Musisz być zalogowany, aby odpowiadać w wątkach."
        show-icon
        :closable="false"
      />
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import UserAvatar from './UserAvatar.vue';

export default {
  name: 'ThreadPage',
  components: {
    Icon,
    UserAvatar
  },
  props: {
    threadData: Object,
    category: Object,
    user: Object
  },
  data() {
    return {
      thread: {},
      posts: [],
      replyContent: '',
      submitting: false,
      previewMode: false
    };
  },
  mounted() {
    this.loadThread();
  },
  methods: {
    async loadThread() {
      try {
        const response = await axios.get(`/thread/${this.threadData.id}`);
        this.thread = response.data.thread;
        this.posts = response.data.posts.map(post => ({
          ...post,
          editing: false,
          editContent: post.content,
          saving: false
        }));
        
        // Zwiększ licznik wyświetleń
        await axios.put(`/thread/${this.threadData.id}/view`);
      } catch (error) {
        console.error('Error loading thread:', error);
        this.$message.error('Błąd podczas ładowania wątku');
      }
    },
    
    async submitReply() {
      if (!this.replyContent.trim()) {
        this.$message.warning('Odpowiedź nie może być pusta');
        return;
      }
      
      this.submitting = true;
      try {
        await axios.post(`/thread/${this.thread.id}/posts`, {
          content: this.replyContent
        });
        
        this.$message.success('Odpowiedź została dodana');
        this.replyContent = '';
        this.previewMode = false;
        await this.loadThread(); // Odśwież wątek
      } catch (error) {
        console.error('Error submitting reply:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas dodawania odpowiedzi');
      } finally {
        this.submitting = false;
      }
    },
    
    quotePost(post) {
      this.replyContent = `> **${post.author} napisał(a):**\n> ${post.content}\n\n${this.replyContent}`;
    },
    
    compiledMarkdown(content) {
      if (!content) return '';
      const rawMarkdown = marked.parse(content, {
        breaks: true,
        gfm: true
      });
      return DOMPurify.sanitize(rawMarkdown);
    },
    
    formatDate(date) {
      return new Date(date).toLocaleDateString('pl-PL');
    },
    
    formatDateTime(date) {
      return new Date(date).toLocaleString('pl-PL');
    },
    
    getUserStatusText(status) {
      const statusText = {
        online: 'Online',
        recent: 'Ostatnio aktywny',
        offline: 'Offline'
      };
      return statusText[status] || 'Offline';
    },
    
    // Sprawdza czy użytkownik może edytować post
    canEditPost(post) {
      if (!this.user) return false;
      // Administrator lub moderator
      if (this.user.role_id === 1 || this.user.role_id === 2) return true;
      // Właściciel posta
      return post.author_id === this.user.id;
    },
    
    // Sprawdza czy użytkownik może usunąć post
    canDeletePost(post) {
      if (!this.user) return false;
      // Tylko administrator lub moderator
      return this.user.role_id === 1 || this.user.role_id === 2;
    },
    
    // Rozpocznij edycję posta
    startEdit(post) {
      post.editing = true;
      post.editContent = post.content;
    },
    
    // Anuluj edycję posta
    cancelEdit(post) {
      post.editing = false;
      post.editContent = post.content;
    },
    
    // Zapisz zmiany w poście
    async saveEdit(post) {
      if (!post.editContent.trim()) {
        this.$message.warning('Post nie może być pusty');
        return;
      }
      
      post.saving = true;
      try {
        await axios.put(`/post/${post.id}`, {
          content: post.editContent
        });
        
        post.content = post.editContent;
        post.editing = false;
        this.$message.success('Post został zaktualizowany');
      } catch (error) {
        console.error('Error updating post:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas aktualizacji posta');
      } finally {
        post.saving = false;
      }
    },
    
    // Potwierdź i usuń post
    confirmDelete(post) {
      this.$confirm('Czy na pewno chcesz usunąć ten post? Tej operacji nie można cofnąć.', 'Potwierdzenie usunięcia', {
        confirmButtonText: 'Tak, usuń',
        cancelButtonText: 'Anuluj',
        type: 'warning',
        icon: 'el-icon-warning-outline'
      }).then(() => {
        this.deletePost(post);
      }).catch(() => {
        // Anulowano
      });
    },
    
    // Usuń post
    async deletePost(post) {
      try {
        await axios.delete(`/post/${post.id}`);
        this.$message.success('Post został usunięty');
        await this.loadThread(); // Odśwież wątek
      } catch (error) {
        console.error('Error deleting post:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas usuwania posta');
      }
    }
  }
}
</script>

<style scoped>
.thread-page {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.thread-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.thread-header h1 {
  color: var(--text-primary);
  margin-bottom: 10px;
}

.thread-meta {
  display: flex;
  gap: 15px;
  color: var(--text-secondary);
  font-size: 14px;
}

.thread-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.posts-container {
  margin-bottom: 30px;
}

.post {
  display: flex;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.post-even {
  background-color: var(--post-bg-even, #f8fafc);
  border: 1px solid var(--post-border-even, #e2e8f0);
}

.post-odd {
  background-color: var(--post-bg-odd, #ffffff);
  border: 1px solid var(--post-border-odd, #e2e8f0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.post:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
}

.post-sidebar {
  width: 120px;
  flex-shrink: 0;
  text-align: center;
  margin-right: 20px;
  border-right: 4px solid #e9e9ef;
}

.user-info {
  margin-top: 10px;
}

.username {
  font-weight: 600;
  color: var(--text-primary);
}

.user-status {
  font-size: 12px;
  margin-top: 5px;
}

.user-status.online {
  color: #67c23a;
}

.user-status.recent {
  color: #e6a23c;
}

.user-status.offline {
  color: var(--text-secondary);
}

.post-content {
  flex: 1;
}

.post-body {
  line-height: 1.6;
  color: var(--text-primary);
  min-height: 50px;
}


.post-body :deep(*) {
  margin-bottom: 10px;
}

.post-body :deep(h1), .post-body :deep(h2), .post-body :deep(h3) {
  color: var(--text-primary);
  margin-top: 20px;
  margin-bottom: 10px;
}

.post-body :deep(code) {
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.post-body :deep(pre) {
  background: #1e1e1e;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid var(--el-border-color-light);
  position: relative;
}

.post-body :deep(pre)::before {
  content: attr(class);
  position: absolute;
  top: 0;
  right: 0;
  background: var(--el-color-primary);
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-bottom-left-radius: 4px;
  text-transform: uppercase;
}

.post-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.5;
  font-size: 14px;
}

/* Etykiety językowe dla różnych typów kodu */
.post-body :deep(pre.language-javascript)::before { content: 'javascript'; background: #f7df1e; color: #000; }
.post-body :deep(pre.language-js)::before { content: 'javascript'; background: #f7df1e; color: #000; }
.post-body :deep(pre.language-typescript)::before { content: 'typescript'; background: #3178c6; }
.post-body :deep(pre.language-ts)::before { content: 'typescript'; background: #3178c6; }
.post-body :deep(pre.language-html)::before { content: 'html'; background: #e34f26; }
.post-body :deep(pre.language-css)::before { content: 'css'; background: #1572b6; }
.post-body :deep(pre.language-python)::before { content: 'python'; background: #3776ab; }
.post-body :deep(pre.language-py)::before { content: 'python'; background: #3776ab; }
.post-body :deep(pre.language-java)::before { content: 'java'; background: #007396; }
.post-body :deep(pre.language-php)::before { content: 'php'; background: #777bb4; }
.post-body :deep(pre.language-ruby)::before { content: 'ruby'; background: #cc342d; }
.post-body :deep(pre.language-rb)::before { content: 'ruby'; background: #cc342d; }
.post-body :deep(pre.language-csharp)::before { content: 'c#'; background: #239120; }
.post-body :deep(pre.language-cs)::before { content: 'c#'; background: #239120; }
.post-body :deep(pre.language-cpp)::before { content: 'c++'; background: #00599c; }
.post-body :deep(pre.language-c)::before { content: 'c'; background: #a8b9cc; color: #000; }
.post-body :deep(pre.language-go)::before { content: 'go'; background: #00add8; }
.post-body :deep(pre.language-rust)::before { content: 'rust'; background: #000000; }
.post-body :deep(pre.language-swift)::before { content: 'swift'; background: #fa7343; }
.post-body :deep(pre.language-kotlin)::before { content: 'kotlin'; background: #7f52ff; }
.post-body :deep(pre.language-sql)::before { content: 'sql'; background: #336791; }
.post-body :deep(pre.language-bash)::before { content: 'bash'; background: #4eaa25; }
.post-body :deep(pre.language-shell)::before { content: 'shell'; background: #4eaa25; }
.post-body :deep(pre.language-sh)::before { content: 'shell'; background: #4eaa25; }
.post-body :deep(pre.language-yaml)::before { content: 'yaml'; background: #cb171e; }
.post-body :deep(pre.language-yml)::before { content: 'yaml'; background: #cb171e; }
.post-body :deep(pre.language-json)::before { content: 'json'; background: #000000; }
.post-body :deep(pre.language-xml)::before { content: 'xml'; background: #f36b3c; }
.post-body :deep(pre.language-markdown)::before { content: 'markdown'; background: #000000; }
.post-body :deep(pre.language-md)::before { content: 'markdown'; background: #000000; }

/* Kompleksowe kolorowanie składni w stylu VS Code */
.post-body :deep(.hljs) {
  display: block;
  overflow-x: auto;
  color: #d4d4d4;
}

.post-body :deep(.hljs-keyword) { color: #569cd6; font-style: italic; }
.post-body :deep(.hljs-built_in) { color: #4ec9b0; }
.post-body :deep(.hljs-type) { color: #4ec9b0; }
.post-body :deep(.hljs-literal) { color: #569cd6; }
.post-body :deep(.hljs-number) { color: #b5cea8; }
.post-body :deep(.hljs-string) { color: #ce9178; }
.post-body :deep(.hljs-doctag) { color: #ce9178; }
.post-body :deep(.hljs-comment) { color: #6a9955; font-style: italic; }
.post-body :deep(.hljs-title) { color: #dcdcaa; }
.post-body :deep(.hljs-params) { color: #9cdcfe; }
.post-body :deep(.hljs-function) { color: #dcdcaa; }
.post-body :deep(.hljs-class) { color: #4ec9b0; }
.post-body :deep(.hljs-meta) { color: #9cdcfe; }
.post-body :deep(.hljs-section) { color: #dcdcaa; }
.post-body :deep(.hljs-variable) { color: #9cdcfe; }
.post-body :deep(.hljs-name) { color: #569cd6; }
.post-body :deep(.hljs-tag) { color: #569cd6; }
.post-body :deep(.hljs-attr) { color: #9cdcfe; }
.post-body :deep(.hljs-attribute) { color: #9cdcfe; }
.post-body :deep(.hljs-bullet) { color: #d7ba7d; }
.post-body :deep(.hljs-code) { color: #b5cea8; }
.post-body :deep(.hljs-emphasis) { color: #ce9178; font-style: italic; }
.post-body :deep(.hljs-strong) { color: #ce9178; font-weight: bold; }
.post-body :deep(.hljs-formula) { color: #d7ba7d; }
.post-body :deep(.hljs-link) { color: #9cdcfe; }
.post-body :deep(.hljs-quote) { color: #6a9955; font-style: italic; }
.post-body :deep(.hljs-selector-tag) { color: #569cd6; }
.post-body :deep(.hljs-selector-id) { color: #569cd6; }
.post-body :deep(.hljs-selector-class) { color: #569cd6; }
.post-body :deep(.hljs-selector-attr) { color: #9cdcfe; }
.post-body :deep(.hljs-selector-pseudo) { color: #569cd6; }
.post-body :deep(.hljs-template-tag) { color: #ce9178; }
.post-body :deep(.hljs-template-variable) { color: #9cdcfe; }
.post-body :deep(.hljs-addition) { background: #144212; color: #b5cea8; display: inline-block; width: 100%; }
.post-body :deep(.hljs-deletion) { background: #600; color: #ce9178; display: inline-block; width: 100%; }

/* Specyficzne style dla JSON */
.post-body :deep(.language-json .hljs-attr) { color: #9cdcfe; }
.post-body :deep(.language-json .hljs-string) { color: #ce9178; }
.post-body :deep(.language-json .hljs-number) { color: #b5cea8; }
.post-body :deep(.language-json .hljs-literal) { color: #569cd6; }

/* Specyficzne style dla JavaScript/TypeScript */
.post-body :deep(.language-javascript .hljs-function),
.post-body :deep(.language-typescript .hljs-function) { color: #dcdcaa; }
.post-body :deep(.language-javascript .hljs-title),
.post-body :deep(.language-typescript .hljs-title) { color: #dcdcaa; }

/* Specyficzne style dla HTML/XML */
.post-body :deep(.language-html .hljs-tag),
.post-body :deep(.language-xml .hljs-tag) { color: #569cd6; }
.post-body :deep(.language-html .hljs-name),
.post-body :deep(.language-xml .hljs-name) { color: #569cd6; }
.post-body :deep(.language-html .hljs-attr),
.post-body :deep(.language-xml .hljs-attr) { color: #9cdcfe; }
.post-body :deep(.language-html .hljs-string),
.post-body :deep(.language-xml .hljs-string) { color: #ce9178; }

/* Specyficzne style dla CSS */
.post-body :deep(.language-css .hljs-selector-class) { color: #d7ba7d; }
.post-body :deep(.language-css .hljs-selector-tag) { color: #569cd6; }
.post-body :deep(.language-css .hljs-attribute) { color: #9cdcfe; }
.post-body :deep(.language-css .hljs-number) { color: #b5cea8; }
.post-body :deep(.language-css .hljs-string) { color: #ce9178; }

.post-body :deep(blockquote) {
  border-left: 4px solid var(--el-color-primary);
  padding-left: 12px;
  margin: 10px 0;
  color: var(--text-secondary);
}

.post-body :deep(ul), .post-body :deep(ol) {
  padding-left: 20px;
  margin: 10px 0;
}

.post-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

.post-body :deep(th), .post-body :deep(td) {
  border: 1px solid var(--el-border-color-light);
  padding: 8px;
}

.post-body :deep(th) {
  background-color: var(--el-fill-color-light);
}


.edit-container {
  margin-bottom: 15px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-light);
}

.post-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.post-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: var(--el-fill-color-light);
}

.action-btn.delete-btn {
  color: var(--el-color-danger);
}

.action-btn.delete-btn:hover {
  background-color: var(--el-color-danger-light-9);
}

.quick-reply {
  margin-top: 30px;
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.quick-reply h3 {
  margin-bottom: 15px;
  color: var(--text-primary);
}

.reply-editor {
  margin-bottom: 15px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.editor-actions .el-button {
  display: flex;
  align-items: center;
  gap: 5px;
}

.preview-container {
  margin-top: 15px;
  padding: 15px;
  background: white;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-light);
}

.preview-header {
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.preview-content {
  line-height: 1.6;
}

.thread-locked {
  margin-top: 20px;
}

/* Dla ciemnego motywu */
@media (prefers-color-scheme: dark) {
  .post-even {
        background-color: var(--post-bg-even-dark, #f7f7f773);
        border-color: var(--post-border-even-dark, #e9e8e8);
  }
  
  .post-odd {
        background-color: var(--post-bg-odd-dark, #d9d9d92e);
        border-color: var(--post-border-even-dark, #dde2eb);
  }
}
</style>
