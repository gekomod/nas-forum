<template>
  <div class="threads-management">
    <div class="page-header">
      <h2>
        <Icon icon="mdi:forum-outline" />
        Zarządzanie tematami
      </h2>
      <el-button type="primary" @click="refreshThreads" :loading="loading">
        <Icon icon="mdi:refresh" />
        Odśwież
      </el-button>
    </div>

    <el-alert
      v-if="!hasPermission"
      title="Brak uprawnień"
      type="warning"
      description="Tylko administratorzy i moderatorzy mają dostęp do zarządzania tematami."
      show-icon
      :closable="false"
    />

    <template v-else>
      <!-- Filtry i wyszukiwanie -->
      <div class="filters-section">
        <el-input
          v-model="searchQuery"
          placeholder="Szukaj tematów..."
          prefix-icon="Search"
          style="max-width: 300px; margin-bottom: 20px;"
          @input="handleSearch"
        />
        
        <el-select
          v-model="categoryFilter"
          placeholder="Filtruj po kategorii"
          clearable
          style="margin-left: 10px; width: 200px;"
          @change="loadThreads"
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>

        <el-select
          v-model="statusFilter"
          placeholder="Filtruj po statusie"
          clearable
          style="margin-left: 10px; width: 200px;"
          @change="loadThreads"
        >
          <el-option label="Aktywne" value="active" />
          <el-option label="Zamknięte" value="closed" />
          <el-option label="Przyklejone" value="sticky" />
        </el-select>
      </div>

      <el-table :data="filteredThreads" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="Tytuł" min-width="200">
          <template #default="scope">
            <router-link 
              :to="`/thread/${scope.row.id}`" 
              class="thread-link"
              @click.prevent="viewThread(scope.row)"
            >
              {{ scope.row.title }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="category_name" label="Kategoria" width="150" />
        <el-table-column prop="author_name" label="Autor" width="120" />
        <el-table-column prop="post_count" label="Odpowiedzi" width="80" />
        <el-table-column prop="view_count" label="Wyświetlenia" width="100" />
        <el-table-column label="Status" width="120">
          <template #default="scope">
            <el-tag 
              :type="getStatusType(scope.row)" 
              size="small"
            >
              {{ getStatusText(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="Data utworzenia" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Operacje" width="200">
          <template #default="scope">
            <el-button-group>
              <el-tooltip content="Edytuj temat" placement="top">
                <el-button 
                  size="small" 
                  @click="editThread(scope.row)"
                >
                  <Icon icon="mdi:pencil" />
                </el-button>
              </el-tooltip>
              
              <el-tooltip 
                :content="scope.row.is_closed ? 'Otwórz temat' : 'Zamknij temat'" 
                placement="top"
              >
                <el-button 
                  size="small" 
                  :type="scope.row.is_closed ? 'success' : 'warning'"
                  @click="toggleThreadStatus(scope.row.id, !scope.row.is_closed)"
                >
                  <Icon :icon="scope.row.is_closed ? 'mdi:lock-open' : 'mdi:lock'" />
                </el-button>
              </el-tooltip>

              <el-tooltip 
                :content="scope.row.is_sticky ? 'Odepnij temat' : 'Przypnij temat'" 
                placement="top"
              >
                <el-button 
                  size="small" 
                  :type="scope.row.is_sticky ? 'info' : ''"
                  @click="toggleStickyStatus(scope.row.id, !scope.row.is_sticky)"
                >
                  <Icon :icon="scope.row.is_sticky ? 'mdi:pin-off' : 'mdi:pin'" />
                </el-button>
              </el-tooltip>

              <el-tooltip content="Usuń temat" placement="top">
                <el-button 
                  size="small" 
                  type="danger"
                  @click="deleteThread(scope.row.id)"
                >
                  <Icon icon="mdi:delete" />
                </el-button>
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="totalThreads"
          :page-size="pageSize"
          v-model:current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <!-- Modal edycji tematu -->
    <el-dialog
      v-model="showEditDialog"
      :title="`Edycja tematu: ${editingThread?.title}`"
      width="600px"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="Tytuł">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="Kategoria">
          <el-select v-model="editForm.category_id" placeholder="Wybierz kategorię">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Status">
          <el-checkbox v-model="editForm.is_closed">Zamknięty</el-checkbox>
          <el-checkbox v-model="editForm.is_sticky">Przyklejony</el-checkbox>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditDialog = false">Anuluj</el-button>
        <el-button type="primary" @click="saveThreadChanges" :loading="saving">
          Zapisz zmiany
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ThreadsManagement',
  components: { Icon },
  data() {
    return {
      threads: [],
      categories: [],
      loading: false,
      saving: false,
      currentPage: 1,
      pageSize: 10,
      totalThreads: 0,
      hasPermission: false,
      searchQuery: '',
      categoryFilter: null,
      statusFilter: null,
      showEditDialog: false,
      editingThread: null,
      editForm: {
        title: '',
        category_id: null,
        is_closed: false,
        is_sticky: false
      }
    };
  },
  computed: {
    filteredThreads() {
      let filtered = this.threads;
      
      // Filtrowanie po wyszukiwaniu
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(thread => 
          thread.title.toLowerCase().includes(query) ||
          thread.author_name.toLowerCase().includes(query)
        );
      }
      
      // Filtrowanie po statusie
      if (this.statusFilter) {
        filtered = filtered.filter(thread => {
          if (this.statusFilter === 'active') return !thread.is_closed;
          if (this.statusFilter === 'closed') return thread.is_closed;
          if (this.statusFilter === 'sticky') return thread.is_sticky;
          return true;
        });
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
        this.hasPermission = false;
        return;
      }

      try {
        const response = await axios.get('/profile');
        const userRole = response.data.role_id;
        this.hasPermission = userRole === 1 || userRole === 2; // Admin lub moderator
        if (this.hasPermission) {
          this.loadThreads();
          this.loadCategories();
        }
      } catch (error) {
        this.hasPermission = false;
        if (error.response?.status === 401) {
          this.$message.warning('Wymagane ponowne logowanie');
        }
      }
    },
    async loadThreads() {
      this.loading = true;
      try {
        let url = '/admin/threads';
        const params = {};
        
        if (this.categoryFilter) {
          params.category_id = this.categoryFilter;
        }
        
        const response = await axios.get(url, { params });
        this.threads = response.data;
        this.totalThreads = this.threads.length;
      } catch (error) {
        if (error.response?.status === 403) {
          this.hasPermission = false;
          this.$message.warning('Brak uprawnień do przeglądania tematów');
        } else {
          this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas ładowania tematów');
        }
      } finally {
        this.loading = false;
      }
    },
    async loadCategories() {
      try {
        const response = await axios.get('/categories');
        this.categories = response.data;
      } catch (error) {
        this.$message.error('Błąd podczas ładowania kategorii');
      }
    },
    async toggleThreadStatus(threadId, isClosed) {
      try {
        await axios.put(`/admin/threads/${threadId}/status`, { is_closed: isClosed });
        this.$message.success(`Temat ${isClosed ? 'zamknięty' : 'otwarty'}`);
        this.loadThreads();
      } catch (error) {
        this.$message.error('Błąd podczas zmiany statusu tematu');
      }
    },
    async toggleStickyStatus(threadId, isSticky) {
      try {
        await axios.put(`/admin/threads/${threadId}/sticky`, { is_sticky: isSticky });
        this.$message.success(`Temat ${isSticky ? 'przypięty' : 'odpięty'}`);
        this.loadThreads();
      } catch (error) {
        this.$message.error('Błąd podczas zmiany statusu przypięcia');
      }
    },
    async deleteThread(threadId) {
      try {
        await this.$confirm('Czy na pewno chcesz usunąć ten temat?', 'Potwierdzenie', {
          confirmButtonText: 'Tak',
          cancelButtonText: 'Nie',
          type: 'warning'
        });
        
        await axios.delete(`/admin/threads/${threadId}`);
        this.$message.success('Temat został usunięty');
        this.loadThreads();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('Błąd podczas usuwania tematu');
        }
      }
    },
    editThread(thread) {
      this.editingThread = thread;
      this.editForm = {
        title: thread.title,
        category_id: thread.category_id,
        is_closed: thread.is_closed,
        is_sticky: thread.is_sticky
      };
      this.showEditDialog = true;
    },
    async saveThreadChanges() {
      this.saving = true;
      try {
        await axios.put(`/admin/threads/${this.editingThread.id}`, this.editForm);
        this.$message.success('Zmiany zostały zapisane');
        this.showEditDialog = false;
        this.loadThreads();
      } catch (error) {
        this.$message.error('Błąd podczas zapisywania zmian');
      } finally {
        this.saving = false;
      }
    },
    viewThread(thread) {
      // Otwórz temat w nowej karcie lub przejdź do niego
      window.open(`/thread/${thread.id}`, '_blank');
    },
    refreshThreads() {
      this.loadThreads();
      this.loadCategories();
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('pl-PL');
    },
    getStatusType(thread) {
      if (thread.is_closed) return 'danger';
      if (thread.is_sticky) return 'warning';
      return 'success';
    },
    getStatusText(thread) {
      if (thread.is_closed && thread.is_sticky) return 'Zamknięty • Przypięty';
      if (thread.is_closed) return 'Zamknięty';
      if (thread.is_sticky) return 'Przypięty';
      return 'Aktywny';
    },
    handleSearch() {
      // Debounce można dodać jeśli potrzeba
      this.currentPage = 1;
    },
    handlePageChange(page) {
      this.currentPage = page;
    }
  }
}
</script>

<style scoped>
.threads-management {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--card-border);
  padding: 20px;
  margin-bottom: 20px;
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

.el-button-group {
  display: flex;
  gap: 5px;
}

.el-button-group .el-button {
  padding: 8px;
}
</style>
