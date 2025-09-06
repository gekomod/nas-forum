<template>
  <div class="forum-stats">
    <div class="stats-left">
      <span class="stat-item">
        <Icon icon="mdi:forum-outline" class="stat-icon" />
        <span class="stat-number">{{ stats.threads || 0 }}</span>
        <span class="stat-label">Tematów</span>
      </span>
      <span class="stat-separator">|</span>
      <span class="stat-item">
        <Icon icon="mdi:message-text-outline" class="stat-icon" />
        <span class="stat-number">{{ stats.posts || 0 }}</span>
        <span class="stat-label">Odpowiedzi</span>
      </span>
      <span class="stat-separator">|</span>
      <span class="stat-item">
        <Icon icon="mdi:account-group-outline" class="stat-icon" />
        <span class="stat-number">{{ stats.users || 0 }}</span>
        <span class="stat-label">Użytkowników</span>
      </span>
    </div>

    <div class="stats-right">
      <div class="online-item" v-tooltip="`Zalogowani użytkownicy: ${onlineUsersList}`">
        <Icon icon="mdi:account" class="online-icon user" />
        <span class="online-number">{{ onlineData.online_users || 0 }}</span>
        <span class="online-label">Użytk.</span>
      </div>
      <div class="online-item">
        <Icon icon="mdi:account-outline" class="online-icon guest" />
        <span class="online-number">{{ onlineData.online_guests || 0 }}</span>
        <span class="online-label">Gości</span>
      </div>
      <div class="online-item" v-tooltip="`Aktywne boty: ${onlineBotsList}`">
        <Icon icon="mdi:robot" class="online-icon bot" />
        <span class="online-number">{{ onlineData.online_bots || 0 }}</span>
        <span class="online-label">Boty</span>
      </div>
      <div class="online-item total">
        <Icon icon="mdi:eye" class="online-icon total" />
        <span class="online-number">{{ onlineData.total_online || 0 }}</span>
        <span class="online-label">Online</span>
      </div>
      
      <!-- Dodane: Użytkownicy na tej stronie -->
      <div class="online-item" v-tooltip="`Użytkownicy przeglądający tę stronę: ${pageUsersList}`">
        <Icon icon="mdi:earth" class="online-icon page" />
        <span class="online-number">{{ pageUsers.length }}</span>
        <span class="online-label">Na stronie</span>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ForumStats',
  components: { Icon },
  props: {
    stats: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      onlineData: {
        online_users: 0,
        online_guests: 0,
        online_bots: 0,
        total_online: 0,
        users: [],
        bots: []
      },
      pageUsers: [],
      refreshInterval: null,
      onlineInterval: null,
      pageUsersInterval: null
    };
  },
  computed: {
    onlineUsersList() {
      if (!this.onlineData.users || this.onlineData.users.length === 0) {
        return 'Brak zalogowanych użytkowników';
      }
      return this.onlineData.users.map(user => user.username).join(', ');
    },
    onlineBotsList() {
      if (!this.onlineData.bots || this.onlineData.bots.length === 0) {
        return 'Brak aktywnych botów';
      }
      
      const botTypes = {};
      this.onlineData.bots.forEach(bot => {
        botTypes[bot.type] = (botTypes[bot.type] || 0) + 1;
      });
      
      return Object.entries(botTypes)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');
    },
    pageUsersList() {
      if (this.pageUsers.length === 0) {
        return 'Brak użytkowników na tej stronie';
      }
      return this.pageUsers.map(user => user.username).join(', ');
    }
  },
  mounted() {
    this.startAutoRefresh();
    this.loadOnlineUsers();
    this.loadPageUsers();
  },
  beforeUnmount() {
    this.stopAutoRefresh();
  },
  methods: {
    async loadStats() {
      try {
        await this.$emit('refresh-stats');
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    },
    
    async loadOnlineUsers() {
      try {
        const response = await axios.get('/online-users');
        this.onlineData = response.data;
      } catch (error) {
        console.error('Error loading online users:', error);
      }
    },
    
    async loadPageUsers() {
      try {
        const response = await axios.get('/page-users');
        this.pageUsers = response.data.users || [];
      } catch (error) {
        console.error('Error loading page users:', error);
      }
    },
    
    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this.loadStats();
      }, 30000);
      
      this.onlineInterval = setInterval(() => {
        this.loadOnlineUsers();
      }, 10000);
      
      this.pageUsersInterval = setInterval(() => {
        this.loadPageUsers();
      }, 15000);
    },
    
    stopAutoRefresh() {
      if (this.refreshInterval) clearInterval(this.refreshInterval);
      if (this.onlineInterval) clearInterval(this.onlineInterval);
      if (this.pageUsersInterval) clearInterval(this.pageUsersInterval);
    }
  }
}
</script>


<style scoped>
.forum-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg);
  border-radius: 8px;
  padding: 12px 20px;
  border: 1px solid var(--card-border);
  margin-bottom: 20px;
  font-size: 13px;
}

.online-icon.bot {
  color: var(--el-color-danger);
}

.stats-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-icon {
  font-size: 16px;
  color: var(--el-color-primary);
  opacity: 0.8;
}

.stat-number {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 14px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-separator {
  color: var(--el-border-color);
  margin: 0 4px;
  opacity: 0.6;
}

.stats-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.online-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 45px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.online-item:hover {
  background: var(--el-fill-color-light);
}

.online-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.online-icon.user {
  color: var(--el-color-success);
}

.online-icon.guest {
  color: var(--el-color-info);
}

.online-icon.total {
  color: var(--el-color-primary);
}

.online-icon.page {
  color: var(--el-color-warning);
}

.online-number {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1;
}

.online-label {
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 500;
}

.online-item.total .online-number {
  color: var(--el-color-primary);
}

.online-item.total .online-label {
  color: var(--el-color-primary);
  font-weight: 600;
}

/* Responsywność */
@media (max-width: 768px) {
  .forum-stats {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .stats-left {
    order: 2;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .stats-right {
    order: 1;
    border-bottom: 1px solid var(--el-border-color-light);
    padding-bottom: 12px;
    width: 100%;
    justify-content: center;
    gap: 15px;
  }
}

@media (max-width: 480px) {
  .forum-stats {
    padding: 10px 12px;
  }
  
  .stats-left {
    gap: 6px;
  }
  
  .stat-item {
    gap: 4px;
  }
  
  .stat-icon {
    font-size: 14px;
  }
  
  .stat-number {
    font-size: 13px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .stat-separator {
    margin: 0 2px;
  }
  
  .stats-right {
    gap: 12px;
  }
  
  .online-item {
    min-width: 40px;
    padding: 4px 6px;
  }
  
  .online-icon {
    font-size: 16px;
  }
  
  .online-number {
    font-size: 14px;
  }
  
  .online-label {
    font-size: 10px;
  }
}
</style>
