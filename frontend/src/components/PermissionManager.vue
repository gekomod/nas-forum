<template>
  <div class="permission-system">
    <!-- Nagłówek i statystyki -->
    <div class="permission-header">
      <div class="header-content">
        <h2>
          <Icon icon="mdi:shield-account" />
          Zarządzanie Uprawnieniami
        </h2>
        <p>Zarządzaj rolami użytkowników i uprawnieniami dostępu do funkcji forum</p>
      </div>
      
      <div class="permission-stats">
        <div class="stat-card">
          <div class="stat-icon">
            <Icon icon="mdi:account-group" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ this.stats.users }}</span>
            <span class="stat-label">Użytkowników</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Icon icon="mdi:shield-key" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ this.stats.roles }}</span>
            <span class="stat-label">Role systemowe</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Icon icon="mdi:lock-check" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ this.stats.permissions }}</span>
            <span class="stat-label">Uprawnienia</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Zakładki systemu -->
    <el-tabs v-model="activeTab" class="permission-tabs">
      <!-- Zarządzanie rolami -->
      <el-tab-pane label="Role użytkowników" name="roles">
        <div class="tab-content">
          <div class="tab-header">
            <h3>Role systemowe</h3>
            <el-button type="primary" @click="showRoleDialog(null)">
              <Icon icon="mdi:plus" />
              Nowa rola
            </el-button>
          </div>

          <div class="roles-grid">
            <div
              v-for="role in roles"
              :key="role.id"
              class="role-card"
              :class="`role-priority-${role.priority}`"
            >
              <div class="role-header">
                <div class="role-icon">
                  <Icon :icon="role.icon || 'mdi:account'" />
                </div>
                <div class="role-info">
                  <h4>{{ role.name }}</h4>
                  <p class="role-description">{{ role.description }}</p>
                  <el-tag :type="getRoleType(role.priority)" size="small">
                    Priorytet: {{ role.priority }}
                  </el-tag>
                </div>
              </div>

              <div class="role-stats">
                <div class="stat">
                  <span class="stat-value">{{ role.user_count }}</span>
                  <span class="stat-label">użytkowników</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ role.permission_count }}</span>
                  <span class="stat-label">uprawnień</span>
                </div>
              </div>

              <div class="role-actions">
                <el-button size="small" @click="showRoleDialog(role)">
                  <Icon icon="mdi:pencil" />
                  Edytuj
                </el-button>
                <el-button 
                  size="small" 
                  @click="showUsersDialog(role)"
                >
                  <Icon icon="mdi:account-multiple" />
                  Użytkownicy
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  :disabled="role.is_system"
                  @click="confirmDeleteRole(role)"
                >
                  <Icon icon="mdi:delete" />
                  Usuń
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Zarządzanie uprawnieniami -->
      <el-tab-pane label="Uprawnienia" name="permissions">
        <div class="tab-content">
          <div class="tab-header">
            <h3>Zarządzanie uprawnieniami</h3>
            <el-button @click="reloadPermissions">
              <Icon icon="mdi:refresh" />
              Odśwież
            </el-button>
              <el-button type="primary" @click="showPermissionDialog(null)">
                <Icon icon="mdi:plus" />
                Nowe uprawnienie
              </el-button>
          </div>

          <div class="permission-categories">
            <div
              v-for="category in permissionCategories"
              :key="category.id"
              class="category-section"
            >
              <h4 class="category-title">
                <Icon :icon="category.icon" />
                {{ category.name }}
              </h4>
              <p class="category-description">{{ category.description }}</p>

              <div class="permissions-grid">
                <div
                  v-for="permission in category.permissions"
                  :key="permission.id"
                  class="permission-item"
                >
                  <div class="permission-info">
                    <h5>{{ permission.name }}</h5>
                    <p class="permission-description">{{ permission.description }}</p>
                    <span class="permission-key">{{ permission.key }}</span>
                  </div>

                  <div class="permission-assignments">
                    <el-select
                      v-model="permission.assigned_roles"
                      multiple
                      placeholder="Przypisz role"
                      @change="updatePermissionRoles(permission)"
                      :loading="permission.loading"
                    >
                      <el-option
                        v-for="role in roles"
                        :key="role.id"
                        :label="role.name"
                        :value="role.id"
                      />
                    </el-select>
                  </div>
                  
		  <div class="permission-actions">
		    <el-button
		      size="small"
		      @click="showPermissionDialog(permission)"
		    >
		      <Icon icon="mdi:pencil" />
		    </el-button>
		    <el-button 
		      size="small" 
		      type="danger" 
		      @click="confirmDeletePermission(permission)"
		    >
		      <Icon icon="mdi:delete" />
		    </el-button>
		  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Uprawnienia kategorii -->
      <el-tab-pane label="Uprawnienia kategorii" name="category-permissions">
        <div class="tab-content">
          <div class="tab-header">
            <h3>Uprawnienia dostępu do kategorii</h3>
            <el-button @click="loadCategoryPermissions">
              <Icon icon="mdi:refresh" />
              Odśwież
            </el-button>
          </div>

          <div class="category-permissions">
            <div class="categories-list">
              <div
                v-for="category in categories"
                :key="category.id"
                class="category-item"
              >
                <div class="category-header">
                  <Icon :icon="category.icon" />
                  <h4>{{ category.name }}</h4>
                  <el-tag v-if="category.is_private" size="small" type="warning">
                    Prywatna
                  </el-tag>
                </div>

                <div class="category-permissions-grid">
                  <div class="permission-group">
                    <h5>Dostęp do odczytu</h5>
                    <el-select
                      v-model="category.read_roles"
                      multiple
                      placeholder="Wybierz role"
                      @change="updateCategoryPermission(category, 'read')"
                    >
                      <el-option
                        v-for="role in roles"
                        :key="role.id"
                        :label="role.name"
                        :value="role.id"
                      />
                    </el-select>
                  </div>

                  <div class="permission-group">
                    <h5>Dostęp do zapisu</h5>
                    <el-select
                      v-model="category.write_roles"
                      multiple
                      placeholder="Wybierz role"
                      @change="updateCategoryPermission(category, 'write')"
                    >
                      <el-option
                        v-for="role in roles"
                        :key="role.id"
                        :label="role.name"
                        :value="role.id"
                      />
                    </el-select>
                  </div>

                  <div class="permission-group">
                    <h5>Moderacja</h5>
                    <el-select
                      v-model="category.moderate_roles"
                      multiple
                      placeholder="Wybierz role"
                      @change="updateCategoryPermission(category, 'moderate')"
                    >
                      <el-option
                        v-for="role in roles"
                        :key="role.id"
                        :label="role.name"
                        :value="role.id"
                      />
                    </el-select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Logi uprawnień -->
      <el-tab-pane label="Logi dostępu" name="audit-logs">
        <div class="tab-content">
          <div class="tab-header">
            <h3>Historia zmian uprawnień</h3>
            <div class="header-actions">
              <el-date-picker
                v-model="auditDateRange"
                type="daterange"
                range-separator="do"
                start-placeholder="Data początkowa"
                end-placeholder="Data końcowa"
                @change="loadAuditLogs"
              />
              <el-select
                v-model="auditFilters.action"
                placeholder="Filtruj akcje"
                clearable
                @change="loadAuditLogs"
              >
                <el-option label="Utworzenie" value="create" />
                <el-option label="Modyfikacja" value="update" />
                <el-option label="Usunięcie" value="delete" />
                <el-option label="Odmowa dostępu" value="access_denied" />
              </el-select>
            </div>
          </div>

          <div class="audit-logs">
            <el-table
              :data="auditLogs"
              style="width: 100%"
              v-loading="loadingAuditLogs"
            >
              <el-table-column prop="timestamp" label="Data" width="150">
                <template #default="{ row }">
                  {{ formatTime(row.timestamp) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="user_name" label="Użytkownik" width="120">
                <template #default="{ row }">
                  <span class="user-cell">
                    <el-avatar :size="24" :src="row.user_avatar" />
                    {{ row.user_name }}
                  </span>
                </template>
              </el-table-column>
              
              <el-table-column prop="action" label="Akcja" width="120">
                <template #default="{ row }">
                  <el-tag :type="getActionType(row.action)" size="small">
                    {{ getActionLabel(row.action) }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="resource_type" label="Zasób" width="120">
                <template #default="{ row }">
                  {{ getResourceLabel(row.resource_type) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="resource_name" label="Nazwa zasobu" />
              
              <el-table-column prop="details" label="Szczegóły" width="100">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    @click="showAuditDetails(row)"
                    v-if="row.details"
                  >
                    <Icon icon="mdi:information" />
                  </el-button>
                </template>
              </el-table-column>
              
              <el-table-column prop="ip_address" label="IP" width="120" />
            </el-table>

            <div class="pagination" v-if="auditTotalPages > 1">
              <el-pagination
                background
                layout="prev, pager, next"
                :total="auditTotalItems"
                :page-size="auditPageSize"
                v-model:current-page="auditCurrentPage"
                @current-change="loadAuditLogs"
              />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Dialog edycji roli -->
    <el-dialog
      v-model="roleDialog.visible"
      :title="roleDialog.isEdit ? 'Edytuj rolę' : 'Nowa rola'"
      width="600px"
    >
      <el-form
        :model="roleDialog.form"
        :rules="roleDialog.rules"
        ref="roleFormRef"
        label-width="120px"
      >
        <el-form-item label="Nazwa roli" prop="name">
          <el-input
            v-model="roleDialog.form.name"
            placeholder="Nazwa roli"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="Opis" prop="description">
          <el-input
            v-model="roleDialog.form.description"
            type="textarea"
            :rows="3"
            placeholder="Opis roli i jej przeznaczenia"
            maxlength="255"
          />
        </el-form-item>

        <el-form-item label="Ikona" prop="icon">
          <el-input
            v-model="roleDialog.form.icon"
            placeholder="mdi:icon-name"
          >
            <template #append>
              <el-button @click="showIconPicker = true">
                Wybierz ikonę
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="Priorytet" prop="priority">
          <el-slider
            v-model="roleDialog.form.priority"
            :min="1"
            :max="1000"
            :step="1"
            show-input
          />
          <div class="priority-help">
            Niższy numer = wyższe uprawnienia (1-1000)
          </div>
        </el-form-item>

        <el-form-item label="Kolor" prop="color">
          <el-color-picker
            v-model="roleDialog.form.color"
            show-alpha
            :predefine="predefinedColors"
          />
        </el-form-item>

        <el-form-item label="Domyślna rola" prop="is_default">
          <el-switch
            v-model="roleDialog.form.is_default"
            active-text="Domyślna dla nowych użytkowników"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="roleDialog.visible = false">Anuluj</el-button>
        <el-button type="primary" @click="saveRole">
          {{ roleDialog.isEdit ? 'Zapisz' : 'Utwórz' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Dialog użytkowników roli -->
    <el-dialog
      v-model="usersDialog.visible"
      :title="`Użytkownicy roli: ${usersDialog.roleName}`"
      width="800px"
    >
      <div class="users-dialog-content">
        <div class="users-list">
          <h4>Przypisani użytkownicy ({{ usersDialog.users.length }})</h4>
          
          <el-table
            :data="usersDialog.users"
            height="300"
            v-loading="usersDialog.loading"
          >
            <el-table-column prop="username" label="Nazwa użytkownika">
              <template #default="{ row }">
                <div class="user-row">
                  <el-avatar :size="32" :src="row.avatar" />
                  <span>{{ row.username }}</span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="email" label="Email" />
            
            <el-table-column prop="joined" label="Dołączył" width="120">
              <template #default="{ row }">
                {{ formatDate(row.joined) }}
              </template>
            </el-table-column>
            
            <el-table-column label="Akcje" width="80">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="danger"
                  @click="removeUserFromRole(row.id)"
                >
                  <Icon icon="mdi:logout" />
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="add-user-section">
          <h4>Dodaj użytkownika</h4>
          <el-select
            v-model="usersDialog.newUser"
            filterable
            remote
            reserve-keyword
            placeholder="Wyszukaj użytkownika"
            :remote-method="searchUsers"
            :loading="usersDialog.searching"
          >
            <el-option
              v-for="user in usersDialog.searchResults.users"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            >
              <div class="user-option">
                <el-avatar :size="24" :src="user.avatar" />
                <span>{{ user.username }}</span>
                <span class="user-email">({{ user.email }})</span>
              </div>
            </el-option>
          </el-select>
          
          <el-button
            type="primary"
            @click="addUserToRole"
            :disabled="!usersDialog.newUser"
            class="add-user-btn"
          >
            <Icon icon="mdi:plus" />
            Dodaj użytkownika
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- Dialog szczegółów audytu -->
    <el-dialog
      v-model="auditDetails.visible"
      title="Szczegóły zdarzenia"
      width="700px"
    >
      <div class="audit-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Data zdarzenia">
            {{ formatDateTime(auditDetails.data.timestamp) }}
          </el-descriptions-item>
          
          <el-descriptions-item label="Użytkownik">
            <div class="user-info">
              <el-avatar :size="32" :src="auditDetails.data.user_avatar" />
              <div>
                <div>{{ auditDetails.data.user_name }}</div>
                <div class="user-id">ID: {{ auditDetails.data.user_id }}</div>
              </div>
            </div>
          </el-descriptions-item>
          
          <el-descriptions-item label="Akcja">
            <el-tag :type="getActionType(auditDetails.data.action)">
              {{ getActionLabel(auditDetails.data.action) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="Zasób">
            {{ getResourceLabel(auditDetails.data.resource_type) }}:
            {{ auditDetails.data.resource_name }}
          </el-descriptions-item>
          
          <el-descriptions-item label="Adres IP">
            {{ auditDetails.data.ip_address }}
          </el-descriptions-item>
          
          <el-descriptions-item label="User Agent">
            {{ auditDetails.data.user_agent }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="changes-section" v-if="auditDetails.data.changes">
          <h4>Zmiany</h4>
          <el-table :data="formatChanges(auditDetails.data.changes)" size="small">
            <el-table-column prop="field" label="Pole" width="150" />
            <el-table-column prop="old_value" label="Stara wartość" />
            <el-table-column prop="new_value" label="Nowa wartość" />
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- Picker ikon -->
    <el-dialog
      v-model="showIconPicker"
      title="Wybierz ikonę"
      width="700px"
    >
      <div class="icon-picker">
        <el-input
          v-model="iconSearch"
          placeholder="Szukaj ikon..."
          prefix-icon="Search"
          clearable
          class="icon-search"
        />
        
        <div class="icons-grid">
          <div
            v-for="icon in filteredIcons"
            :key="icon"
            class="icon-item"
            :class="{ selected: roleDialog.form.icon === icon }"
            @click="selectIcon(icon)"
          >
            <Icon :icon="icon" />
            <span class="icon-name">{{ icon }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
    
        <!-- Dialog edycji uprawnienia -->
    <el-dialog
      v-model="permissionDialog.visible"
      :title="permissionDialog.isEdit ? 'Edytuj uprawnienie' : 'Nowe uprawnienie'"
      width="600px"
    >
      <el-form
        :model="permissionDialog.form"
        :rules="permissionDialog.rules"
        ref="permissionFormRef"
        label-width="140px"
      >

        <el-form-item label="Nazwa" prop="name">
          <el-input
            v-model="permissionDialog.form.name"
            placeholder="Nazwa uprawnienia"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="Opis" prop="description">
          <el-input
            v-model="permissionDialog.form.description"
            type="textarea"
            :rows="3"
            placeholder="Opis uprawnienia"
            maxlength="255"
          />
        </el-form-item>

        <el-form-item label="Kategoria" prop="category">
          <el-select
            v-model="permissionDialog.form.category"
            placeholder="Wybierz kategorię"
          >
            <el-option
              v-for="category in availableCategories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="permissionDialog.visible = false">Anuluj</el-button>
        <el-button type="primary" @click="savePermission">
          {{ permissionDialog.isEdit ? 'Zapisz' : 'Utwórz' }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";
import { debounce } from "lodash";

export default {
  name: 'PermissionSystem',
  components: {
    Icon
  },
  data() {
    return {
      activeTab: 'roles',
      
      // Dane
      roles: [],
      permissionCategories: [],
      categories: [],
      stats: {
        totalUsers: 0,
        totalRoles: 0,
        totalPermissions: 0
      },
      
      // Role dialog
      roleDialog: {
        visible: false,
        isEdit: false,
        form: {
          name: '',
          description: '',
          icon: 'mdi:account',
          priority: 500,
          color: '#409EFF',
          is_default: false
        },
        rules: {
          name: [
            { required: true, message: 'Nazwa roli jest wymagana', trigger: 'blur' },
            { min: 2, message: 'Nazwa musi mieć co najmniej 2 znaki', trigger: 'blur' }
          ],
          description: [
            { required: true, message: 'Opis roli jest wymagany', trigger: 'blur' }
          ]
        }
      },
      
      // Users dialog
      usersDialog: {
        visible: false,
        roleId: null,
        roleName: '',
        users: [],
        loading: false,
        searching: false,
        searchResults: [],
        newUser: null
      },
      
      // Audit logs
      auditLogs: [],
      auditDateRange: [],
      auditFilters: {
        action: ''
      },
      loadingAuditLogs: false,
      auditCurrentPage: 1,
      auditPageSize: 20,
      auditTotalItems: 0,
      auditTotalPages: 0,
      
      // Audit details
      auditDetails: {
        visible: false,
        data: {}
      },
      
      // Icon picker
      showIconPicker: false,
      iconSearch: '',
      
      permissionDialog: {
        visible: false,
        isEdit: false,
        form: {
          name: '',
          description: '',
          category: ''
        },
        rules: {
          name: [
            { required: true, message: 'Nazwa uprawnienia jest wymagana', trigger: 'blur' },
            { min: 2, message: 'Nazwa musi mieć co najmniej 2 znaki', trigger: 'blur' }
          ],
          category: [
            { required: true, message: 'Kategoria jest wymagana', trigger: 'change' }
          ]
        }
      },
      
      // Available categories for permissions
      availableCategories: [
        'Forum', 'Administracja', 'Moderacja', 'Użytkownicy', 'Kategorie', 'System', 'Inne'
      ],
      
      // Predefined colors
      predefinedColors: [
        '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
        '#53a8ff', '#85ce61', '#ebb563', '#f78989', '#a6a9ad'
      ],
      
      // Available icons
      availableIcons: [
        'mdi:account', 'mdi:account-group', 'mdi:shield-account', 'mdi:moderator',
        'mdi:star', 'mdi:crown', 'mdi:robot', 'mdi:lock', 'mdi:key', 'mdi:security',
        'mdi:eye', 'mdi:pencil', 'mdi:delete', 'mdi:plus', 'mdi:minus', 'mdi:alert',
        'mdi:information', 'mdi:help', 'mdi:check', 'mdi:close', 'mdi:settings',
        'mdi:toolbox', 'mdi:hammer-wrench', 'mdi:chart-bar', 'mdi:chart-line',
        'mdi:database', 'mdi:server', 'mdi:cloud', 'mdi:earth', 'mdi:globe'
      ]
    };
  },
  computed: {
    filteredIcons() {
      if (!this.iconSearch) return this.availableIcons;
      return this.availableIcons.filter(icon => 
        icon.toLowerCase().includes(this.iconSearch.toLowerCase())
      );
    }
  },
  async mounted() {
    await this.loadData();
    await this.loadStats();
  },
  methods: {
    // Ładowanie danych
    async loadData() {
      await Promise.all([
        this.loadRoles(),
        this.loadPermissions(),
        this.loadCategories()
      ]);
    },
    
    async loadStats() {
      try {
        const response = await axios.get('/admin/permissions/stats');
        this.stats = response.data;
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    },
    
  async loadRoles() {
    try {
      const response = await axios.get('/admin/roles');
      
      // Pobierz liczby użytkowników dla każdej roli
      const rolesWithCounts = await Promise.all(
        response.data.map(async (role) => {
          try {
            // Pobierz liczbę użytkowników dla danej roli
            const usersResponse = await axios.get(`/admin/roles/${role.id}/users-count`);
            return {
              ...role,
              is_system: role.is_system === 1,
              user_count: usersResponse.data.count || 0,
              permission_count: usersResponse.data.permission_count || 0
            };
          } catch (error) {
            console.error(`Error loading user count for role ${role.id}:`, error);
            return {
              ...role,
              is_system: role.is_system === 1,
              user_count: 0,
              permission_count: 0
            };
          }
        })
      );
      
      this.roles = rolesWithCounts;
      
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  },
    
async loadPermissions() {
  try {
    const response = await axios.get('/admin/permissions');
    
    // Przekształć dane z backendu na format oczekiwany przez frontend
    const categories = {};
    
    response.data.forEach(permission => {
      const categoryName = permission.category || 'Inne';
      
      if (!categories[categoryName]) {
        categories[categoryName] = {
          id: categoryName.toLowerCase().replace(/\s+/g, '-'),
          name: categoryName,
          icon: this.getCategoryIcon(categoryName),
          description: this.getCategoryDescription(categoryName),
          permissions: []
        };
      }
      
      categories[categoryName].permissions.push({
        ...permission,
        assigned_roles: permission.roles || [],
        loading: false
      });
    });
    
    this.permissionCategories = Object.values(categories);
    
  } catch (error) {
    console.error('Error loading permissions:', error);
  }
},

getCategoryIcon(categoryName) {
  const icons = {
    'Forum': 'mdi:forum',
    'Administracja': 'mdi:shield-account',
    'Moderacja': 'mdi:moderator',
    'Użytkownicy': 'mdi:account-group',
    'Kategorie': 'mdi:folder',
    'System': 'mdi:cog',
    'Inne': 'mdi:dots-horizontal'
  };
  return icons[categoryName] || 'mdi:dots-horizontal';
},

getCategoryDescription(categoryName) {
  const descriptions = {
    'Forum': 'Uprawnienia związane z podstawowymi funkcjami forum',
    'Administracja': 'Uprawnienia administracyjne systemu',
    'Moderacja': 'Uprawnienia moderatorskie treści',
    'Użytkownicy': 'Uprawnienia zarządzania użytkownikami',
    'Kategorie': 'Uprawnienia zarządzania kategoriami',
    'System': 'Uprawnienia systemowe',
    'Inne': 'Pozostałe uprawnienia'
  };
  return descriptions[categoryName] || 'Kategoria uprawnień';
},
    
    async loadCategories() {
      try {
        const response = await axios.get('/admin/categories_role/permissions');
        this.categories = response.data;
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    },
     
    // Zarządzanie rolami
    showRoleDialog(role) {
      if (role) {
        this.roleDialog.isEdit = true;
        this.roleDialog.form = { ...role };
      } else {
        this.roleDialog.isEdit = false;
        this.roleDialog.form = {
          name: '',
          description: '',
          icon: 'mdi:account',
          priority: 500,
          color: '#409EFF',
          is_default: false
        };
      }
      this.roleDialog.visible = true;
    },
    
    async saveRole() {
      try {
        this.$refs.roleFormRef.validate(async (valid) => {
          if (!valid) return;
          
          const endpoint = this.roleDialog.isEdit ? 
            `/admin/roles/${this.roleDialog.form.id}` : 
            '/admin/roles';
          
          const method = this.roleDialog.isEdit ? 'put' : 'post';
          
          await axios[method](endpoint, this.roleDialog.form);
          
          this.$message.success(
            this.roleDialog.isEdit ? 
            'Rola została zaktualizowana' : 
            'Rola została utworzona'
          );
          
          this.roleDialog.visible = false;
          await this.loadRoles();
        });
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas zapisywania roli');
      }
    },
    
    confirmDeleteRole(role) {
      this.$confirm(
        `Czy na pewno chcesz usunąć rolę "${role.name}"? Ta operacja nie może zostać cofnięta.`,
        'Potwierdzenie usunięcia',
        {
          confirmButtonText: 'Tak, usuń',
          cancelButtonText: 'Anuluj',
          type: 'warning'
        }
      ).then(async () => {
        await this.deleteRole(role.id);
      }).catch(() => {});
    },
    
    async deleteRole(roleId) {
      try {
        await axios.delete(`/admin/roles/${roleId}`);
        this.$message.success('Rola została usunięta');
        await this.loadRoles();
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas usuwania roli');
      }
    },
    
    // Zarządzanie użytkownikami roli
    async showUsersDialog(role) {
      this.usersDialog.roleId = role.id;
      this.usersDialog.roleName = role.name;
      this.usersDialog.visible = true;
      await this.loadRoleUsers(role.id);
    },
    
    async loadRoleUsers(roleId) {
  this.usersDialog.loading = true;
  try {
    const response = await axios.get(`/admin/roles/${roleId}/users`);
    // Mapowanie created_at na joined
    this.usersDialog.users = response.data.map(user => ({
      ...user,
      joined: user.created_at // Dodajemy pole joined
    }));
  } catch (error) {
    console.error('Error loading role users:', error);
  } finally {
    this.usersDialog.loading = false;
  }
},
    
    searchUsers: debounce(async function(query) {
      if (!query) {
        this.usersDialog.searchResults = [];
        return;
      }
      
      this.usersDialog.searching = true;
      try {
        const response = await axios.get('/admin/users/search', {
          params: { q: query, limit: 10 }
        });
        this.usersDialog.searchResults = response.data;
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        this.usersDialog.searching = false;
      }
    }, 300),
    
    async addUserToRole() {
      try {
        await axios.post(`/admin/roles/${this.usersDialog.roleId}/users`, {
          user_id: this.usersDialog.newUser
        });
        
        this.$message.success('Użytkownik został dodany do roli');
        this.usersDialog.newUser = null;
        this.usersDialog.searchResults = [];
        await this.loadRoleUsers(this.usersDialog.roleId);
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas dodawania użytkownika');
      }
    },
    
    async removeUserFromRole(userId) {
      try {
        await axios.delete(`/admin/roles/${this.usersDialog.roleId}/users/${userId}`);
        this.$message.success('Użytkownik został usunięty z roli');
        await this.loadRoleUsers(this.usersDialog.roleId);
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas usuwania użytkownika');
      }
    },
    
    // Zarządzanie uprawnieniami
    async updatePermissionRoles(permission) {
      try {
        permission.loading = true;
        await axios.put(`/admin/permissions/${permission.id}/roles`, {
          role_ids: permission.assigned_roles
        });
        this.$message.success('Uprawnienia zostały zaktualizowane');
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas aktualizacji uprawnień');
      } finally {
        permission.loading = false;
      }
    },
    
    // Uprawnienia kategorii
    async updateCategoryPermission(category, type) {
      try {
        const fieldMap = {
          read: 'read_roles',
          write: 'write_roles',
          moderate: 'moderate_roles'
        };
        
        await axios.put(`/admin/categories/${category.id}/permissions`, {
          type: type,
          [type]: category[fieldMap[type]]
        });
        
        this.$message.success('Uprawnienia kategorii zostały zaktualizowane');
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas aktualizacji uprawnień');
      }
    },
    
    // Logi audytu
    async loadAuditLogs() {
      this.loadingAuditLogs = true;
      try {
        const params = {
          page: this.auditCurrentPage,
          limit: this.auditPageSize,
          action: this.auditFilters.action
        };
        
        if (this.auditDateRange && this.auditDateRange.length === 2) {
          params.start_date = this.auditDateRange[0].toISOString().split('T')[0];
          params.end_date = this.auditDateRange[1].toISOString().split('T')[0];
        }
        
        const response = await axios.get('/admin/audit/logs', { params });
        this.auditLogs = response.data.items;
        this.auditTotalItems = response.data.total;
        this.auditTotalPages = Math.ceil(this.auditTotalItems / this.auditPageSize);
      } catch (error) {
        console.error('Error loading audit logs:', error);
      } finally {
        this.loadingAuditLogs = false;
      }
    },
    
    showPermissionDialog(permission) {
      if (permission) {
        this.permissionDialog.isEdit = true;
        this.permissionDialog.form = { 
          id: permission.id,
          name: permission.name,
          description: permission.description,
          category: permission.category || 'Inne'
        };
      } else {
        this.permissionDialog.isEdit = false;
        this.permissionDialog.form = {
          name: '',
          description: '',
          category: 'Inne'
        };
      }
      this.permissionDialog.visible = true;
    },
    
    async savePermission() {
      try {
        this.$refs.permissionFormRef.validate(async (valid) => {
          if (!valid) return;
          
          const endpoint = this.permissionDialog.isEdit ? 
            `/admin/permissions/${this.permissionDialog.form.id}` : 
            '/admin/permissions';
          
          const method = this.permissionDialog.isEdit ? 'put' : 'post';
          
          // Usuń id z formularza jeśli tworzymy nowe uprawnienie
          const formData = { ...this.permissionDialog.form };
          if (!this.permissionDialog.isEdit) {
            delete formData.id;
          }
          
          await axios[method](endpoint, formData);
          
          this.$message.success(
            this.permissionDialog.isEdit ? 
            'Uprawnienie zostało zaktualizowane' : 
            'Uprawnienie zostało utworzone'
          );
          
          this.permissionDialog.visible = false;
          await this.loadPermissions();
        });
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas zapisywania uprawnienia');
      }
    },
    
    async deletePermission(permission) {
      try {
        await axios.delete(`/admin/permissions/${permission.id}`);
        this.$message.success('Uprawnienie zostało usunięte');
        await this.loadPermissions();
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Błąd podczas usuwania uprawnienia');
      }
    },
    
	confirmDeletePermission(permission) {
	  this.$confirm(
	    `Czy na pewno chcesz usunąć uprawnienie "${permission.name}"?`,
	    'Potwierdzenie usunięcia',
	    {
	      confirmButtonText: 'Tak, usuń',
	      cancelButtonText: 'Anuluj',
	      type: 'warning'
	    }
	  ).then(async () => {
	    await this.deletePermission(permission);
	  }).catch(() => {});
	},
    
    showAuditDetails(row) {
      this.auditDetails.data = row;
      this.auditDetails.visible = true;
    },
    
    formatChanges(changes) {
      if (!changes) return [];
      return Object.entries(changes).map(([field, values]) => ({
        field,
        old_value: values.old !== undefined ? String(values.old) : '-',
        new_value: values.new !== undefined ? String(values.new) : '-'
      }));
    },
    
    // Pomocnicze
    getRoleType(priority) {
      if (priority <= 10) return 'danger';
      if (priority <= 100) return 'warning';
      if (priority <= 500) return 'primary';
      return 'info';
    },
    
    getActionType(action) {
      const types = {
        create: 'success',
        update: 'warning',
        delete: 'danger',
        access_denied: 'info'
      };
      return types[action] || 'info';
    },
    
    getActionLabel(action) {
      const labels = {
        create: 'Utworzenie',
        update: 'Modyfikacja',
        delete: 'Usunięcie',
        access_denied: 'Odmowa dostępu'
      };
      return labels[action] || action;
    },
    
    getResourceLabel(resourceType) {
      const labels = {
        role: 'Rola',
        permission: 'Uprawnienie',
        category: 'Kategoria',
        user: 'Użytkownik',
        post: 'Post',
        thread: 'Wątek'
      };
      return labels[resourceType] || resourceType;
    },
    
    formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pl-PL');
    },
    
    formatTime(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleTimeString('pl-PL');
    },
    
    formatDateTime(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL');
    },
    
    selectIcon(icon) {
      this.roleDialog.form.icon = icon;
      this.showIconPicker = false;
    },
    
    reloadPermissions() {
      this.loadPermissions();
      this.$message.success('Lista uprawnień została odświeżona');
    },
    
    loadCategoryPermissions() {
      this.loadCategories();
      this.$message.success('Uprawnienia kategorii zostały odświeżone');
    },
      calculateUserCount(role) {
    // Tutaj dodaj logikę obliczania liczby użytkowników dla roli
    // Na razie zwróć 0 - później możesz dodać prawdziwe dane
    return 0;
  },
  
  calculatePermissionCount(role) {
    // Oblicz liczbę uprawnień z JSONa
    try {
      const permissions = JSON.parse(role.permissions);
      return Object.keys(permissions).filter(key => permissions[key] === true).length;
    } catch (e) {
      return 0;
    }
  },
  
  
getRoleColor(roleName) {
  const colors = {
    'Administrator': '#F56C6C', // czerwony
    'Moderator': '#E6A23C',     // pomarańczowy
    'Redaktor': '#409EFF',      // niebieski
    'VIP': '#67C23A',           // zielony
    'Użytkownik': '#909399',    // szary
    'Zbanowany': '#000000'      // czarny
  };
  return colors[roleName] || '#409EFF';
},
  
  getRoleDescription(roleName) {
    const descriptions = {
      'Administrator': 'Pełne uprawnienia administracyjne do zarządzania forum',
      'Moderator': 'Uprawnienia do moderacji treści i zarządzania wątkami',
      'Użytkownik': 'Podstawowe uprawnienia standardowego użytkownika',
      'Zbanowany': 'Użytkownik z zablokowanym dostępem do forum',
      'VIP': 'Użytkownik z dodatkowymi przywilejami',
      'Redaktor': 'Uprawnienia do tworzenia i edycji treści'
    };
    return descriptions[roleName] || 'Rola systemowa';
  },
  
  getRoleIcon(roleName) {
    const icons = {
      'Administrator': 'mdi:shield-account',
      'Moderator': 'mdi:moderator',
      'Użytkownik': 'mdi:account',
      'Zbanowany': 'mdi:block-helper',
      'VIP': 'mdi:crown',
      'Redaktor': 'mdi:pencil'
    };
    return icons[roleName] || 'mdi:account';
  },
  
  getRolePriority(roleName) {
    const priorities = {
      'Administrator': 1,
      'Moderator': 10,
      'Redaktor': 50,
      'VIP': 100,
      'Użytkownik': 500,
      'Zbanowany': 1000
    };
    return priorities[roleName] || 500;
  }
  }
};
</script>

<style scoped>
.permission-system {
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--card-border);
  padding: 24px;
}

/* Nagłówek */
.permission-header {
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-bg-color) 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--el-border-color-light);
}

.header-content h2 {
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--el-text-color-primary);
}

.header-content p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.permission-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  gap: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* Zakładki */
.permission-tabs {
  margin-bottom: 24px;
}

.tab-content {
  padding: 0;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.tab-header h3 {
  margin: 0;
  color: var(--el-text-color-primary);
}

/* Role grid */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.role-card {
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.role-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.role-card.role-priority-1 {
  border-color: var(--el-color-danger);
  background: linear-gradient(135deg, var(--el-color-danger-light-9) 0%, var(--el-bg-color) 100%);
}

.role-card.role-priority-10 {
  border-color: var(--el-color-warning);
  background: linear-gradient(135deg, var(--el-color-warning-light-9) 0%, var(--el-bg-color) 100%);
}

.role-card.role-priority-100 {
  border-color: var(--el-color-primary);
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-bg-color) 100%);
}

.role-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.role-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.role-info {
  flex: 1;
}

.role-info h4 {
  margin: 0 0 4px 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.role-description {
  margin: 0 0 8px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.4;
}

.role-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.role-stats .stat {
  text-align: center;
}

.role-stats .stat-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  display: block;
}

.role-stats .stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: block;
}

.role-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Uprawnienia */
.permission-categories {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.category-section {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 20px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.category-description {
  margin: 0 0 16px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.permission-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  gap: 16px;
}

.permission-info {
  flex: 1;
}

.permission-info h5 {
  margin: 0 0 4px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.permission-description {
  margin: 0 0 4px 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.3;
}

.permission-key {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  font-family: monospace;
}

.permission-assignments {
  min-width: 200px;
}

/* Uprawnienia kategorii */
.category-permissions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-item {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 20px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.category-header h4 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.category-permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.permission-group h5 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 500;
}

/* Logi audytu */
.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.audit-logs {
  margin-top: 16px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* Dialog użytkowników */
.users-dialog-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  height: 400px;
}

.users-list h4,
.add-user-section h4 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

.user-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-user-section {
  border-left: 1px solid var(--el-border-color);
  padding-left: 24px;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-email {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.add-user-btn {
  margin-top: 12px;
  width: 100%;
}

/* Szczegóły audytu */
.audit-details {
  max-height: 60vh;
  overflow-y: auto;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.changes-section {
  margin-top: 20px;
}

.changes-section h4 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

/* Picker ikon */
.icon-picker {
  max-height: 60vh;
  overflow-y: auto;
}

.icon-search {
  margin-bottom: 16px;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.icon-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.icon-item.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.icon-item .iconify {
  font-size: 24px;
  margin-bottom: 8px;
}

.icon-name {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
  line-height: 1.2;
}

/* Priorytet help */
.priority-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.form-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* Responsywność */
@media (max-width: 768px) {
  .permission-system {
    padding: 10px;
  }
  
  .permission-stats {
    grid-template-columns: 1fr;
  }
  
  .roles-grid {
    grid-template-columns: 1fr;
  }
  
  .permissions-grid {
    grid-template-columns: 1fr;
  }
  
  .category-permissions-grid {
    grid-template-columns: 1fr;
  }
  
  .users-dialog-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .add-user-section {
    border-left: none;
    border-top: 1px solid var(--el-border-color);
    padding-left: 0;
    padding-top: 16px;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .icons-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
}

@media (max-width: 480px) {
  .role-header {
    flex-direction: column;
    text-align: center;
  }
  
  .role-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .role-actions {
    flex-direction: column;
  }
  
  .permission-item {
    flex-direction: column;
    text-align: center;
  }
  
  .permission-assignments {
    width: 100%;
  }
  
  .tab-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
