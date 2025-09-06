<template>
  <div class="forum-stats-simple">
    <!-- Główny pasek statystyk -->
    <div class="stats-bar">
      <!-- Statystyki forum -->
      <div class="stat-group">
        <div class="stat-item">
          <Icon icon="mdi:forum" class="stat-icon" />
          <span class="stat-value">{{ stats.threads || 0 }}</span>
          <span class="stat-label">Tematy</span>
        </div>
        
        <div class="stat-item">
          <Icon icon="mdi:message-text" class="stat-icon" />
          <span class="stat-value">{{ stats.posts || 0 }}</span>
          <span class="stat-label">Posty</span>
        </div>
        
        <div class="stat-item">
          <Icon icon="mdi:account-multiple" class="stat-icon" />
          <span class="stat-value">{{ stats.users || 0 }}</span>
          <span class="stat-label">Użytkownicy</span>
        </div>
      </div>

      <!-- Separator -->
      <div class="separator"></div>

      <!-- Użytkownicy online -->
      <div class="stat-group">
        <div class="stat-item" v-tooltip="`Zalogowani: ${onlineUsersList}`">
          <Icon icon="mdi:account" class="stat-icon user" />
          <span class="stat-value">{{ onlineData.online_users || 0 }}</span>
          <span class="stat-label">Użytk.</span>
        </div>
        
        <div class="stat-item">
          <Icon icon="mdi:account-outline" class="stat-icon guest" />
          <span class="stat-value">{{ onlineData.online_guests || 0 }}</span>
          <span class="stat-label">Goście</span>
        </div>
        
        <div class="stat-item" v-tooltip="`Boty: ${onlineBotsList}`">
          <Icon icon="mdi:robot" class="stat-icon bot" />
          <span class="stat-value">{{ onlineData.online_bots || 0 }}</span>
          <span class="stat-label">Boty</span>
        </div>
        
        <div class="stat-item total">
          <Icon icon="mdi:eye" class="stat-icon total" />
          <span class="stat-value">{{ onlineData.total_online || 0 }}</span>
          <span class="stat-label">Online</span>
        </div>
      </div>

      <!-- Separator -->
      <div class="separator"></div>

      <!-- Na stronie -->
      <div class="stat-group">
        <div class="stat-item page-users">
          <Icon icon="mdi:earth" class="stat-icon" />
          <span class="stat-value">{{ pageUsers.length }}</span>
          <span class="stat-label">Na stronie</span>
          <div class="users-preview" v-if="pageUsers.length > 0">
            <span 
              v-for="user in pageUsers.slice(0, 3)" 
              :key="user.id"
              class="user-badge"
              v-tooltip="user.username"
            >
              {{ getInitial(user.username) }}
            </span>
            <span 
              v-if="pageUsers.length > 3" 
              class="user-badge more"
              v-tooltip="`+${pageUsers.length - 3} więcej`"
            >
              +{{ pageUsers.length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Status online -->
    <div class="status-indicator">
      <Icon icon="mdi:circle" class="status-dot" />
      <span class="status-text">Online</span>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ForumStatsSimple',
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
    }
  },
  mounted() {
    this.loadOnlineUsers();
    this.loadPageUsers();
    this.startAutoRefresh();
  },
  beforeUnmount() {
    this.stopAutoRefresh();
  },
  methods: {
    getInitial(username) {
      return username ? username.charAt(0).toUpperCase() : '?';
    },
    
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
      this.onlineInterval = setInterval(() => {
        this.loadOnlineUsers();
      }, 15000);
      
      this.pageUsersInterval = setInterval(() => {
        this.loadPageUsers();
      }, 20000);
    },
    
    stopAutoRefresh() {
      if (this.onlineInterval) clearInterval(this.onlineInterval);
      if (this.pageUsersInterval) clearInterval(this.pageUsersInterval);
    }
  }
}
</script>

<style scoped>
.forum-stats-simple {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  position: relative;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.stat-item:hover {
  background: var(--el-fill-color-light);
}

.stat-item.total {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
}

.stat-icon {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-icon.user { color: var(--el-color-success); }
.stat-icon.guest { color: var(--el-color-info); }
.stat-icon.bot { color: var(--el-color-warning); }
.stat-icon.total { color: var(--el-color-primary); }

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.separator {
  width: 1px;
  height: 24px;
  background: var(--border-color-light);
}

/* Użytkownicy na stronie */
.page-users {
  position: relative;
}

.users-preview {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.user-badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: white;
  font-size: 9px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--bg-secondary);
}

.user-badge.more {
  background: var(--el-color-info);
  font-size: 8px;
}

/* Status indicator */
.status-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-dot {
  font-size: 8px;
  color: var(--el-color-success);
}

.status-text {
  font-size: 10px;
  color: var(--text-secondary);
}

/* Responsywność */
@media (max-width: 1024px) {
  .stats-bar {
    justify-content: center;
    gap: 12px;
  }
  
  .stat-group {
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .forum-stats-simple {
    padding: 10px;
  }
  
  .stats-bar {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-group {
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .separator {
    display: none;
  }
  
  .page-users {
    margin-top: 4px;
  }
}

@media (max-width: 480px) {
  .stat-item {
    padding: 3px 6px;
  }
  
  .stat-value {
    font-size: 12px;
  }
  
  .stat-label {
    font-size: 10px;
  }
  
  .users-preview {
    display: none;
  }
  
  .status-indicator {
    position: static;
    justify-content: center;
    margin-top: 8px;
  }
}
</style>
