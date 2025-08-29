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
          <el-button 
            v-if="user" 
            size="small" 
            :type="isWatching ? 'success' : 'default'" 
            :loading="watchingLoading"
            @click="toggleWatchThread"
            class="watch-btn"
          >
            <Icon :icon="isWatching ? 'mdi:bell' : 'mdi:bell-outline'" />
            {{ isWatching ? 'Obserwowany' : 'Obserwuj' }}
          </el-button>
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
            <a 
              :href="`/profile/${post.author_id}`" 
              class="username profile-link"
            >
              {{ post.author }}
            </a>
            
            <!-- Reputacja użytkownika -->
            <div class="user-reputation" v-if="post.author_reputation !== undefined">
              <Icon icon="mdi:star" class="reputation-icon" />
              <span :class="getReputationClass(post.author_reputation)">
                {{ post.author_reputation > 0 ? '+' : '' }}{{ post.author_reputation }}
              </span>
            </div>
            
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

              <!-- Przycisk wysyłania wiadomości prywatnej -->
              <div class="user-detail pm-action" v-if="user && user.id !== post.author_id">
                <el-tooltip 
                  effect="dark" 
                  content="Wyślij wiadomość prywatną" 
                  placement="top"
                >
                  <button 
                    class="pm-button"
                    @click="openPrivateMessageModal(post.author, post.author_id)"
                  >
                    <Icon icon="mdi:email-fast-outline" />
                  </button>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>

        <div class="post-main-content">
          <!-- Nagłówek posta z systemem reputacji -->

            <ReputationSystem
              v-if="user"
              :target-type="'post'"
              :target-id="post.id"
              :user-id="post.author_id"
              :current-user="user"
              :initial-score="post.reputation_score || 0"
              :initial-vote="post.user_vote"
              @vote-cast="handleVoteCast($event, post)"
              class="post-reputation-system"
            />
            
            <a :id="`post-${post.id}`" class="post-anchor"></a>

          <div class="post-content-body">
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

  <!-- Modal do wysyłania wiadomości prywatnych -->
  <div v-if="pmModalVisible" class="pm-modal-overlay" @click.self="pmModalVisible = false">
    <div class="pm-modal">
      <div class="pm-modal-header">
        <h3>Wyślij wiadomość prywatną do {{ pmRecipientName }}</h3>
        <button class="pm-modal-close" @click="pmModalVisible = false">
          <Icon icon="mdi:close" />
        </button>
      </div>
      
      <div class="pm-modal-content">
        
        <v-md-editor 
          v-model="pmContent" 
          :disabled-menus="[]" 
          height="200px"
          placeholder="Treść wiadomości..."
          left-toolbar="undo redo clear | h bold italic strikethrough quote | ul ol table hr | link image code"
          class="pm-editor"
        />
        
        <div class="pm-preview" v-if="pmPreview">
          <div class="preview-header">Podgląd wiadomości:</div>
          <div class="preview-content" v-html="compiledMarkdown(pmContent)" />
        </div>
      </div>
      
      <div class="pm-modal-footer">
        <el-button @click="pmModalVisible = false">Anuluj</el-button>
        <el-button @click="pmPreview = !pmPreview">
          {{ pmPreview ? 'Edytuj' : 'Podgląd' }}
        </el-button>
        <el-button 
          type="primary" 
          @click="sendPrivateMessage" 
          :loading="pmSending"
          :disabled="!pmContent.trim()"
        >
          Wyślij wiadomość
        </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import UserAvatar from './UserAvatar.vue';
import ReputationSystem from './ReputationSystem.vue';

