<template>
  <div class="admin-panel">
    <div class="admin-header">
      <h2><Icon icon="mdi:cog" /> Panel Administracyjny</h2>
      <p>Zarządzaj treścią i użytkownikami forum</p>
    </div>
    
    <el-menu 
      mode="horizontal" 
      @select="handleMenuSelect" 
      :default-active="activeSubView"
      class="admin-menu"
    >
      <el-menu-item index="users" v-if="this.$hasPermission('manage_users')">
        <Icon icon="mdi:account-group" />
        Użytkownicy
      </el-menu-item>
      <el-menu-item index="categories-management" v-if="this.$hasPermission('manage_categories')">
        <Icon icon="mdi:shape-outline" />
        Kategorie
      </el-menu-item>
      <el-menu-item index="threads-management" v-if="this.$hasPermission('manage_threads')">
        <Icon icon="mdi:forum-outline" />
        Tematy
      </el-menu-item>
      <el-menu-item index="posts-management" v-if="this.$hasPermission('manage_posts')">
        <Icon icon="mdi:message-text" />
        Posty
      </el-menu-item>
      <el-menu-item index="reputation-management" v-if="this.$hasPermission('manage_users')">
        <Icon icon="mdi:star" />
        Reputacja
      </el-menu-item>
      <el-menu-item index="achievements-management" v-if="this.$hasPermission('manage_users')">
        <Icon icon="mdi:trophy" />
        Osiągnięcia
      </el-menu-item>
      <el-menu-item index="backup-management" v-if="this.$hasPermission('manage_backups')">
        <Icon icon="mdi:database-export" />
        Backup i Eksport
      </el-menu-item>
      <el-menu-item index="permission-manager" v-if="this.$hasPermission('view_permissions')">
        <Icon icon="mdi:shield-account" />
        Uprawnienia
      </el-menu-item>
    </el-menu>
    
    <div class="admin-content">
      <UsersManagement v-if="activeSubView === 'users' && this.$hasPermission('manage_users')" />
      <CategoryManagement v-if="activeSubView === 'categories-management' && this.$hasPermission('manage_categories')" />
      <ThreadsManagement v-if="activeSubView === 'threads-management' && this.$hasPermission('manage_threads')" />
      <PostsManagement v-if="activeSubView === 'posts-management' && this.$hasPermission('manage_posts')" />
      <ReputationManagement v-if="activeSubView === 'reputation-management' && this.$hasPermission('manage_users')" />
      <AchievementsManagement v-if="activeSubView === 'achievements-management' && this.$hasPermission('manage_users')" />
      <BackupManagement v-if="activeSubView === 'backup-management' && this.$hasPermission('manage_backups')" />
      <PermissionManager v-if="activeSubView === 'permission-manager' && this.$hasPermission('view_permissions')" />
      
      <div v-if="!activeSubView" class="admin-welcome">
        <el-empty description="Wybierz sekcję do zarządzania z menu powyżej" />
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import UsersManagement from './UsersManagement.vue';
import CategoryManagement from './CategoryManagement.vue';
import ThreadsManagement from './ThreadsManagement.vue';
import PostsManagement from './PostsManagement.vue';
import ReputationManagement from './ReputationManagement.vue';
import AchievementsManagement from './AchievementsManagement.vue';
import BackupManagement from './BackupManagement.vue';
import PermissionManager from './PermissionManager.vue';

export default {
  name: 'AdminPanel',
  components: {
    Icon,
    UsersManagement,
    CategoryManagement,
    ThreadsManagement,
    PostsManagement,
    ReputationManagement,
    AchievementsManagement,
    BackupManagement,
    PermissionManager
  },
  props: {
    currentUser: Object
  },
  data() {
    return {
      activeSubView: ''
    };
  },
  computed: {
    hasAnyPermission() {
      const requiredPermissions = [
        'manage_users', 'manage_categories', 'manage_threads', 
        'manage_posts', 'manage_backups', 'view_permissions'
      ];
      return this.$hasAnyPermission(requiredPermissions);
    }
  },
  mounted() {
    // Ustaw domyślną zakładkę na pierwszą dostępną
    if (this.$hasPermission('manage_users')) {
      this.activeSubView = 'users';
    } else if (this.$hasPermission('manage_categories')) {
      this.activeSubView = 'categories-management';
    } else if (this.$hasPermission('manage_threads')) {
      this.activeSubView = 'threads-management';
    } else if (this.$hasPermission('view_permissions')) {
      this.activeSubView = 'permission-manager';
    }
  },
  methods: {
    handleMenuSelect(index) {
      this.activeSubView = index;
    }
  }
}
</script>

<style scoped>
.admin-panel {
  background: transparent;
  padding: 0;
}

.admin-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 0;
}

.admin-header h2 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 600;
}

.admin-header p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 16px;
}

.admin-menu {
  margin-bottom: 24px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--card-border);
}

.admin-content {
  min-height: 500px;
}

.admin-welcome {
  text-align: center;
  padding: 60px 0;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--card-border);
}
</style>
