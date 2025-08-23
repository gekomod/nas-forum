<template>
  <div class="users-management">
    <div class="page-header">
      <h2>
        <Icon icon="mdi:account-group" />
        Zarządzanie użytkownikami
      </h2>
      <el-button type="primary" @click="refreshUsers" :loading="loading">
        <Icon icon="mdi:refresh" />
        Odśwież
      </el-button>
    </div>

    <el-alert
      v-if="!hasPermission"
      title="Brak uprawnień"
      type="warning"
      description="Tylko administratorzy mają dostęp do zarządzania użytkownikami."
      show-icon
      :closable="false"
    />

    <template v-else>
      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="Nazwa użytkownika" />
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role_name" label="Rola">
          <template #default="scope">
            <el-tag :type="getRoleType(scope.row.role_id)">
              {{ scope.row.role_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="Data rejestracji">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Ostatnie logowanie">
          <template #default="scope">
            {{ scope.row.last_login ? formatDate(scope.row.last_login) : 'Nigdy' }}
          </template>
        </el-table-column>
        <el-table-column label="Operacje" width="200">
          <template #default="scope">
            <el-dropdown>
              <el-button size="small">
                Akcje <Icon icon="mdi:chevron-down" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    v-for="role in roles" 
                    :key="role.id"
                    @click="changeUserRole(scope.row.id, role.id)"
                    :disabled="scope.row.role_id === role.id">
                    <Icon icon="mdi:account-convert" />
                    Ustaw jako {{ role.name }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="totalUsers"
          :page-size="pageSize"
          v-model:current-page="currentPage"
          @current-change="handlePageChange">
        </el-pagination>
      </div>
    </template>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'UsersManagement',
  components: { Icon },
  data() {
    return {
      users: [],
      roles: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      totalUsers: 0,
      hasPermission: false
    };
  },
  mounted() {
    this.checkPermissions();
  },
  methods: {
    async checkPermissions() {
      // Sprawdź czy użytkownik jest zalogowany i ma uprawnienia
      const token = localStorage.getItem('authToken');
      if (!token) {
        this.hasPermission = false;
        return;
      }

      try {
        // Sprawdź profil użytkownika aby zweryfikować uprawnienia
        const response = await axios.get('/profile');
        this.hasPermission = response.data.role_id === 1; // Tylko administratorzy
        if (this.hasPermission) {
          this.loadUsers();
          this.loadRoles();
        }
      } catch (error) {
        this.hasPermission = false;
        if (error.response?.status === 401) {
          this.$message.warning('Wymagane ponowne logowanie');
        }
      }
    },
    async loadUsers() {
      this.loading = true;
      try {
        const response = await axios.get('/users');
        this.users = response.data;
        this.totalUsers = this.users.length;
      } catch (error) {
        if (error.response?.status === 403) {
          this.hasPermission = false;
          this.$message.warning('Brak uprawnień do przeglądania użytkowników');
        } else {
          this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas ładowania użytkowników');
        }
      } finally {
        this.loading = false;
      }
    },
    async loadRoles() {
      try {
        const response = await axios.get('/roles');
        this.roles = response.data;
      } catch (error) {
        if (error.response?.status === 403) {
          this.$message.warning('Brak uprawnień do przeglądania ról');
        } else {
          this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas ładowania ról');
        }
      }
    },
    async changeUserRole(userId, roleId) {
      try {
        await axios.put(`/users/${userId}/role`, { role_id: roleId });
        this.$message.success('Rola użytkownika została zmieniona');
        this.loadUsers(); // Odśwież listę
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas zmiany roli');
      }
    },
    refreshUsers() {
      this.loadUsers();
      this.loadRoles();
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('pl-PL');
    },
    getRoleType(roleId) {
      const types = {
        1: 'danger',    // Administrator
        2: 'warning',   // Moderator
        3: '',          // Użytkownik
        4: 'info',      // Zbanowany
        5: 'success'    // VIP
      };
      return types[roleId] || '';
    },
    handlePageChange(page) {
      this.currentPage = page;
    }
  }
}
</script>

<style scoped>
.users-management {
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
</style>
