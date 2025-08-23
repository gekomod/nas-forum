<template>
  <div>
    <div class="breadcrumbs">
      <a href="#" class="breadcrumb-link" @click.prevent="$emit('back-to-categories')">
        <Icon icon="mdi:home" />
        Forum
      </a>
      <span class="breadcrumb-separator">/</span>
      <span>{{ category.name }}</span>
      <el-tag v-if="category.is_locked" type="danger" size="small" style="margin-left: 10px;">
        <Icon icon="mdi:lock" />
        Zablokowana
      </el-tag>
    </div>

    <div class="category-page">
      <div class="category-header">
        <h2 class="category-title">
          <Icon :icon="category.icon" />
          {{ category.name }}
          <el-tag v-if="category.is_locked" type="danger" size="small" style="margin-left: 10px;">
            <Icon icon="mdi:lock" />
            Zablokowana
          </el-tag>
        </h2>
        
	    <button 
	      class="new-thread-btn" 
	      @click="$emit('create-thread')" 
	      v-if="user && (!category.is_locked || user.role_id === 1 || user.role_id === 2)"
	      :disabled="category.is_locked && (user.role_id !== 1 && user.role_id !== 2)"
	    >
	      <Icon icon="mdi:plus" />
	      Nowy wątek
	    </button>
        
        <el-tooltip 
          v-else-if="category.is_locked" 
          content="Ta kategoria jest tymczasowo zablokowana"
          placement="top"
        >
          <button class="new-thread-btn" disabled>
            <Icon icon="mdi:lock" />
            Zablokowane
          </button>
        </el-tooltip>
      </div>

      <!-- Komunikat dla zablokowanych kategorii -->
      <el-alert
        v-if="category.is_locked && (!user || (user.role_id !== 1 && user.role_id !== 2))"
        title="Kategoria zablokowana"
        type="warning"
        description="Ta kategoria jest tymczasowo zablokowana. Nie można tworzyć nowych wątków."
        show-icon
        :closable="false"
      />
      
      <el-alert
        v-else-if="category.is_locked"
        title="Kategoria zablokowana"
        type="info"
        description="Ta kategoria jest zablokowana dla zwykłych użytkowników. Jako administrator/moderator możesz przeglądać i moderować zawartość."
        show-icon
        :closable="false"
      />

      <ul class="thread-list">
        <li v-for="thread in threads" :key="thread.id" class="thread-item">
          <div class="thread-icon">
            <Icon icon="mdi:comment-text" />
          </div>
          <div class="thread-content">
            <a href="#" class="thread-title" @click.prevent="selectThread(thread)">{{ thread.title }}</a>
            <div class="thread-meta">
              <span class="thread-author">
                <Icon icon="mdi:account" />
                {{ thread.author }}
              </span>
              <span class="thread-date">
                <Icon icon="mdi:clock-outline" />
                {{ thread.date }}
              </span>
            </div>
          </div>
          <div class="thread-stats">
            <div class="thread-stat">
              <Icon icon="mdi:message-reply" />
              {{ thread.replies }} odpowiedzi
            </div>
            <div class="thread-stat">
              <Icon icon="mdi:eye" />
              {{ thread.views }} wyświetleń
            </div>
          </div>
          <div class="thread-lastpost" v-if="thread.last_post_author">
            <div class="lastpost-author">
              <Icon icon="mdi:account" />
              {{ thread.last_post_author }}
            </div>
            <div class="lastpost-time">{{ thread.last_post_time }}</div>
          </div>
          <div class="thread-actions" v-if="user && (user.id === thread.user_id || user.role_id === 1 || user.role_id === 2)">
            <el-dropdown>
              <button class="action-btn">
                <Icon icon="mdi:dots-vertical" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    v-if="user.id === thread.user_id && thread.replies === 0"
                    @click="confirmDeleteThread(thread.id)">
                    <Icon icon="mdi:delete" /> Usuń wątek
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-if="user.role_id === 1 || user.role_id === 2"
                    @click="confirmDeleteThread(thread.id)">
                    <Icon icon="mdi:delete" /> Usuń (moderator)
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </li>
      </ul>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="50"
          :page-size="5">
        </el-pagination>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";

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
  methods: {
    handleCreateThread() {
      if (!this.category) {
        this.$message.error('Błąd kategorii');
        return;
      }
      this.$emit('create-thread');
    },
    selectThread(thread) {
    
      // Sprawdź czy thread istnieje
      if (!thread) {
        console.error('CategoryPage - BŁĄD: thread jest undefined/null');
        return;
      }
      
      // Sprawdź czy ma ID
      if (!thread.id) {
        console.error('CategoryPage - BŁĄD: thread nie ma ID:', thread);
        return;
      }
      
      // Emituj zdarzenie - sprawdź różne sposoby
      try {
        // Sposób 1: Bezpośrednio
        this.$emit('select-thread', thread);
        
        // Sposób 2: Z timeout (czasami pomaga)
        setTimeout(() => {
          this.$emit('select-thread', thread);
        }, 10);
        
      } catch (error) {
        console.error('CategoryPage - BŁĄD podczas emitowania:', error);
      }
    },
    confirmDeleteThread(threadId) {
      this.$confirm('Czy na pewno chcesz usunąć ten wątek?', 'Potwierdzenie', {
        confirmButtonText: 'Tak',
        cancelButtonText: 'Anuluj',
        type: 'warning'
      }).then(() => {
        this.$emit('delete-thread', threadId);
      }).catch(() => {});
    }
  }
}
</script>

<style scoped>
.thread-actions {
  margin-left: 10px;
}

.new-thread-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.action-btn:hover {
  background-color: var(--el-fill-color-light);
}
</style>
