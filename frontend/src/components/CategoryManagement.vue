<template>
  <div class="category-management">
    <div class="page-header">
      <h2>
        <Icon icon="mdi:shape-outline" />
        Zarządzanie kategoriami
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateModal">
          <Icon icon="mdi:plus" />
          Nowa kategoria
        </el-button>
        <el-button @click="refreshCategories" :loading="loading">
          <Icon icon="mdi:refresh" />
          Odśwież
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="!this.$hasPermission && !loading"
      title="Brak uprawnień"
      type="warning"
      description="Tylko administratorzy mają dostęp do zarządzania kategoriami."
      show-icon
      :closable="false"
    />

    <el-alert
      v-else-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    />

    <template v-else>
      <!-- Statistics Cards - TYLKO statystyki zarządzania -->
      <div class="stats-cards" v-if="categories.length > 0">
        <el-card class="stat-card">
          <div class="stat-value">{{ categories.length }}</div>
          <div class="stat-label">Kategorii</div>
        </el-card>
        <el-card class="stat-card">
          <div class="stat-value">{{ lockedCategories }}</div>
          <div class="stat-label">Zablokowanych</div>
        </el-card>
        <el-card class="stat-card">
          <div class="stat-value">{{ restrictedCategories }}</div>
          <div class="stat-label">Z ograniczeniami</div>
        </el-card>
      </div>

      <!-- Empty State -->
      <el-empty 
        v-if="categories.length === 0 && !loading"
        description="Brak kategorii"
        :image-size="200"
      >
        <el-button type="primary" @click="showCreateModal">
          Utwórz pierwszą kategorię
        </el-button>
      </el-empty>

    <!-- Categories Table -->
    <el-table 
      :data="sortedCategories" 
      v-loading="loading" 
      style="width: 100%"
      v-else
    >
      <el-table-column label="Pozycja" width="100">
        <template #default="scope">
          <div class="position-controls">
            <el-button 
              size="small" 
              :disabled="scope.$index === 0"
              @click="moveCategory(scope.row.id, 'up')"
              title="Przesuń wyżej"
            >
              <Icon icon="mdi:arrow-up" />
            </el-button>
            <span class="position-number">{{ scope.row.position }}</span>
            <el-button 
              size="small" 
              :disabled="scope.$index === categories.length - 1"
              @click="moveCategory(scope.row.id, 'down')"
              title="Przesuń niżej"
            >
              <Icon icon="mdi:arrow-down" />
            </el-button>
          </div>
        </template>
      </el-table-column>

        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Ikona" width="80">
          <template #default="scope">
            <div class="category-icon">
              <Icon :icon="scope.row.icon || 'mdi:folder'" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="Nazwa" />
        <el-table-column prop="description" label="Opis" />
        <el-table-column label="Statystyki" width="120">
          <template #default="scope">
            <div class="category-stats">
              <span><Icon icon="mdi:comment-text" /> {{ scope.row.threads || 0 }}</span>
              <span><Icon icon="mdi:message-reply" /> {{ scope.row.posts || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Status" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.is_locked ? 'danger' : 'success'" effect="dark">
              {{ scope.row.is_locked ? 'Zablokowana' : 'Aktywna' }}
            </el-tag>
          </template>
        </el-table-column>
          <el-table-column label="Uprawnienia" width="150">
	    <template #default="scope">
	      <el-tag 
		v-if="scope.row.required_role && scope.row.required_role > 0" 
		:type="getRoleType(scope.row.required_role)"
		effect="plain"
	      >
		{{ getRoleName(scope.row.required_role) }}
	      </el-tag>
	      <el-tag v-else type="info" effect="plain">
		Wszyscy
	      </el-tag>
	    </template>
	  </el-table-column>
        <el-table-column label="Operacje" width="250" fixed="right">
          <template #default="scope">
            <el-button-group>
              <el-button 
                size="small" 
                @click="editCategory(scope.row)"
                title="Edytuj kategorię"
              >
                <Icon icon="mdi:pencil" />
              </el-button>
              
              <el-button 
                size="small" 
                :type="scope.row.is_locked ? 'success' : 'warning'"
                @click="toggleCategoryLock(scope.row)"
                :title="scope.row.is_locked ? 'Odblokuj kategorię' : 'Zablokuj kategorię'"
              >
                <Icon :icon="scope.row.is_locked ? 'mdi:lock-open' : 'mdi:lock'" />
              </el-button>
              
              <el-button 
                size="small" 
                type="danger" 
                @click="confirmDeleteCategory(scope.row)"
                :disabled="scope.row.threads > 0"
                :title="scope.row.threads > 0 ? 'Nie można usunąć kategorii z wątkami' : 'Usuń kategorię'"
              >
                <Icon icon="mdi:delete" />
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- Modal tworzenia/edycji kategorii -->
    <el-dialog 
      :title="isEditing ? 'Edytuj kategorię' : 'Nowa kategoria'" 
      v-model="showModal" 
      width="600px"
      @closed="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="categoryForm" label-width="150px">
        <el-form-item label="Nazwa kategorii" prop="name">
          <el-input v-model="form.name" placeholder="Wpisz nazwę kategorii" />
        </el-form-item>
        
        <el-form-item label="Ikona" prop="icon">
          <el-input v-model="form.icon" placeholder="np. mdi:forum">
            <template #append>
              <el-button @click="showIconPicker = true">Wybierz</el-button>
            </template>
          </el-input>
          <div class="icon-preview">
            <Icon :icon="form.icon || 'mdi:folder'" />
            <span class="preview-text">Podgląd: {{ form.icon || 'mdi:folder' }}</span>
          </div>
        </el-form-item>
        
        <el-form-item label="Pozycja" prop="position">
          <el-input-number 
            v-model="form.position" 
            :min="1" 
            :max="maxPosition + 1"
            controls-position="right"
          />
          <div class="help-text">
            Niższa liczba = wyższa pozycja na liście
          </div>
        </el-form-item>
        
        <el-form-item label="Opis kategorii" prop="description">
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="3" 
            placeholder="Krótki opis kategorii"
          />
        </el-form-item>
        
  <el-form-item label="Wymagana rola">
    <el-select v-model="form.required_role" placeholder="Wybierz rolę" clearable>
      <el-option label="Wszyscy użytkownicy" :value="0" />
      <el-option 
        v-for="role in roles" 
        :key="role.id" 
        :label="role.name" 
        :value="role.id"
      />
    </el-select>
    <div class="help-text">
      Minimalna rola wymagana do przeglądania kategorii (0 = wszyscy)
    </div>
  </el-form-item>
        
        <el-form-item label="Blokada zapisu">
          <el-switch
            v-model="form.is_locked"
            active-text="Zablokowana"
            inactive-text="Aktywna"
          />
          <div class="help-text">
            Zablokowane kategorie wyświetlają się, ale nie można w nich tworzyć nowych wątków
          </div>
        </el-form-item>
      </el-form>
      
      <el-dialog v-model="showIconPicker" title="Wybierz ikonę" width="700px" append-to-body>
        <div class="icon-picker">
          <el-input
            v-model="iconSearch"
            placeholder="Wyszukaj ikonę..."
            prefix-icon="Search"
            class="icon-search"
          />
          <div class="icon-grid">
            <div 
              v-for="icon in filteredIcons" 
              :key="icon" 
              class="icon-item"
              :class="{ selected: form.icon === icon }"
              @click="selectIcon(icon)"
            >
              <Icon :icon="icon" />
              <span class="icon-name">{{ icon }}</span>
            </div>
          </div>
        </div>
      </el-dialog>
      
      <template #footer>
        <el-button @click="showModal = false">Anuluj</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEditing ? 'Zapisz zmiany' : 'Utwórz kategorię' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'CategoryManagement',
  components: { Icon },
  data() {
    return {
      categories: [],
      roles: [],
      loading: false,
      submitting: false,
      errorMessage: '',
      showModal: false,
      isEditing: false,
      showIconPicker: false,
      iconSearch: '',
      form: {
        id: null,
        name: '',
        icon: 'mdi:folder',
        description: '',
        is_locked: false,
        required_role: null
      },
      rules: {
        name: [
          { required: true, message: 'Nazwa kategorii jest wymagana', trigger: 'blur' },
          { min: 3, message: 'Nazwa musi mieć co najmniej 3 znaki', trigger: 'blur' }
        ],
        icon: [
          { required: true, message: 'Ikona jest wymagana', trigger: 'blur' }
        ]
      },
      popularIcons: [
        'mdi:forum', 'mdi:bullhorn', 'mdi:tools', 'mdi:lightbulb', 'mdi:chat',
        'mdi:help', 'mdi:book', 'mdi:code-tags', 'mdi:gamepad', 'mdi:music',
        'mdi:movie', 'mdi:image', 'mdi:download', 'mdi:cloud', 'mdi:server',
        'mdi:lock', 'mdi:shield', 'mdi:star', 'mdi:heart', 'mdi:alert',
        'mdi:email', 'mdi:calendar', 'mdi:chart-bar', 'mdi:cog', 'mdi:database',
        'mdi:desktop-mac', 'mdi:download', 'mdi:earth', 'mdi:file', 'mdi:fire',
        'mdi:folder', 'mdi:gift', 'mdi:home', 'mdi:information', 'mdi:link',
        'mdi:lock', 'mdi:magnify', 'mdi:map', 'mdi:package', 'mdi:palette',
        'mdi:phone', 'mdi:play', 'mdi:plus', 'mdi:refresh', 'mdi:school',
        'mdi:send', 'mdi:settings', 'mdi:share', 'mdi:shield', 'mdi:shopping',
        'mdi:star', 'mdi:store', 'mdi:tag', 'mdi:thumb-up', 'mdi:timer',
        'mdi:video', 'mdi:wallet', 'mdi:weather-sunny', 'mdi:wifi'
      ]
    };
  },
  computed: {
    sortedCategories() {
      return [...this.categories].sort((a, b) => a.position - b.position);
    },
    maxPosition() {
      return Math.max(...this.categories.map(cat => cat.position || 0), 0);
    },
    lockedCategories() {
      return this.categories.filter(cat => cat.is_locked).length;
    },
    restrictedCategories() {
      return this.categories.filter(cat => cat.required_role !== null).length;
    },
    filteredIcons() {
      if (!this.iconSearch) return this.popularIcons;
      const search = this.iconSearch.toLowerCase();
      return this.popularIcons.filter(icon => 
        icon.toLowerCase().includes(search)
      );
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
      if (this.$hasPermission('manage_categories')) {
        this.loadCategories();
        this.loadRoles();
        return true;
      }
      
      return false;
    },

    async loadCategories() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const response = await axios.get('/admin/categories');
        this.categories = response.data;
      } catch (error) {
        console.error('Load categories error:', error);
        this.errorMessage = error.response?.data?.error || 'Błąd podczas ładowania kategorii';
        this.$message.error(this.errorMessage);
      } finally {
        this.loading = false;
      }
    },

    async loadRoles() {
      try {
        const response = await axios.get('/roles');
        this.roles = response.data;
      } catch (error) {
        console.error('Load roles error:', error);
        this.$message.error('Błąd podczas ładowania ról');
      }
    },

    showCreateModal() {
      this.isEditing = false;
      this.resetForm();
      this.showModal = true;
    },
    
    async moveCategory(categoryId, direction) {
      try {
        await axios.post(`/admin/categories/${categoryId}/move`, { direction });
        this.$message.success('Kolejność kategorii została zmieniona');
        await this.loadCategories();
      } catch (error) {
        console.error('Move category error:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas zmiany kolejności');
      }
    },

    editCategory(category) {
      this.isEditing = true;
      this.form = { 
        ...category,
        is_locked: Boolean(category.is_locked),
        required_role: category.required_role || 0,
        position: category.position || this.maxPosition + 1
      };
      this.showModal = true;
    },

    resetForm() {
      this.form = {
        id: null,
        name: '',
        icon: 'mdi:folder',
        description: '',
        is_locked: false,
        required_role: 0,
        position: this.maxPosition + 1
      };
      if (this.$refs.categoryForm) {
        this.$refs.categoryForm.resetFields();
      }
    },

    selectIcon(icon) {
      this.form.icon = icon;
      this.showIconPicker = false;
      this.iconSearch = '';
    },

    async submitForm() {
      this.$refs.categoryForm.validate(async (valid) => {
        if (valid) {
          this.submitting = true;
          try {
            const endpoint = this.isEditing 
              ? `/admin/categories/${this.form.id}` 
              : '/admin/categories';
            const method = this.isEditing ? 'put' : 'post';
            
            const payload = {
              name: this.form.name,
              icon: this.form.icon,
              description: this.form.description,
              is_locked: this.form.is_locked,
              required_role: this.form.required_role,
              position: this.form.position
            };
            
            await axios[method](endpoint, payload);
            
            this.$message.success(
              this.isEditing 
                ? 'Kategoria została zaktualizowana' 
                : 'Kategoria została utworzona'
            );
            
            this.showModal = false;
            await this.loadCategories();
          } catch (error) {
            console.error('Submit error:', error);
            this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas zapisywania');
          } finally {
            this.submitting = false;
          }
        }
      });
    },

    async toggleCategoryLock(category) {
      try {
        const payload = {
          name: category.name,
          icon: category.icon,
          description: category.description,
          is_locked: !category.is_locked,
          required_role: category.required_role
        };
        
        await axios.put(`/admin/categories/${category.id}`, payload);
        
        this.$message.success(
          category.is_locked 
            ? 'Kategoria została odblokowana' 
            : 'Kategoria została zablokowana'
        );
        
        await this.loadCategories();
      } catch (error) {
        console.error('Toggle lock error:', error);
        this.$message.error('Błąd podczas zmiany statusu kategorii');
      }
    },

    confirmDeleteCategory(category) {
      const hasThreads = category.threads > 0;
      
      if (hasThreads) {
        this.$message.warning('Nie można usunąć kategorii zawierającej wątki');
        return;
      }

      this.$confirm(
        `Czy na pewno chcesz usunąć kategorię "${category.name}"?`,
        'Potwierdzenie usunięcia',
        {
          confirmButtonText: 'Tak, usuń',
          cancelButtonText: 'Anuluj',
          type: 'warning'
        }
      ).then(async () => {
        await this.deleteCategory(category.id);
      }).catch(() => {});
    },

    async deleteCategory(id) {
      try {
        await axios.delete(`/admin/categories/${id}`);
        this.$message.success('Kategoria została usunięta');
        await this.loadCategories();
      } catch (error) {
        console.error('Delete error:', error);
        const errorMsg = error.response?.data?.error || 'Błąd podczas usuwania kategorii';
        this.$message.error(errorMsg);
      }
    },

    refreshCategories() {
      this.loadCategories();
      this.loadRoles();
    },

    getRoleType(roleId) {
      const types = { 1: 'danger', 2: 'warning', 3: '', 4: 'info', 5: 'success' };
      return types[roleId] || 'info';
    },

    getRoleName(roleId) {
      const role = this.roles.find(r => r.id === roleId);
      return role ? role.name : `Rola ${roleId}`;
    }
  }
}
</script>

<style scoped>
.category-management {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 5px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.category-icon {
  font-size: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.category-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.category-stats span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.icon-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.preview-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.help-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 5px;
}

.icon-picker {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.icon-search {
  margin-bottom: 15px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.icon-item:hover {
  background-color: var(--el-fill-color-light);
  transform: translateY(-2px);
}

.icon-item.selected {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.icon-name {
  font-size: 10px;
  margin-top: 5px;
  text-align: center;
  word-break: break-all;
}

.position-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.position-number {
  font-weight: bold;
  min-width: 30px;
  text-align: center;
}

@media (max-width: 768px) {
  .position-controls {
    flex-direction: column;
    gap: 4px;
  }
  
  .position-number {
    margin: 4px 0;
  }
}
</style>
