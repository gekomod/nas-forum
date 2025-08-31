<template>
  <div class="users-management">
    <div class="page-header">
      <h2>
        <Icon icon="mdi:account-group" />
        Zarządzanie użytkownikami
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="refreshUsers" :loading="loading">
          <Icon icon="mdi:refresh" />
          Odśwież
        </el-button>
        <el-button type="success" @click="showSendSystemMessageDialog">
          <Icon icon="mdi:email-send" />
          Wyślij wiadomość systemową
        </el-button>
      </div>
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
            <el-tag :type="getRoleType(scope.row.role_ids)">
              {{ scope.row.role_names }}
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
        <el-table-column label="Status" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.is_banned ? 'danger' : 'success'">
              {{ scope.row.is_banned ? 'Zablokowany' : 'Aktywny' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Operacje" width="280">
          <template #default="scope">
            <el-button size="small" @click="editUser(scope.row)">
              <Icon icon="mdi:pencil" />
              Edytuj
            </el-button>
            <el-dropdown>
              <el-button size="small">
                Więcej <Icon icon="mdi:chevron-down" />
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
                  <el-dropdown-item 
                    @click="toggleUserBan(scope.row)"
                    :divided="true">
                    <Icon :icon="scope.row.is_banned ? 'mdi:account-check' : 'mdi:account-cancel'" />
                    {{ scope.row.is_banned ? 'Odblokuj' : 'Zablokuj' }}
                  </el-dropdown-item>
                  <el-dropdown-item 
                    @click="sendUserMessage(scope.row)">
                    <Icon icon="mdi:email-send" />
                    Wyślij wiadomość
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

    <!-- Dialog edycji użytkownika -->
    <el-dialog v-model="editDialogVisible" :title="'Edycja użytkownika: ' + editedUser.username" width="500px">
      <el-form :model="editedUser" label-width="120px">
        <el-form-item label="Nazwa użytkownika">
          <el-input v-model="editedUser.username" />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="editedUser.email" type="email" />
        </el-form-item>
        <el-form-item label="Rola">
          <el-select v-model="editedUser.role_id" placeholder="Wybierz rolę">
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Status">
          <el-switch
            v-model="editedUser.is_banned"
            active-text="Zablokowany"
            inactive-text="Aktywny"
          />
        </el-form-item>
        <el-form-item label="Sygnatura">
          <el-input v-model="editedUser.signature" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">Anuluj</el-button>
          <el-button type="primary" @click="saveUserChanges" :loading="savingChanges">
            Zapisz zmiany
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Dialog wysyłania wiadomości systemowej -->
    <el-dialog v-model="systemMessageDialogVisible" title="Wyślij wiadomość systemową" width="600px">
      <el-form :model="systemMessage" label-width="120px">
        <el-form-item label="Odbiorcy">
          <el-select v-model="systemMessage.recipients" multiple placeholder="Wybierz odbiorców" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            />
            <el-option label="Wszyscy użytkownicy" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item label="Tytuł">
          <el-input v-model="systemMessage.title" />
        </el-form-item>
        <el-form-item label="Wiadomość">
          <el-input v-model="systemMessage.message" type="textarea" :rows="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="systemMessageDialogVisible = false">Anuluj</el-button>
          <el-button type="primary" @click="sendSystemMessage" :loading="sendingMessage">
            Wyślij wiadomość
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Dialog wysyłania wiadomości do pojedynczego użytkownika -->
    <el-dialog v-model="userMessageDialogVisible" :title="'Wyślij wiadomość do: ' + selectedUser.username" width="600px">
      <el-form :model="userMessage" label-width="120px">
        <el-form-item label="Tytuł">
          <el-input v-model="userMessage.title" />
        </el-form-item>
        <el-form-item label="Wiadomość">
          <el-input v-model="userMessage.message" type="textarea" :rows="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userMessageDialogVisible = false">Anuluj</el-button>
          <el-button type="primary" @click="sendUserMessageConfirm" :loading="sendingMessage">
            Wyślij wiadomość
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from 'element-plus';

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
      
      // Edycja użytkownika
      editDialogVisible: false,
      editedUser: {
        id: null,
        username: '',
        email: '',
        role_id: null,
        is_banned: false,
        signature: ''
      },
      savingChanges: false,
      
      // Wiadomości systemowe
      systemMessageDialogVisible: false,
      systemMessage: {
        recipients: [],
        title: '',
        message: ''
      },
      sendingMessage: false,
      
      // Wiadomości do użytkownika
      userMessageDialogVisible: false,
      selectedUser: {
        id: null,
        username: ''
      },
      userMessage: {
        title: '',
        message: ''
      }
    };
  },
  computed: {
    hasPermission() {
      return this.$hasPermission('manage_users');
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
      if (this.$hasPermission('manage_users')) {
        this.loadUsers();
        this.loadRoles();
        return true;
      }
      
      return false;
    },
    async loadUsers() {
      this.loading = true;
      try {
        const response = await axios.get('/users');
        this.users = response.data;
        this.totalUsers = this.users.length;
      } catch (error) {
        if (error.response?.status === 403) {
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
    async toggleUserBan(user) {
      try {
        const action = user.is_banned ? 'odblokować' : 'zablokować';
        const confirmMessage = `Czy na pewno chcesz ${action} użytkownika ${user.username}?`;
        
        await ElMessageBox.confirm(confirmMessage, 'Potwierdzenie', {
          confirmButtonText: 'Tak',
          cancelButtonText: 'Anuluj',
          type: 'warning',
        });
        
        await axios.put(`/users/${user.id}/ban`, { 
          is_banned: !user.is_banned 
        });
        
        this.$message.success(`Użytkownik został ${user.is_banned ? 'odblokowany' : 'zablokowany'}`);
        this.loadUsers(); // Odśwież listę
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas zmiany statusu użytkownika');
        }
      }
    },
    editUser(user) {
      this.editedUser = { ...user };
      this.editDialogVisible = true;
    },
    async saveUserChanges() {
      this.savingChanges = true;
      try {
        await axios.put(`/users/${this.editedUser.id}`, this.editedUser);
        this.$message.success('Zmiany zostały zapisane');
        this.editDialogVisible = false;
        this.loadUsers(); // Odśwież listę
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas zapisywania zmian');
      } finally {
        this.savingChanges = false;
      }
    },
    showSendSystemMessageDialog() {
      this.systemMessage = {
        recipients: [],
        title: '',
        message: ''
      };
      this.systemMessageDialogVisible = true;
    },
    async sendSystemMessage() {
      this.sendingMessage = true;
      try {
        await axios.post('/admin/system-message', this.systemMessage);
        this.$message.success('Wiadomość systemowa została wysłana');
        this.systemMessageDialogVisible = false;
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas wysyłania wiadomości');
      } finally {
        this.sendingMessage = false;
      }
    },
    sendUserMessage(user) {
      this.selectedUser = { ...user };
      this.userMessage = {
        title: '',
        message: ''
      };
      this.userMessageDialogVisible = true;
    },
    async sendUserMessageConfirm() {
      this.sendingMessage = true;
      try {
        await axios.post('/admin/user-message', {
          user_id: this.selectedUser.id,
          title: this.userMessage.title,
          message: this.userMessage.message
        });
        this.$message.success(`Wiadomość do ${this.selectedUser.username} została wysłana`);
        this.userMessageDialogVisible = false;
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas wysyłania wiadomości');
      } finally {
        this.sendingMessage = false;
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
        3: 'primary',          // Użytkownik
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

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