export default {
  name: 'ThreadPage',
  components: {
    Icon,
    UserAvatar,
    ReputationSystem
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
      previewMode: false,
      isWatching: false,
      watchingLoading: false,
      
      // Nowe dane dla wiadomości prywatnych
      pmModalVisible: false,
      pmRecipientId: null,
      pmRecipientName: '',
      pmSubject: '',
      pmContent: '',
      pmSending: false,
      pmPreview: false
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
    this.checkWatchStatus();
  },
  methods: {
    async loadThread() {
      try {
        const response = await axios.get(`/thread/${this.threadData.id}`, {
          params: {
            include_reputation: this.user ? 1 : 0
          }
        });
        this.thread = response.data.thread;
        this.posts = response.data.posts.map(post => ({
          ...post,
          editing: false,
          editContent: post.content,
          saving: false,
          reputation_score: post.reputation_score || 0,
          user_vote: post.user_vote || null,
          author_reputation: post.author_reputation || 0
        }));
        
        // OZNACZ JAKO PRZECZYTANE
        await this.markAsRead();
        
        // Zwiększ licznik wyświetleń
        await axios.put(`/thread/${this.threadData.id}/view`);
      } catch (error) {
        console.error('Error loading thread:', error);
        this.$message.error('Błąd podczas ładowania wątku');
      }
    },

    async markAsRead() {
      if (this.user) {
        // Dla zalogowanych - zapisz w bazie
        try {
          await axios.post('/mark-read', { 
            threadId: this.threadData.id,
            postIds: this.posts.map(post => post.id),
            categoryId: this.thread.category_id
          });
        } catch (error) {
          console.error('Error marking as read:', error);
        }
      } else {
        // Dla niezalogowanych - zapisz w localStorage
        const lastVisitTimes = JSON.parse(localStorage.getItem('categoryLastVisit') || '{}');
        lastVisitTimes[this.thread.category_id] = Date.now();
        localStorage.setItem('categoryLastVisit', JSON.stringify(lastVisitTimes));
      }
      
      // Powiadom komponent CategoriesList o zmianie
      this.$emit('category-visited', this.thread.category_id);
    },
    
    async markThreadAsRead(threadId) {
      if (this.user) {
        // Dla zalogowanych użytkowników - zapisz w bazie danych
        try {
          await axios.post('/mark-read', { threadId });
        } catch (error) {
          console.error('Error marking thread as read:', error);
        }
      } else {
        // Dla niezalogowanych - zapisz w localStorage
        const readThreads = new Set(JSON.parse(localStorage.getItem('readThreads') || '[]'));
        readThreads.add(threadId);
        localStorage.setItem('readThreads', JSON.stringify(Array.from(readThreads)));
      }
    },
    
    async markPostsAsRead(postIds) {
      if (this.user) {
        // Dla zalogowanych użytkowników - zapisz w bazie danych
        try {
          await axios.post('/mark-read', { postIds });
        } catch (error) {
          console.error('Error marking posts as read:', error);
        }
      } else {
        // Dla niezalogowanych - zapisz w localStorage
        const readPosts = new Set(JSON.parse(localStorage.getItem('readPosts') || '[]'));
        postIds.forEach(postId => readPosts.add(postId));
        localStorage.setItem('readPosts', JSON.stringify(Array.from(readPosts)));
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
        
        // Wyzwól aktualizację osiągnięć
        try {
	  await axios.post('/user-activity', {
	    activity_type: 'post_created',
	    target_id: this.thread.id,
	    target_type: 'post'
	  });
	} catch (error) {
	  console.error('Error logging activity:', error);
	}
        
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
        
        // Wyzwól aktualizację osiągnięć
	try {
	  await axios.post('/user-activity', {
	    activity_type: 'post_edited',
	    target_id: post.id,
	    target_type: 'post'
	  });
	} catch (error) {
	  console.error('Error logging activity:', error);
	}
        
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
    },
  
    async checkWatchStatus() {
      if (!this.user) return;
      
      try {
        const response = await axios.get(`/thread/${this.threadData.id}/watch-status`);
        this.isWatching = response.data.watching;
      } catch (error) {
        console.error('Error checking watch status:', error);
      }
    },
    
    // Przełącz obserwację wątku
    async toggleWatchThread() {
      if (!this.user) {
        this.$message.warning('Musisz być zalogowany, aby obserwować wątki');
        return;
      }
      
      this.watchingLoading = true;
      try {
        const endpoint = `/thread/${this.threadData.id}/watch`;
        const method = this.isWatching ? 'delete' : 'post';
        
        await axios[method](endpoint);
        this.isWatching = !this.isWatching;
        
        this.$message.success(
          this.isWatching 
            ? 'Rozpoczęto obserwowanie wątku. Będziesz otrzymywać powiadomienia o nowych odpowiedziach.' 
            : 'Zaprzestano obserwowania wątku.'
        );
      } catch (error) {
        console.error('Error toggling watch:', error);
        this.$message.error('Błąd podczas zmiany statusu obserwacji');
      } finally {
        this.watchingLoading = false;
      }
    },
    
    // Otwórz modal do wysyłania wiadomości prywatnej
    openPrivateMessageModal(recipientName, recipientId) {
      if (!this.user) {
        this.$message.warning('Musisz być zalogowany, aby wysyłać wiadomości prywatne');
        return;
      }
      
      this.pmRecipientId = recipientId;
      this.pmRecipientName = recipientName;
      this.pmContent = '';
      this.pmPreview = false;
      this.pmModalVisible = true;
    },
    
    async sendPrivateMessage() {
      if (!this.pmContent.trim()) {
        this.$message.warning('Treść wiadomości nie może być pusta');
        return;
      }
      
      this.pmSending = true;
      try {
        const response = await axios.post('/private-messages/send', {
          receiver_id: this.pmRecipientId,
          content: this.pmContent
        });
        
        this.$message.success('Wiadomość prywatna została wysłana');
        this.pmModalVisible = false;
        this.pmContent = '';
      } catch (error) {
        console.error('Error sending private message:', error);
        
        if (error.response) {
          console.error('Response error:', error.response.data);
          this.$message.error(error.response.data.error || 'Błąd podczas wysyłania wiadomości');
        } else if (error.request) {
          console.error('Request error:', error.request);
          this.$message.error('Błąd połączenia z serwerem');
        } else {
          this.$message.error('Nieoczekiwany błąd');
        }
      } finally {
        this.pmSending = false;
      }
    },

    // Nowe metody dla systemu reputacji
    getReputationClass(reputation) {
      if (reputation > 0) return 'reputation-positive';
      if (reputation < 0) return 'reputation-negative';
      return 'reputation-neutral';
    },
    
    handleVoteCast(voteData, post) {
      // Aktualizuj wynik posta lokalnie
      const postIndex = this.posts.findIndex(p => p.id === voteData.targetId);
      if (postIndex !== -1) {
        this.posts[postIndex].reputation_score = voteData.newScore;
        this.posts[postIndex].user_vote = voteData.voteType;
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

.watch-btn {
  margin-left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.post {
  display: flex;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
  position: relative;
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

html.dark .post-even {
    background-color: var(--post-bg-even, #242424);
    border: 1px solid var(--post-border-even, #2a2a2a);
}

html.dark .post-odd {
  background-color: var(--post-bg-odd, #2c2c2c);
  border: 1px solid var(--post-border-odd, #505050);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

html.dark .post-sidebar {
    border-right: 4px solid #303030;
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
  width: 160px;
  flex-shrink: 0;
  text-align: center;
  margin-right: 20px;
  padding-right: 20px;
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

/* Styl dla reputacji użytkownika */
.user-reputation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 8px 0;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-radius: 12px;
}

.reputation-icon {
  color: #ffc107;
  font-size: 14px;
}

.reputation-positive {
  color: var(--el-color-success);
}

.reputation-negative {
  color: var(--el-color-danger);
}

.reputation-neutral {
  color: var(--text-secondary);
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

.post-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative; /* Potrzebne dla absolutnego pozycjonowania */
  padding-top: 5px; /* Dodaj trochę miejsca na górze */
}

.post-header {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin-bottom: 10px;
  min-height: 32px;
}

.post-reputation-system {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background: var(--card-bg);
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--el-border-color-light);
}

.post-anchor {
  position: absolute;
  top: -70px;
  visibility: hidden;
}

.post-content-body {
  flex: 1;
  padding-top: 0; /* Usuń padding, treść zaczyna się od góry */
}

.post-body {
  line-height: 1.6;
  color: var(--text-primary);
  min-height: 50px;
  padding-right: 60px; /* Zostaw miejsce na system reputacji */
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
  max-width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
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
  white-space: pre-wrap;
  word-wrap: break-word;
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

/* Style dla przycisku PW */
.pm-action {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
}

.pm-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
}

.pm-button:hover {
  background: var(--el-color-primary);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Style dla modalu PW */
.pm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.pm-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.pm-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.pm-modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.pm-modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.pm-modal-close:hover {
  background-color: var(--el-fill-color-light);
  color: var(--text-primary);
}

.pm-modal-content {
  padding: 20px;
}

.pm-subject {
  margin-bottom: 15px;
}

.pm-editor {
  margin-bottom: 15px;
}

.pm-preview {
  margin-top: 15px;
  padding: 15px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-light);
}

.pm-preview .preview-header {
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.pm-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-light);
}

/* Dla ciemnego motywu */
@media (prefers-color-scheme: dark) {
  .pm-modal {
    background: var(--card-bg);
  }
  
  .pm-button {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-dark-2);
    color: var(--el-color-primary-light-3);
  }
  
  .pm-button:hover {
    background: var(--el-color-primary);
    color: white;
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
    padding-left: 50px;
    flex-direction: column;
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
    width: 100%;
    margin-right: 0;
    margin-bottom: 15px;
    border-right: none;
    border-bottom: 2px solid #e9e9ef;
    padding-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 15px;
    text-align: left;
  }
  
  .user-info {
    margin-top: 0;
    text-align: left;
    flex: 1;
  }
  
  .user-reputation {
    justify-content: flex-start;
  }
  
  .post-header {
    justify-content: space-between;
    align-items: center;
  }
  
  .post-reputation-system {
    margin-left: 0;
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
  
  .pm-modal {
    max-width: 100%;
    margin: 0;
  }
  
  .pm-modal-footer {
    flex-direction: column;
  }
  
  .pm-modal-footer .el-button {
    width: 100%;
  }
}

/* Dla bardzo małych ekranów */
@media (max-width: 480px) {
  .post-sidebar {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .user-info {
    text-align: center;
  }
  
  .user-reputation {
    justify-content: center;
  }
}

.profile-link {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
  display: inline-block;
  margin-bottom: 5px;
}

.profile-link:hover {
  color: var(--el-color-primary);
  text-decoration: underline;
}

/* Dla ciemnego motywu */
@media (prefers-color-scheme: dark) {
  .profile-link:hover {
    color: var(--el-color-primary-light-3);
  }
}
</style>
