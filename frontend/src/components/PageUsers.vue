<template>
  <div class="page-users-widget">
    <div class="widget-header">
      <Icon icon="mdi:earth" class="header-icon" />
      <h3>Użytkownicy na stronie</h3>
    </div>
    
    <div class="users-list">
      <div v-if="pageUsers.length === 0" class="no-users">
        <Icon icon="mdi:account-off" class="no-users-icon" />
        <p>Brak użytkowników na stronie</p>
      </div>
      
      <div v-else class="users-container">
        <div v-for="user in pageUsers" :key="user.id" class="user-item">
          <UserAvatar :user="user.username" :status="user.status" size="small" />
          <span class="username">{{ user.username }}</span>
          <span class="user-status" :class="user.status">{{ getUserStatusText(user.status) }}</span>
        </div>
      </div>
    </div>
    
    <div class="widget-footer">
      <span class="total-count">{{ pageUsers.length }} użytkowników na stronie</span>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import UserAvatar from './UserAvatar.vue';
import axios from "axios";

export default {
  name: 'PageUsers',
  components: {
    Icon,
    UserAvatar
  },
  data() {
    return {
      pageUsers: [],
      refreshInterval: null
    };
  },
  mounted() {
    this.loadPageUsers();
    this.startAutoRefresh();
  },
  beforeUnmount() {
    this.stopAutoRefresh();
  },
  methods: {
    async loadPageUsers() {
      try {
        const response = await axios.get('/page-users');
        this.pageUsers = response.data.users || [];
      } catch (error) {
        console.error('Error loading page users:', error);
      }
    },
    
    getUserStatusText(status) {
      const statusText = {
        online: 'Online',
        recent: 'Ostatnio aktywny',
        offline: 'Offline'
      };
      return statusText[status] || 'Offline';
    },
    
    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this.loadPageUsers();
      }, 15000); // Co 15 sekund
    },
    
    stopAutoRefresh() {
      if (this.refreshInterval) clearInterval(this.refreshInterval);
    }
  }
}
</script>

<style scoped>
.page-users-widget {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--card-border);
  margin-top: 20px;
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.header-icon {
  font-size: 20px;
  color: var(--el-color-warning);
}

.widget-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.users-list {
  min-height: 100px;
}

.no-users {
  text-align: center;
  padding: 20px 0;
  color: var(--text-secondary);
}

.no-users-icon {
  font-size: 32px;
  opacity: 0.5;
  margin-bottom: 8px;
}

.no-users p {
  margin: 0;
  font-size: 14px;
}

.users-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.user-item:hover {
  background: var(--el-fill-color-light);
}

.username {
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.user-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.user-status.online {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success-dark-2);
}

.user-status.recent {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
}

.user-status.offline {
  background: var(--el-fill-color-light);
  color: var(--text-secondary);
}

.widget-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
  text-align: center;
}

.total-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Responsywność */
@media (max-width: 768px) {
  .page-users-widget {
    padding: 12px;
  }
  
  .user-item {
    padding: 6px;
  }
  
  .username {
    font-size: 14px;
  }
  
  .user-status {
    font-size: 10px;
  }
}
</style>
