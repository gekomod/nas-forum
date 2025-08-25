<template>
  <header class="forum-header">
    <div class="brand-container">
      <svg class="logo-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="url(#paint0_linear)"/>
        <rect x="21" y="12" width="6" height="6" rx="1" fill="white"/>
        <rect x="30" y="21" width="6" height="6" rx="1" fill="white"/>
        <rect x="21" y="30" width="6" height="6" rx="1" fill="white"/>
        <rect x="12" y="21" width="6" height="6" rx="1" fill="white"/>
        <defs>
          <linearGradient id="paint0_linear" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6A11CB"/>
            <stop offset="0.5" stop-color="#2575FC"/>
            <stop offset="1" stop-color="#11998E"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="logo-text-container">
        <span class="logo-text">NAS-PANEL</span>
        <span class="logo-subtext">Forum Dyskusyjne</span>
      </div>
    </div>
    <div class="header-controls">
      <button class="control-btn" @click="$emit('toggle-dark-mode')">
        <Icon :icon="darkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" />
      </button>
      
      <el-dropdown v-if="user" trigger="click">
        <button class="control-btn user-btn">
          <img :src="user.avatar || '/default-avatar.png'" class="user-avatar" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$emit('show-profile')">
              <Icon icon="mdi:account" /> Mój profil
            </el-dropdown-item>
            
            <el-dropdown-item v-if="user.role_id === 1 || user.role_id === 2" @click="$emit('show-admin-panel')">
              <Icon icon="mdi:cog" /> Panel Administracyjny
            </el-dropdown-item>
            
            <el-dropdown-item v-if="user.role_id === 1" @click="$emit('show-categories')">
              <Icon icon="mdi:plus-box" /> Nowa kategoria
            </el-dropdown-item>
            
            <el-dropdown-item divided @click="$emit('logout')">
              <Icon icon="mdi:logout" /> Wyloguj
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      
      <template v-else>
        <button class="control-btn" @click="$emit('show-login')">
          <Icon icon="mdi:login" />
        </button>
        <button class="control-btn" @click="$emit('show-register')">
          <Icon icon="mdi:account-plus" />
        </button>
      </template>

            <!-- Powiadomienia -->
      <el-dropdown v-if="user" trigger="click" class="notifications-dropdown">
        <button class="control-btn notification-btn">
          <Icon icon="mdi:bell-outline" />
          <span v-if="unreadNotifications > 0" class="notification-badge">
            {{ unreadNotifications > 99 ? '99+' : unreadNotifications }}
          </span>
        </button>
        <template #dropdown>
          <el-dropdown-menu class="notifications-menu">
            <div class="notifications-header">
              <h3>Powiadomienia</h3>
              <el-button 
                v-if="unreadNotifications > 0" 
                size="small" 
                @click="markAllAsRead"
                :loading="markingAllAsRead"
              >
                Oznacz wszystkie jako przeczytane
              </el-button>
            </div>
            
            <div v-if="notifications.length === 0" class="no-notifications">
              <Icon icon="mdi:bell-off" />
              <p>Brak powiadomień</p>
            </div>
            
            <div v-else class="notifications-list">
              <div 
                v-for="notification in notifications" 
                :key="notification.id" 
                class="notification-item"
                :class="{ unread: !notification.is_read }"
                @click="handleNotificationClick(notification)"
              >
                <div class="notification-content">
                  <div class="notification-text" v-html="notification.message"></div>
                  <div class="notification-time">
                    {{ formatRelativeTime(notification.created_at) }}
                  </div>
                </div>
                <div class="notification-actions">
                  <button 
                    v-if="!notification.is_read" 
                    class="mark-read-btn"
                    @click.stop="markAsRead(notification.id)"
                    title="Oznacz jako przeczytane"
                  >
                    <Icon icon="mdi:check" />
                  </button>
                </div>
              </div>
            </div>
            
            <div class="notifications-footer">
              <el-button type="text" @click="goToNotificationsPage">
                Zobacz wszystkie powiadomienia
              </el-button>
            </div>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ForumHeader',
  components: {
    Icon
  },
  props: {
    darkMode: Boolean,
    user: Object
  },
  emits: [
    'toggle-dark-mode', 
    'show-login', 
    'show-register', 
    'show-profile', 
    'show-admin-panel',
    'show-categories', 
    'logout'
  ],
  data() {
    return {
      notifications: [],
      notificationsInterval: null,
      loadingNotifications: false,
      markingAllAsRead: false
    };
  },
  computed: {
    unreadNotifications() {
      if (!Array.isArray(this.notifications)) {
        return 0;
      }
      return this.notifications.filter(n => !n.is_read).length;
    }
  },
  mounted() {
    if (this.user) {
      this.loadNotifications();
      this.startNotificationsPolling();
    }
  },
  beforeUnmount() {
    if (this.notificationsInterval) {
      clearInterval(this.notificationsInterval);
    }
  },
  methods: {
   
    async loadNotifications() {
      if (!this.user || this.loadingNotifications) return;
      
      this.loadingNotifications = true;
      try {
        const response = await axios.get('/notifications?limit=5');
        
        // Upewnij się, że zawsze mamy tablicę
        if (response.data && Array.isArray(response.data.items)) {
          this.notifications = response.data.items;
        } else if (Array.isArray(response.data)) {
          this.notifications = response.data;
        } else {
          this.notifications = [];
          console.error('Nieprawidłowy format odpowiedzi powiadomień:', response.data);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        this.notifications = []; // Ustaw pustą tablicę w przypadku błędu
      } finally {
        this.loadingNotifications = false;
      }
    },
    
    startNotificationsPolling() {
      // Sprawdzaj nowe powiadomienia co 30 sekund
      this.notificationsInterval = setInterval(() => {
        this.loadNotifications();
      }, 30000);
    },
    
    async markAsRead(notificationId) {
      try {
        await axios.put(`/notifications/${notificationId}/read`);
        // Zaktualizuj lokalnie
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.is_read = true;
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    
    async markAllAsRead() {
      try {
        await axios.put('/notifications/mark-all-read');
        // Zaktualizuj wszystkie lokalnie
        this.notifications.forEach(n => n.read = true);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    },
    
    handleNotificationClick(notification) {
      // Oznacz jako przeczytane
      if (!notification.is_read) {
        this.markAsRead(notification.id);
      }
      
      // Przekieruj do powiązanej zawartości
      if (notification.related_thread_id) {
        this.$emit('view-thread', notification.related_thread_id);
      }
      
      // Zamknij menu powiadomień
      document.body.click();
    },
    
    goToNotificationsPage() {
      this.$emit('show-notifications');
    },
    
    formatRelativeTime(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'teraz';
      if (diffMins < 60) return `${diffMins} min temu`;
      if (diffHours < 24) return `${diffHours} godz. temu`;
      if (diffDays === 1) return 'wczoraj';
      if (diffDays < 30) return `${diffDays} dni temu`;
      
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths === 1) return '1 miesiąc temu';
      return `${diffMonths} miesięcy temu`;
    }
  },
  watch: {
    user: {
      immediate: true,
      handler(newUser) {
        if (newUser) {
          this.loadNotifications();
          this.startNotificationsPolling();
        } else {
          if (this.notificationsInterval) {
            clearInterval(this.notificationsInterval);
            this.notificationsInterval = null;
          }
          this.notifications = [];
        }
      }
    }
  }
}
</script>

<style scoped>
.user-btn {
  padding: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.notification-btn {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--el-color-danger);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.notifications-menu {
  width: 350px;
  max-height: 400px;
  overflow-y: auto;
}

.notifications-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifications-header h3 {
  margin: 0;
  font-size: 16px;
}

.no-notifications {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
}

.no-notifications .iconify {
  font-size: 32px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.no-notifications p {
  margin: 0;
}

.notifications-list {
  padding: 0;
}

.notification-item {
  display: flex;
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: var(--el-fill-color-light);
}

.notification-item.unread {
  background-color: var(--el-color-primary-light-9);
}

.notification-content {
  flex: 1;
}

.notification-text {
  margin-bottom: 5px;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.notification-actions {
  display: flex;
  align-items: center;
}

.mark-read-btn {
  background: none;
  border: none;
  color: var(--el-color-primary);
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  opacity: 0.7;
}

.mark-read-btn:hover {
  opacity: 1;
  background-color: var(--el-fill-color);
}

.notifications-footer {
  padding: 10px 15px;
  text-align: center;
  border-top: 1px solid var(--el-border-color-light);
}

.view-all-link {
  color: var(--el-color-primary);
  text-decoration: none;
  font-size: 14px;
}

.view-all-link:hover {
  text-decoration: underline;
}
</style>
