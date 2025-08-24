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
      <div class="thread-title-row">
        <h1>{{ thread.title }}</h1>
        <div class="thread-status-tags">
          <el-tag v-if="thread.is_sticky" size="small" type="warning" class="status-tag">
            <Icon icon="mdi:pin" />
            Przyklejony
          </el-tag>
          <el-tag v-if="thread.is_closed" size="small" type="danger" class="status-tag">
            <Icon icon="mdi:lock" />
            Zamknięty
          </el-tag>
        </div>
      </div>
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
        
        <div class="post-number">
          <a :href="`#post-${post.id}`" class="post-number-link">
            #{{ index + 1 }}
          </a>
        </div>
           
        <div class="post-sidebar">
          <UserAvatar :user="post.author" :status="post.author_status" :avatar="post.author_avatar" />
          <div class="user-info">
            <div class="username">{{ post.author }}</div>
            <div class="user-status" :class="post.author_status">
              {{ getUserStatusText(post.author_status) }}
            </div>
            <div class="user-posts" v-if="post.author_posts">
              <Icon icon="mdi:message-text" />
              {{ post.author_posts }} postów
            </div>
            
              <!-- Dodane informacje o użytkowniku -->
  <div class="user-details">
    <div class="user-detail" v-if="post.author_register_date">
      <Icon icon="mdi:calendar" />
      Rejestracja: {{ post.author_register_date }}
    </div>
    <div class="user-detail" v-if="post.author_last_login">
      <Icon icon="mdi:clock" />
      Ostatnio: {{ formatLastActivity(post.author_last_login) }}
    </div>
    <div class="user-detail" v-if="post.author_posts_count">
      <Icon icon="mdi:message-text" />
      Postów: {{ post.author_posts_count }}
    </div>
  </div>
  
          </div>
        </div>
        <div class="post-content">
          <a :id="`post-${post.id}`" class="post-anchor"></a>
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
                <div class="post-date">
		  {{ formatDateTime(post.date) }}
		 <span v-if="post.edited_at" class="edited-info">
	          (edytowano {{ formatRelativeTime(post.edited_at) }})
		 </span>
		</div>
            <div class="post-actions" v-if="user">
              <button class="action-btn" @click="quotePost(post)" :disabled="thread.is_closed">
                <Icon icon="mdi:format-quote-close" />
                Cytuj
              </button>
              
              <!-- Przycisk edycji (właściciel posta, admin, moderator) -->
              <button v-if="canEditPost(post)" class="action-btn" @click="startEdit(post)" :disabled="thread.is_closed && !isModerator">
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
    <div class="quick-reply" v-if="user && canReply">
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

    <div class="thread-locked" v-else-if="thread.is_closed">
      <el-alert
        title="Wątek zamknięty"
        type="warning"
        description="Ten wątek jest zamknięty. Nie możesz dodawać odpowiedzi ani edytować istniejących."
        show-icon
        :closable="false"
      />
    </div>

    <div class="thread-locked" v-else-if="category.is_locked">
      <el-alert
        title="Kategoria zablokowana"
        type="warning"
        description="Ta kategoria jest zablokowana. Nie możesz dodawać odpowiedzi."
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
  computed: {
    // Sprawdza czy użytkownik jest moderatorem lub administratorem
    isModerator() {
      return this.user && (this.user.role_id === 1 || this.user.role_id === 2);
    },
    
    // Sprawdza czy użytkownik może odpowiadać w wątku
    canReply() {
      // Kategoria zablokowana - tylko moderatorzy mogą odpowiadać
      if (this.category.is_locked) {
        return this.isModerator;
      }
      
      // Wątek zamknięty - tylko moderatorzy mogą odpowiadać
      if (this.thread.is_closed) {
        return this.isModerator;
      }
      
      // Dla zwykłych użytkowników - mogą odpowiadać jeśli kategoria i wątek nie są zablokowane
      return true;
    }
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
      
      // Sprawdź czy wątek jest zamknięty
      if (this.thread.is_closed && !this.isModerator) {
        this.$message.warning('Nie możesz odpowiadać w zamkniętym wątku');
        return;
      }
      
      // Sprawdź czy kategoria jest zablokowana
      if (this.category.is_locked && !this.isModerator) {
        this.$message.warning('Nie możesz odpowiadać w zablokowanej kategorii');
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
      if (this.thread.is_closed && !this.isModerator) {
        this.$message.warning('Nie możesz cytować w zamkniętym wątku');
        return;
      }
      
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
      
      // Administrator lub moderator może edytować nawet w zamkniętych wątkach
      if (this.isModerator) return true;
      
      // W zwykłych wątkach właściciel posta może edytować
      if (!this.thread.is_closed && post.author_id === this.user.id) return true;
      
      return false;
    },
    
    // Sprawdza czy użytkownik może usunąć post
    canDeletePost(post) {
      if (!this.user) return false;
      // Tylko administrator lub moderator
      return this.isModerator;
    },
    
    // Rozpocznij edycję posta
    startEdit(post) {
      if (this.thread.is_closed && !this.isModerator) {
        this.$message.warning('Nie możesz edytować postów w zamkniętym wątku');
        return;
      }
      
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
        // Użyj odpowiedniego endpointu w zależności od uprawnień
        const endpoint = this.isModerator ? `/admin/posts/${post.id}` : `/post/${post.id}`;
        
        await axios.put(endpoint, {
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
        const endpoint = this.isModerator ? `/admin/posts/${post.id}` : `/post/${post.id}`;
        await axios.delete(endpoint);
        
        this.$message.success('Odpowiedź została usunięta');
        await this.loadThread(); // Odśwież wątek
      } catch (error) {
        console.error('Error deleting post:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas usuwania odpowiedzi');
      }
    },
  
    formatRelativeTime(dateString) {
      if (!dateString) return 'Brak danych';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Nieprawidłowa data';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'teraz';
      if (diffMins < 60) return `${diffMins} min`;
      if (diffHours < 24) return `${diffHours} godz`;
      if (diffDays === 1) return '1 dzień';
      if (diffDays < 30) return `${diffDays} dni`;
      
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths === 1) return '1 miesiąc';
      return `${diffMonths} miesięcy`;
    }, 
  
  formatDaysAgo(dateString) {
    if (!dateString) return 'brak danych';
    
    const joinDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - joinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 dzień';
    if (diffDays < 30) return `${diffDays} dni`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 miesiąc';
    if (diffMonths < 12) return `${diffMonths} miesięcy`;
    
    const diffYears = Math.floor(diffMonths / 12);
    if (diffYears === 1) return '1 rok';
    return `${diffYears} lat`;
  },
  
  formatLastActivity(dateString) {
    if (!dateString) return 'brak danych';
    
    const activityDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'teraz';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} godz`;
    if (diffDays === 1) return '1 dzień';
    if (diffDays < 30) return `${diffDays} dni`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 miesiąc';
    return `${diffMonths} miesięcy`;
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

.thread-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.thread-header h1 {
  color: var(--text-primary);
  margin: 0;
}

.thread-status-tags {
  display: flex;
  gap: 8px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
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
  position: relative; /* Potrzebne dla pozycjonowania numeru */
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

.post-number {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 2;
}

.post-number-link {
  display: block;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.post-number-link:hover {
  color: var(--el-color-primary);
  transform: scale(1.1);
}

.post-sidebar {
  width: 140px;
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
  margin-bottom: 5px;
}

.user-status {
  font-size: 12px;
  margin-bottom: 5px;
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

.user-posts {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 5px;
}

.post-content {
  flex: 1;
  position: relative;
}

.post-anchor {
  position: absolute;
  top: -70px; /* Offset dla fixed header */
  visibility: hidden;
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
  overflow-x: auto; /* Dodaj przewijanie poziome */
  margin: 16px 0;
  border: 1px solid var(--el-border-color-light);
  position: relative;
  max-width: 100%; /* Zapobiega rozszerzaniu poza kontener */
  white-space: pre-wrap; /* Zawijanie wierszy */
  word-wrap: break-word; /* Łamanie długich słów */
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
  white-space: pre-wrap; /* Zawijanie kodu */
  word-wrap: break-word; /* Łamanie długich linii */
  display: block;
  overflow-x: auto;
}

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
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--el-fill-color-light);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.delete-btn {
  color: var(--el-color-danger);
}

.action-btn.delete-btn:hover:not(:disabled) {
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

.user-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.user-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 3px;
  line-height: 1.3;
}

.user-detail:last-child {
  margin-bottom: 0;
}

.user-detail .iconify {
  font-size: 9px;
  opacity: 0.7;
}

.edited-info {
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
}

  html.dark .post-even {
    background-color: var(--post-bg-even-dark, #2d3748);
    border-color: var(--post-border-even-dark, #4a5568);
  }
  
  html.dark .post-odd {
    background-color: var(--post-bg-odd-dark, #1a202c);
    border-color: var(--post-border-odd-dark, #4a5568);
  }
  
  html.dark .post-number-link {
    background: var(--el-color-primary-dark-2);
  }
  
  html.dark .post-number-link:hover {
    background: var(--el-color-primary);
  }

/* Dla ciemnego motywu */
@media (prefers-color-scheme: dark) {
  .post-body :deep(pre) {
    background: #2d3748;
    border-color: #4a5568;
  }
  
  .post-body :deep(pre code) {
    color: #e2e8f0;
  }

  
  .preview-container {
    background: #2d3748;
    border-color: #4a5568;
  }
  
  .post-number-link {
  }
  
  .post-number-link:hover {
  }
  
}

/* Responsywność */
@media (max-width: 768px) {
  .thread-title-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .thread-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .post {
    padding: 15px;
    padding-left: 50px; /* Więcej miejsca na mobile */
  }
  
  .post-number {
    top: 10px;
    left: 10px;
  }
  
  .post-number-link {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }
  
  .post-sidebar {
    margin-left: 0;
    width: 100%;
    margin-right: 0;
    margin-bottom: 15px;
    border-right: none;
    border-bottom: 2px solid #e9e9ef;
    padding-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
  }
  
.post-number-alt {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 2;
}

.post-number-alt-link {
  display: block;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  color: var(--text-secondary);
  border-radius: 4px;
  font-weight: 500;
  font-size: 11px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid var(--el-border-color-light);
}

.post-number-alt-link:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
}
  
  .user-info {
    margin-top: 0;
    text-align: left;
  }
  
  .post-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .post-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
