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
      <el-menu-item index="users" v-if="isAdmin">
        <Icon icon="mdi:account-group" />
        Użytkownicy
      </el-menu-item>
      <el-menu-item index="categories-management">
        <Icon icon="mdi:shape-outline" />
        Kategorie
      </el-menu-item>
      <el-menu-item index="threads-management">
        <Icon icon="mdi:forum-outline" />
        Tematy
      </el-menu-item>
      <el-menu-item index="posts-management">
        <Icon icon="mdi:message-text" />
        Posty
      </el-menu-item>
      <el-menu-item index="reputation-management" v-if="isAdmin">
        <Icon icon="mdi:star" />
        Reputacja
      </el-menu-item>
    </el-menu>
    
    <div class="admin-content">
      <UsersManagement v-if="activeSubView === 'users' && isAdmin" />
      <CategoryManagement v-if="activeSubView === 'categories-management'" />
      <ThreadsManagement v-if="activeSubView === 'threads-management'" />
      <PostsManagement v-if="activeSubView === 'posts-management'" />
      <ReputationManagement v-if="activeSubView === 'reputation-management' && isAdmin" />
      
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

export default {
  name: 'AdminPanel',
  components: {
    Icon,
    UsersManagement,
    CategoryManagement,
    ThreadsManagement,
    PostsManagement,
    ReputationManagement
  },
  props: {
    isAdmin: Boolean
  },
  data() {
    return {
      activeSubView: ''
    };
  },
  mounted() {
    this.activeSubView = this.isAdmin ? 'users' : 'categories-management';
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
