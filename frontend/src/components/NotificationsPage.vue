<template>
  <div class="notifications-page">
    <div class="page-header">
      <h2>
        <Icon icon="mdi:bell" />
        Twoje powiadomienia
      </h2>
      <div class="header-actions">
        <el-button 
          v-if="unreadCount > 0" 
          @click="markAllAsRead"
          :loading="markingAllAsRead"
        >
          Oznacz wszystkie jako przeczytane
        </el-button>
        <el-button @click="loadNotifications" :loading="loading">
          <Icon icon="mdi:refresh" />
          Odśwież
        </el-button>
      </div>
    </div>

    <div class="notifications-container">
      <div v-if="loading && notifications.length === 0" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <Icon icon="mdi:bell-off" class="empty-icon" />
        <h3>Brak powiadomień</h3>
        <p>Nie masz jeszcze żadnych powiadomień.</p>
      </div>

      <div v-else class="notifications-list">
        <div 
          v-for="notification in notifications" 
          :key="notification.id" 
          class="notification-item"
          :class="{ unread: !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon">
            <Icon :icon="getNotificationIcon(notification.type)" />
          </div>
          <div class="notification-content">
            <div class="notification-text" v-html="notification.message"></div>
            <div class="notification-time">
              {{ formatDateTime(notification.created_at) }}
            </div>
          </div>
          <div class="notification-actions">
            <el-button 
              v-if="!notification.read" 
              size="small" 
              @click.stop="markAsRead(notification.id)"
              title="Oznacz jako przeczytane"
            >
              <Icon icon="mdi:check" />
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click.stop="deleteNotification(notification.id)"
              title="Usuń powiadomienie"
            >
              <Icon icon="mdi:delete" />
            </el-button>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="totalPages > 1">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="totalItems"
          :page-size="pageSize"
          v-model:current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'NotificationsPage',
  components: { Icon },
  data() {
    return {
      notifications: [],
      loading: false,
      markingAllAsRead: false,
      currentPage: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0
    };
  },
  computed: {
    unreadCount() {
      return this.notifications.filter(n => !n.read).length;
    }
  },
  mounted() {
    this.loadNotifications();
  },
  methods: {
    async loadNotifications() {
      this.loading = true;
      try {
        const response = await axios.get('/notifications', {
          params: {
            page: this.currentPage,
            limit: this.pageSize
          }
        });
        
        this.notifications = response.data.items;
        this.totalItems = response.data.total;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
      } catch (error) {
        console.error('Error loading notifications:', error);
        this.$message.error('Błąd podczas ładowania powiadomień');
      } finally {
        this.loading = false;
      }
    },
    
    async markAsRead(notificationId) {
      try {
        await axios.put(`/notifications/${notificationId}/read`);
        // Zaktualizuj lokalnie
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
        }
        this.$message.success('Powiadomienie oznaczone jako przeczytane');
      } catch (error) {
        console.error('Error marking notification as read:', error);
        this.$message.error('Błąd podczas oznaczania powiadomienia');
      }
    },
    
    async markAllAsRead() {
      this.markingAllAsRead = true;
      try {
        await axios.put('/notifications/mark-all-read');
        // Zaktualizuj wszystkie lokalnie
        this.notifications.forEach(n => n.read = true);
        this.$message.success('Wszystkie powiadomienia oznaczone jako przeczytane');
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        this.$message.error('Błąd podczas oznaczania powiadomień');
      } finally {
        this.markingAllAsRead = false;
      }
    },
    
    async deleteNotification(notificationId) {
      try {
        await axios.delete(`/notifications/${notificationId}`);
        // Usuń lokalnie
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.$message.success('Powiadomienie usunięte');
      } catch (error) {
        console.error('Error deleting notification:', error);
        this.$message.error('Błąd podczas usuwania powiadomienia');
      }
    },
    
    handleNotificationClick(notification) {
      // Oznacz jako przeczytane jeśli nieprzeczytane
      if (!notification.read) {
        this.markAsRead(notification.id);
      }
      
      // Przekieruj do powiązanej zawartości
      if (notification.thread_id) {
        this.$router.push(`/thread/${notification.thread_id}`);
      } else if (notification.post_id) {
        this.$router.push(`/post/${notification.post_id}`);
      }
    },
    
    getNotificationIcon(type) {
      const icons = {
        'new_reply': 'mdi:message-reply',
        'thread_update': 'mdi:forum',
        'mention': 'mdi:at',
        'system': 'mdi:cog',
        'default': 'mdi:bell'
      };
      return icons[type] || icons.default;
    },
    
    formatDateTime(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      this.loadNotifications();
    }
  }
}
</script>

<style scoped>
.notifications-page {
  background: var(--card-bg);
  border-radius: 12px;
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

.loading-state {
  padding: 20px 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
}

.notifications-list {
  margin-bottom: 20px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 15px;
}

.notification-item:hover {
  background-color: var(--el-fill-color-light);
}

.notification-item.unread {
  background-color: var(--el-color-primary-light-9);
}

.notification-icon {
  font-size: 20px;
  color: var(--el-color-primary);
  flex-shrink: 0;
  margin-top: 2px;
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
  gap: 5px;
  flex-shrink: 0;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .notification-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .notification-actions {
    align-self: flex-end;
  }
}
</style>
