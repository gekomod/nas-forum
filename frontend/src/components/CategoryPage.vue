<template>
  <div class="category-container">
    <div class="breadcrumbs">
      <a href="#" class="breadcrumb-link" @click.prevent="$emit('back-to-categories')">
        <Icon icon="mdi:home" />
        Forum
      </a>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">{{ category.name }}</span>
      <el-tag v-if="category.is_locked" type="danger" size="small" class="lock-tag">
        <Icon icon="mdi:lock" />
        Zablokowana
      </el-tag>
    </div>

    <div class="category-content">
      <div class="category-header">
        <div class="category-info">
          <div class="category-icon-title">
            <Icon :icon="category.icon" class="category-icon" />
            <h2>{{ category.name }}</h2>
          </div>
          <p class="category-description" v-if="category.description">{{ category.description }}</p>
        </div>
        
        <button 
          class="new-thread-btn" 
          @click="$emit('create-thread')" 
          v-if="user && (!category.is_locked || user.role_id === 1 || user.role_id === 2)"
          :disabled="category.is_locked && (user.role_id !== 1 && user.role_id !== 2)"
        >
          <Icon icon="mdi:plus" />
          Nowy wątek
        </button>
      </div>

      <!-- Komunikat dla zablokowanych kategorii -->
      <el-alert
        v-if="category.is_locked && (!user || (user.role_id !== 1 && user.role_id !== 2))"
        title="Kategoria zablokowana"
        type="warning"
        description="Ta kategoria jest tymczasowo zablokowana. Nie można tworzyć nowych wątków."
        show-icon
        :closable="false"
        class="category-alert"
      />
      
      <el-alert
        v-else-if="category.is_locked"
        title="Kategoria zablokowana"
        type="info"
        description="Ta kategoria jest zablokowana dla zwykłych użytkowników. Jako administrator/moderator możesz przeglądać i moderować zawartość."
        show-icon
        :closable="false"
        class="category-alert"
      />

      <!-- Lista wątków -->
      <div class="threads-container">
        <div class="threads-header">
          <span class="threads-title">Wątki</span>
          <div class="threads-filter">
            <el-select v-model="sortBy" placeholder="Sortuj" size="small" class="filter-select">
              <el-option label="Najnowsze" value="newest" />
              <el-option label="Najpopularniejsze" value="popular" />
              <el-option label="Z najwięcej odpowiedziami" value="most-replies" />
            </el-select>
          </div>
        </div>

        <div class="threads-list">
          <!-- Przyklejone wątki -->
          <div 
            v-for="thread in stickyThreads" 
            :key="'sticky-' + thread.id" 
            class="thread-card sticky-thread"
          >
            <div class="thread-main" @click="selectThread(thread)">
              <div class="thread-icon-container">
                <div class="thread-icon sticky">
                  <Icon icon="mdi:pin" class="sticky-icon" />
                </div>
              </div>

              <div class="thread-content">
                <div class="thread-title-row">
                  <h3 class="thread-title">{{ thread.title }}</h3>
                  <div class="thread-status-tags">
                    <el-tag size="small" type="warning" class="status-tag">
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
                    <Icon icon="mdi:account-outline" />
                    {{ thread.author }}
                  </span>
                  <span class="thread-date">
                    <Icon icon="mdi:clock-outline" />
                    {{ formatDate(thread.date) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="thread-right-section">
              <div class="thread-stats">
                <div class="stat">
                  <Icon icon="mdi:message-reply" />
                  <span>{{ thread.replies }}</span>
                </div>
                <div class="stat">
                  <Icon icon="mdi:eye-outline" />
                  <span>{{ thread.views }}</span>
                </div>
              </div>

              <div class="thread-lastpost" v-if="thread.last_post_author">
                <div class="lastpost-avatar">
                  <div class="avatar-placeholder">
                    <Icon icon="mdi:account" />
                  </div>
                </div>
                <div class="lastpost-info">
                  <div class="lastpost-author">{{ thread.last_post_author }}</div>
                  <div class="lastpost-time">{{ formatRelativeTime(thread.last_post_time) }}</div>
                </div>
              </div>

              <div class="thread-actions" v-if="user && (user.id === thread.user_id || user.role_id === 1 || user.role_id === 2)">
                <el-dropdown trigger="click" @click.stop>
                  <button class="action-btn" @click.stop>
                    <Icon icon="mdi:dots-vertical" />
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item 
                        v-if="user.id === thread.user_id && thread.replies === 0 && !thread.is_closed"
                        @click="confirmDeleteThread(thread.id)">
                        <Icon icon="mdi:delete" /> Usuń wątek
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="user.role_id === 1 || user.role_id === 2"
                        @click="confirmDeleteThread(thread.id, true)">
                        <Icon icon="mdi:delete" /> Usuń (moderator)
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="(user.role_id === 1 || user.role_id === 2) && !thread.is_closed"
                        @click="$emit('toggle-close-thread', thread.id)">
                        <Icon icon="mdi:lock" /> Zamknij wątek
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="(user.role_id === 1 || user.role_id === 2) && thread.is_closed"
                        @click="$emit('toggle-close-thread', thread.id)">
                        <Icon icon="mdi:lock-open" /> Otwórz wątek
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="user.role_id === 1 || user.role_id === 2"
                        @click="$emit('toggle-sticky-thread', thread.id)">
                        <Icon icon="mdi:pin-off" />
                        Odepnij
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>

          <!-- Separator między przyklejonymi a zwykłymi wątkami -->
          <div class="threads-separator" v-if="stickyThreads.length > 0 && normalThreads.length > 0">
            <span>Zwykłe wątki</span>
          </div>

          <!-- Zwykłe wątki -->
          <div 
            v-for="thread in normalThreads" 
            :key="'normal-' + thread.id" 
            class="thread-card"
          >
            <div class="thread-main" @click="selectThread(thread)">
              <div class="thread-icon-container">
                <div class="thread-icon" :class="{ 'closed': thread.is_closed }">
                  <Icon 
                    v-if="thread.is_closed" 
                    icon="mdi:lock" 
                    class="closed-icon" 
                  />
                  <Icon 
                    v-else
                    icon="mdi:comment-text-outline" 
                    class="default-icon" 
                  />
                </div>
              </div>

              <div class="thread-content">
                <div class="thread-title-row">
                  <h3 class="thread-title">{{ thread.title }}</h3>
                  <div class="thread-status-tags">
                    <el-tag v-if="thread.is_closed" size="small" type="danger" class="status-tag">
                      <Icon icon="mdi:lock" />
                      Zamknięty
                    </el-tag>
                  </div>
                </div>
                
                <div class="thread-meta">
                  <span class="thread-author">
                    <Icon icon="mdi:account-outline" />
                    {{ thread.author }}
                  </span>
                  <span class="thread-date">
                    <Icon icon="mdi:clock-outline" />
                    {{ formatDate(thread.date) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="thread-right-section">
              <div class="thread-stats">
                <div class="stat">
                  <Icon icon="mdi:message-reply" />
                  <span>{{ thread.replies }}</span>
                </div>
                <div class="stat">
                  <Icon icon="mdi:eye-outline" />
                  <span>{{ thread.views }}</span>
                </div>
              </div>

              <div class="thread-lastpost" v-if="thread.last_post_author">
                <div class="lastpost-avatar">
                  <div class="avatar-placeholder">
                    <Icon icon="mdi:account" />
                  </div>
                </div>
                <div class="lastpost-info">
                  <div class="lastpost-author">{{ thread.last_post_author }}</div>
                  <div class="lastpost-time">{{ formatRelativeTime(thread.last_post_time) }}</div>
                </div>
              </div>

              <div class="thread-actions" v-if="user && (user.id === thread.user_id || user.role_id === 1 || user.role_id === 2)">
                <el-dropdown trigger="click">
                  <button class="action-btn" @click.stop>
                    <Icon icon="mdi:dots-vertical" />
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item 
                        v-if="user.id === thread.user_id && thread.replies === 0 && !thread.is_closed"
                        @click="confirmDeleteThread(thread.id)">
                        <Icon icon="mdi:delete" /> Usuń wątek
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="user.role_id === 1 || user.role_id === 2"
                        @click="confirmDeleteThread(thread.id, true)">
                        <Icon icon="mdi:delete" /> Usuń (moderator)
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="(user.role_id === 1 || user.role_id === 2) && !thread.is_closed"
                        @click="$emit('toggle-close-thread', thread.id)">
                        <Icon icon="mdi:lock" /> Zamknij wątek
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="(user.role_id === 1 || user.role_id === 2) && thread.is_closed"
                        @click="$emit('toggle-close-thread', thread.id)">
                        <Icon icon="mdi:lock-open" /> Otwórz wątek
                      </el-dropdown-item>
                      <el-dropdown-item 
                        v-if="user.role_id === 1 || user.role_id === 2"
                        @click="$emit('toggle-sticky-thread', thread.id)">
                        <Icon icon="mdi:pin" />
                        Przyklej
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" v-if="threads.length === 0">
          <Icon icon="mdi:forum-outline" class="empty-icon" />
          <h3>Brak wątków</h3>
          <p>Ta kategoria nie zawiera jeszcze żadnych wątków.</p>
          <button 
            class="empty-action-btn" 
            @click="$emit('create-thread')" 
            v-if="user && (!category.is_locked || user.role_id === 1 || user.role_id === 2)"
          >
            Utwórz pierwszy wątek
          </button>
        </div>
      </div>

      <div class="pagination" v-if="threads.length > 0">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="totalthreads"
          :page-size="pageSize"
          :pager-count="5"
          v-model:current-page="currentPage"
          @current-change="handlePageChange"
          class="thread-pagination"
        >
        </el-pagination>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from 'axios'

export default {
  name: 'CategoryPage',
  components: {
    Icon
  },
  props: {
    category: Object,
    threads: Array,
    user: Object
  },
  data() {
    return {
      sortBy: 'newest',
      loading: false,
      currentPage: 1,
      pageSize: 10,
      totalthreads: 0,
    };
  },
  computed: {
    // Przyklejone wątki - zawsze na górze
    stickyThreads() {
      if (!this.threads) return [];
      return this.threads.filter(thread => thread.is_sticky);
    },
    
    // Zwykłe wątki - sortowane według wybranej opcji
    normalThreads() {
      if (!this.threads) return [];
      
      let threads = this.threads.filter(thread => !thread.is_sticky);
      
      // Sortowanie według wybranej opcji
      if (this.sortBy === 'newest') {
        threads.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (this.sortBy === 'popular') {
        threads.sort((a, b) => b.views - a.views);
      } else if (this.sortBy === 'most-replies') {
        threads.sort((a, b) => b.replies - a.replies);
      }
      
      return threads;
    },
    
    totalReplies() {
      return this.threads.reduce((total, thread) => total + thread.replies, 0);
    }
  },
  methods: {
    Pagination() {
      this.totalthreads = this.threads.length;
    },
    handleCreateThread() {
      if (!this.category) {
        this.$message.error('Błąd kategorii');
        return;
      }
      this.$emit('create-thread');
    },
    handlePageChange(page) {
      this.currentPage = page;
    },
selectThread(thread) {
  // Zapisz czas ostatniej wizyty w kategorii
  this.markCategoryVisited(this.category.id);
  
  if (!thread) {
    console.error('CategoryPage - BŁĄD: thread jest undefined/null');
    return;
  }
  
  try {
    this.$emit('select-thread', thread);
    // Powiadom komponent CategoriesList o zmianie
    this.$emit('category-visited', this.category.id);
  } catch (error) {
    console.error('CategoryPage - BŁĄD podczas emitowania:', error);
  }
},
	async markCategoryVisited(categoryId) {
	  if (this.user) {
	    // Dla zalogowanych użytkowników - zapisz w bazie danych
	    try {
	      await axios.post('/mark-read', { categoryId });
	    } catch (error) {
	      console.error('Error marking category visit:', error);
	    }
	  } else {
	    // Dla niezalogowanych - zapisz w localStorage
	    const lastVisitTimes = JSON.parse(localStorage.getItem('categoryLastVisit') || '{}');
	    lastVisitTimes[categoryId] = Date.now();
	    localStorage.setItem('categoryLastVisit', JSON.stringify(lastVisitTimes));
	  }
	  
	  // Wyślij event do CategoriesList, aby odświeżył status
	  if (window.parent && window.parent.updateCategoryStatuses) {
	    window.parent.updateCategoryStatuses();
	  }
	},
    confirmDeleteThread(threadId, isModerator = false) {
      const message = isModerator 
        ? 'Czy na pewno chcesz usunąć ten wątek? WSZYSTKIE ODPOWIEDZI ZOSTANĄ USUNIĘTE!'
        : 'Czy na pewno chcesz usunąć ten wątek?';
      
      this.$confirm(message, 'Potwierdzenie', {
        confirmButtonText: 'Tak',
        cancelButtonText: 'Anuluj',
        type: 'warning',
        icon: 'el-icon-warning-outline'
      }).then(() => {
        this.deleteThread(threadId, isModerator);
      }).catch(() => {});
    },
    async deleteThread(threadId, isModerator = false) {
      try {
        const endpoint = isModerator ? `/admin/threads/${threadId}` : `/thread/${threadId}`;
        await axios.delete(endpoint);
        
        this.$message.success('Wątek i wszystkie odpowiedzi zostały usunięte');
        this.loadCategoryThreads(this.selectedCategory.id);
      } catch (error) {
        console.error('Error deleting thread:', error);
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas usuwania wątku');
      }
    },
    async editThread(threadId, newData) {
      try {
        const endpoint = this.isModerator ? `/admin/threads/${threadId}` : `/thread/${threadId}`;
        
        await axios.put(endpoint, newData);
        this.$message.success('Wątek został zaktualizowany');
        await this.loadCategoryThreads(this.selectedCategory.id);
      } catch (error) {
        console.error('Error updating thread:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas aktualizacji wątku');
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'Brak daty';
      
      try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
          return 'Nieprawidłowa data';
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          return date.toLocaleTimeString('pl-PL', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } else if (diffDays === 1) {
          return 'Wczoraj';
        } else if (diffDays < 7) {
          const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
          return days[date.getDay()];
        } else {
          return date.toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (error) {
        console.error('Błąd formatowania daty:', error);
        return 'Błąd daty';
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
    }
  },
  mounted() {
    this.Pagination();
  }
}
</script>

<style scoped>
.category-container {

}

.breadcrumbs {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  flex-wrap: wrap;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: var(--el-color-primary-light-3);
}

.breadcrumb-separator {
  margin: 0 10px;
  color: var(--el-text-color-placeholder);
}

.breadcrumb-current {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.lock-tag {
  margin-left: 10px;
}

.category-content {
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  margin: 0;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-bg-color) 100%);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-wrap: wrap;
  gap: 16px;
}

.category-info {
  flex: 1;
}

.category-icon-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.category-icon {
  font-size: 28px;
  color: var(--el-color-primary);
}

.category-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.category-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  max-width: 600px;
}

.new-thread-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--el-color-primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.new-thread-btn:hover:not(:disabled) {
  background-color: var(--el-color-primary-light-3);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.new-thread-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.category-alert {
  margin: 0 24px;
  border-radius: 8px;
}

.threads-container {
  padding: 0;
}

.threads-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-fill-color-lighter);
}

.threads-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.filter-select {
  width: 180px;
}

.threads-list {
  padding: 0;
}

.threads-separator {
  padding: 12px 24px;
  background-color: var(--el-fill-color-light);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.thread-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--el-border-color-lighter);
  gap: 20px;
}

.thread-card:hover {
  background-color: var(--el-fill-color-light);
}

.thread-card:last-child {
  border-bottom: none;
}

.sticky-thread {
  background-color: rgba(255, 193, 7, 0.05) !important;
  border-left: 3px solid var(--el-color-warning);
}

.thread-main {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.thread-icon-container {
  flex-shrink: 0;
}

.thread-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: var(--el-fill-color);
}

.thread-icon.sticky {
  background-color: rgba(255, 193, 7, 0.1);
  color: var(--el-color-warning);
}

.thread-icon.closed {
  background-color: rgba(245, 108, 108, 0.1);
  color: var(--el-color-danger);
}

.thread-icon .default-icon {
  color: var(--el-text-color-secondary);
}

.thread-content {
  flex: 1;
  min-width: 0;
}

.thread-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  gap: 8px;
  flex-wrap: wrap;
}

.thread-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-status-tags {
  display: flex;
  gap: 6px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.thread-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.thread-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.thread-right-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.thread-stats {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  min-width: 50px;
}

.thread-lastpost {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 140px;
  max-width: 160px;
}

.lastpost-avatar {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.lastpost-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.lastpost-author {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lastpost-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.thread-actions {
  flex-shrink: 0;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.empty-state p {
  margin: 0 0 20px 0;
  max-width: 400px;
  line-height: 1.5;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: var(--el-color-primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
}

.empty-action-btn:hover {
  background-color: var(--el-color-primary-light-3);
  transform: translateY(-1px);
}

.pagination {
  padding: 20px 24px;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--el-border-color-lighter);
}

.thread-pagination {
  justify-content: center;
}

/* Responsywność */
@media (max-width: 1024px) {
  .thread-right-section {
    flex-direction: column;
    gap: 12px;
    align-items: flex-end;
  }
  
  .thread-stats {
    order: 2;
  }
  
  .thread-lastpost {
    order: 1;
    min-width: 120px;
  }
}

@media (max-width: 768px) {
  .category-container {
    padding: 16px;
  }
  
  .category-header {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .thread-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .thread-right-section {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    align-items: center;
  }
  
  .thread-stats {
    order: 1;
  }
  
  .thread-lastpost {
    order: 2;
    min-width: auto;
  }
  
  .thread-actions {
    position: absolute;
    right: 16px;
    top: 16px;
  }
  
  .threads-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .threads-separator {
    padding: 12px 16px;
  }
}

@media (max-width: 480px) {
  .thread-meta {
    flex-direction: column;
    gap: 6px;
  }
  
  .thread-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .thread-right-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .thread-lastpost {
    width: 100%;
    max-width: none;
  }
  
  .thread-stats {
    display: flex;
    gap: 20px;
  }
}
</style>
