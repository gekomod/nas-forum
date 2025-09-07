<template>
  <div class="admin-panel">
    <div class="admin-header">
      <div class="header-content">
        <h2><Icon icon="mdi:cog" /> Panel Administracyjny</h2>
        <p>Zarządzaj treścią i użytkownikami forum</p>
        <div class="user-info" v-if="currentUser">
          <el-avatar :size="36" :src="currentUser.avatar" />
          <span class="user-name">{{ currentUser.name }}</span>
          <el-tag size="small" :type="getRoleType(currentUser.role_names)">
            {{ currentUser.role_names }}
          </el-tag>
        </div>
      </div>
    </div>
    
    <div class="admin-layout">
      <!-- Lewy sidebar z menu -->
      <div class="admin-sidebar">
        <div class="sidebar-menu">
          <el-menu 
            :default-active="activeSubView"
            @select="handleMenuSelect"
            class="vertical-menu"
          >
            <el-menu-item index="users" v-if="$hasPermission('manage_users')">
              <Icon icon="mdi:account-group" />
              <span>Użytkownicy</span>
            </el-menu-item>
            
            <el-menu-item index="categories-management" v-if="$hasPermission('manage_categories')">
              <Icon icon="mdi:shape-outline" />
              <span>Kategorie</span>
            </el-menu-item>
            
            <el-menu-item index="threads-management" v-if="$hasPermission('manage_threads')">
              <Icon icon="mdi:forum-outline" />
              <span>Tematy</span>
            </el-menu-item>
            
            <el-menu-item index="posts-management" v-if="$hasPermission('manage_posts')">
              <Icon icon="mdi:message-text" />
              <span>Posty</span>
            </el-menu-item>
            
            <el-sub-menu index="user-management" v-if="$hasAnyPermission(['manage_users', 'manage_reputation', 'manage_achievements'])">
              <template #title>
                <Icon icon="mdi:account-cog" />
                <span>Zarządzanie użytkownikami</span>
              </template>
              <el-menu-item index="reputation-management" v-if="$hasPermission('manage_users')">
                <Icon icon="mdi:star" />
                <span>Reputacja</span>
              </el-menu-item>
              <el-menu-item index="achievements-management" v-if="$hasPermission('manage_users')">
                <Icon icon="mdi:trophy" />
                <span>Osiągnięcia</span>
              </el-menu-item>
            </el-sub-menu>
            
            <el-menu-item index="backup-management" v-if="$hasPermission('manage_backups')">
              <Icon icon="mdi:database-export" />
              <span>Backup i Eksport</span>
            </el-menu-item>
            
            <el-menu-item index="permission-manager" v-if="$hasPermission('view_permissions')">
              <Icon icon="mdi:shield-account" />
              <span>Uprawnienia</span>
            </el-menu-item>
            
            <el-menu-item index="seo-management" v-if="$hasPermission('manage_seo')">
              <Icon icon="mdi:google" />
              <span>SEO</span>
            </el-menu-item>
          </el-menu>
        </div>
        
        <div class="sidebar-footer">
          <!-- PRZYCISK POWROTU DO FORUM Z RÓŻNYMI OPCJAMI -->
          <el-button type="info" link @click="goToForum">
            <Icon icon="mdi:arrow-left" />
            Powrót do forum
          </el-button>
          
          <!-- ALTERNATYWNIE: Link bezpośredni -->
          <a href="/" class="forum-link" style="display: none;">Powrót do forum</a>
        </div>
      </div>
      
      <!-- Główna zawartość -->
      <div class="admin-main">
        <div class="content-header">
          <h3>{{ getSectionTitle(activeSubView) }}</h3>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item><a href="/">Forum</a></el-breadcrumb-item>
            <el-breadcrumb-item>Panel Administracyjny</el-breadcrumb-item>
            <el-breadcrumb-item>{{ getSectionTitle(activeSubView) }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="admin-content">
          <UsersManagement v-if="activeSubView === 'users' && $hasPermission('manage_users')" />
          <CategoryManagement v-if="activeSubView === 'categories-management' && $hasPermission('manage_categories')" />
          <ThreadsManagement v-if="activeSubView === 'threads-management' && $hasPermission('manage_threads')" />
          <PostsManagement v-if="activeSubView === 'posts-management' && $hasPermission('manage_posts')" />
          <ReputationManagement v-if="activeSubView === 'reputation-management' && $hasPermission('manage_users')" />
          <AchievementsManagement v-if="activeSubView === 'achievements-management' && $hasPermission('manage_users')" />
          <BackupManagement v-if="activeSubView === 'backup-management' && $hasPermission('manage_backups')" />
          <PermissionManager v-if="activeSubView === 'permission-manager' && $hasPermission('view_permissions')" />
          <SeoManagement v-if="activeSubView === 'seo-management' && $hasPermission('manage_seo')" />
          
          <div v-if="!activeSubView" class="admin-welcome">
            <el-empty description="Wybierz sekcję do zarządzania z menu po lewej stronie" />
          </div>
        </div>
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
import SeoManagement from './SeoManagement.vue';

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
    PermissionManager,
    SeoManagement
  },
  props: {
    currentUser: Object
  },
  data() {
    return {
      activeSubView: '',
      sectionTitles: {
        'users': 'Zarządzanie użytkownikami',
        'categories-management': 'Zarządzanie kategoriami',
        'threads-management': 'Zarządzanie tematami',
        'posts-management': 'Zarządzanie postami',
        'reputation-management': 'Zarządzanie reputacją',
        'achievements-management': 'Zarządzanie osiągnięciami',
        'backup-management': 'Backup i eksport danych',
        'permission-manager': 'Zarządzanie uprawnieniami',
        'seo-management': 'Ustawienia SEO'
      }
    };
  },
  computed: {
    hasAnyPermission() {
      const requiredPermissions = [
        'manage_users', 'manage_categories', 'manage_threads', 
        'manage_posts', 'manage_backups', 'view_permissions', 'manage_seo'
      ];
      return this.$hasAnyPermission(requiredPermissions);
    }
  },
  mounted() {
    console.log(this.currentUser);
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
    // POPRAWIONA METODA POWROTU DO FORUM Z ZABEZPIECZENIAMI
    goToForum() {
      try {
        // Opcja 1: Sprawdź czy $router istnieje
        if (this.$router) {
          this.$router.push('/');
        } 
        // Opcja 2: Użyj window.location
        else if (window && window.location) {
          window.location.href = '/';
        }
        // Opcja 3: Jeśli nic innego nie działa
        else {
          // Utwórz link i kliknij go programowo
          const link = document.createElement('a');
          link.href = '/';
          link.click();
        }
      } catch (error) {
        console.error('Błąd podczas przekierowania do forum:', error);
        // Ostateczne rozwiązanie - przeładuj stronę
        window.location.href = '/';
      }
    },
    
    // ALTERNATYWNA METODA - użyj emit do komunikacji z komponentem nadrzędnym
    goToForumAlternative() {
      this.$emit('navigate-to-forum');
    },
    
    handleMenuSelect(index) {
      this.activeSubView = index;
    },
    getSectionTitle(key) {
      return this.sectionTitles[key] || 'Panel Administracyjny';
    },
    getRoleType(role) {
      const roleTypes = {
        'Administrator': 'danger',
        'Moderator': 'warning',
        'User': 'info'
      };
      return roleTypes[role] || 'info';
    }
  }
}
</script>

