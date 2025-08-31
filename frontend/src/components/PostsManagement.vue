<template>
  <div class="posts-management">
    <div class="page-header">
      <h2>
        <Icon icon="mdi:message-text" />
        Zarządzanie postami
      </h2>
      <el-button type="primary" @click="refreshPosts" :loading="loading">
        <Icon icon="mdi:refresh" />
        Odśwież
      </el-button>
    </div>

    <el-alert
      v-if="!this.$hasPermission"
      title="Brak uprawnień"
      type="warning"
      description="Tylko administratorzy i moderatorzy mają dostęp do zarządzania postami."
      show-icon
      :closable="false"
    />

    <template v-else>
      <!-- Filtry i wyszukiwanie -->
      <div class="filters-section">
        <el-input
          v-model="searchQuery"
          placeholder="Szukaj postów..."
          prefix-icon="Search"
          style="max-width: 300px; margin-bottom: 20px;"
          @input="handleSearch"
        />
      </div>

      <el-table :data="filteredPosts" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Treść" min-width="300">
          <template #default="scope">
            <div class="post-content">
              {{ truncateContent(scope.row.content) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="author_name" label="Autor" width="120" />
        <el-table-column prop="thread_title" label="Temat" width="200">
          <template #default="scope">
<span 
  class="thread-link clickable"
  @click="emitThreadClick(scope.row.thread_id, scope.row.thread_title)"
>
  {{ scope.row.thread_title }}
</span>
          </template>
        </el-table-column>
        <el-table-column prop="category_name" label="Kategoria" width="150" />
        <el-table-column prop="date" label="Data" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.date) }}
          </template>
        </el-table-column>
        <el-table-column label="Operacje" width="100">
          <template #default="scope">
            <el-tooltip content="Usuń post" placement="top">
              <el-button 
                size="small" 
                type="danger"
                @click="deletePost(scope.row.id)"
              >
                <Icon icon="mdi:delete" />
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="totalPosts"
          :page-size="pageSize"
          v-model:current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'PostsManagement',
  components: { Icon },
  data() {
    return {
      posts: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      totalPosts: 0,
      hasPermission: false,
      searchQuery: ''
    };
  },
  computed: {
    filteredPosts() {
      let filtered = this.posts;
      
      // Filtrowanie po wyszukiwaniu
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(post => 
          post.content.toLowerCase().includes(query) ||
          post.author_name.toLowerCase().includes(query) ||
          post.thread_title.toLowerCase().includes(query)
        );
      }
      
      return filtered;
    }
  },
  mounted() {
    this.checkPermissions();
  },
  methods: {
     async checkPermissions() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return false;
      }

      // Używamy globalnie załadowanych uprawnień
      if (this.$hasPermission('manage_posts')) {
        this.loadPosts();
        return true;
      }
      
      return false;
    },
  emitThreadClick(threadId, threadTitle) {
    this.$emit('thread-click', { threadId, threadTitle });
  },
    async loadPosts() {
      this.loading = true;
      try {
        const response = await axios.get('/admin/posts');
        this.posts = response.data;
        this.totalPosts = this.posts.length;
      } catch (error) {
        if (error.response?.status === 403) {
          this.hasPermission = false;
          this.$message.warning('Brak uprawnień do przeglądania postów');
        } else {
          this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas ładowania postów');
        }
      } finally {
        this.loading = false;
      }
    },
    async deletePost(postId) {
      try {
        await this.$confirm('Czy na pewno chcesz usunąć ten post?', 'Potwierdzenie', {
          confirmButtonText: 'Tak',
          cancelButtonText: 'Nie',
          type: 'warning'
        });
        
        await axios.delete(`/admin/posts/${postId}`);
        this.$message.success('Post został usunięty');
        this.loadPosts();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Błąd podczas usuwania postu');
        }
      }
    },
    viewThread(threadId) {
      window.open(`/thread/${threadId}`, '_blank');
    },
    refreshPosts() {
      this.loadPosts();
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('pl-PL');
    },
    truncateContent(content) {
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    },
    handleSearch() {
      this.currentPage = 1;
    },
    handlePageChange(page) {
      this.currentPage = page;
    }
  }
}
</script>

<style scoped>
.posts-management {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--card-border);
  padding: 20px;
  margin-bottom: 20px;
}

.clickable {
  cursor: pointer;
  color: var(--el-color-primary);
  text-decoration: underline;
}

.clickable:hover {
  color: var(--el-color-primary-light-3);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--text-primary);
}

.filters-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.thread-link {
  color: var(--el-color-primary);
  text-decoration: none;
  font-weight: 500;
}

.thread-link:hover {
  text-decoration: underline;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.post-content {
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