<style scoped>
.admin-panel {
  background: transparent;
  min-height: 100vh;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--card-border);
  animation: fadeIn 0.6s ease-out;
}

.header-content {
  max-width: 1800px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.admin-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.admin-header p {
  margin: 4px 0 0 0;
  opacity: 0.9;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.15);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.user-name {
  font-weight: 500;
}

.admin-layout {
  display: flex;
  margin: 0 auto;
  padding: 24px;
  gap: 24px;
}

.admin-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-menu {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  flex-grow: 1;
}

.vertical-menu {
  border: none;
}

.vertical-menu :deep(.el-menu-item),
.vertical-menu :deep(.el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.vertical-menu :deep(.el-menu-item.is-active) {
  background-color: rgba(var(--primary-color-rgb), 0.1);
  color: var(--primary-color);
  border-right: 3px solid var(--primary-color);
}

.vertical-menu :deep(.el-menu-item:hover),
.vertical-menu :deep(.el-sub-menu__title:hover) {
  background-color: var(--bg-secondary);
}

.sidebar-footer {
  padding: 16px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-main {
  flex-grow: 1;
  min-width: 0;
}

.content-header {
  margin-bottom: 24px;
  padding: 16px 24px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.content-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.admin-content {
  min-height: 500px;
}

.admin-welcome {
  text-align: center;
  padding: 60px 0;
}

/* Poprawki dla przycisku powrotu */
.sidebar-footer :deep(.el-button) {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
}

.sidebar-footer :deep(.el-button--link) {
  color: var(--text-secondary);
}

.sidebar-footer :deep(.el-button--link:hover) {
  color: var(--primary-color);
}

/* Link do forum jako alternatywa */
.forum-link {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
}

.forum-link:hover {
  color: var(--primary-color);
  background-color: var(--bg-secondary);
}

/* Responsywność */
@media (max-width: 992px) {
  .admin-layout {
    flex-direction: column;
  }
  
  .admin-sidebar {
    width: 100%;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
  }
}

/* Animacje przejść */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
