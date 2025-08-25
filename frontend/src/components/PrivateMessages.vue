<template>
  <div class="private-messages-container">
    <div class="pm-header">
      <h2>Wiadomości Prywatne</h2>
      <el-button 
        type="primary" 
        @click="showNewMessageDialog = true"
      >
        <Icon icon="mdi:email-plus"/> 
        Nowa wiadomość
      </el-button>
    </div>

    <div class="pm-content">
      <div class="conversations-list">
        <div class="conversations-header">
          <h3>Konwersacje</h3>
          <el-input
            v-model="searchQuery"
            placeholder="Szukaj konwersacji..."
            prefix-icon="Search"
            clearable
          />
        </div>

        <div v-if="loadingConversations" class="loading-conversations">
          <el-skeleton :rows="5" animated />
        </div>

        <div v-else-if="filteredConversations.length === 0" class="no-conversations">
          <Icon icon="mdi:email-off" />
          <p>Brak konwersacji</p>
        </div>

        <div v-else class="conversations">
          <div
            v-for="conversation in filteredConversations"
            :key="conversation.conversation_id"
            class="conversation-item"
            :class="{ 
              active: activeConversation === getOtherUser(conversation).id,
              unread: conversation.unread_count > 0
            }"
            @click="selectConversation(getOtherUser(conversation))"
          >
            <img 
              :src="getOtherUser(conversation).avatar || '/default-avatar.png'" 
              class="conversation-avatar"
            />
            <div class="conversation-info">
              <div class="conversation-header">
                <span class="conversation-name">{{ getOtherUser(conversation).username }}</span>
                <span class="conversation-time">
                  {{ formatRelativeTime(conversation.last_message_time) }}
                </span>
              </div>
              <div class="conversation-preview">
                {{ truncateText(conversation.content, 50) }}
              </div>
            </div>
            <div v-if="conversation.unread_count > 0" class="unread-badge">
              {{ conversation.unread_count }}
            </div>
          </div>
        </div>
      </div>

      <div class="messages-panel">
        <div v-if="activeConversation" class="messages-header">
          <div class="message-partner">
            <img 
              :src="getUserAvatar(activeConversation)" 
              class="partner-avatar"
            />
            <span class="partner-name">{{ getUserName(activeConversation) }}</span>
          </div>
          <el-button 
            type="danger" 
            size="small" 
            @click="confirmDeleteConversation"
          >
            <Icon icon="mdi:delete"/> 
            Usuń konwersację
          </el-button>
        </div>

        <div v-if="activeConversation" class="messages-container">
          <div v-if="loadingMessages" class="loading-messages">
            <el-skeleton :rows="3" animated />
          </div>

          <div v-else-if="messages.length === 0" class="no-messages">
            <p>Rozpocznij konwersację</p>
          </div>

          <div v-else class="messages-list">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message"
              :class="{ own: message.sender_id === currentUser.id }"
            >
              <img 
                :src="message.sender_avatar || '/default-avatar.png'" 
                class="message-avatar"
              />
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-time">
                  {{ formatMessageTime(message.created_at) }}
                </div>
              </div>
            </div>
          </div>

          <div class="message-input">
            <el-input
              v-model="newMessage"
              type="textarea"
              :rows="3"
              placeholder="Napisz wiadomość..."
              @keypress.enter="sendMessage"
            />
            <el-button 
              type="primary" 
              @click="sendMessage"
              :disabled="!newMessage.trim()"
              class="send-button"
            >
              Wyślij
            </el-button>
          </div>
        </div>

        <div v-else class="no-conversation-selected">
          <Icon icon="mdi:email-outline" />
          <p>Wybierz konwersację lub rozpocznij nową</p>
        </div>
      </div>
    </div>

    <!-- Dialog nowej wiadomości -->
    <el-dialog 
      v-model="showNewMessageDialog" 
      title="Nowa wiadomość"
      width="500px"
    >
      <el-form :model="newMessageForm" label-width="100px">
        <el-form-item label="Do:">
          <el-select
            v-model="newMessageForm.receiver_id"
            filterable
            remote
            reserve-keyword
            placeholder="Wpisz nazwę użytkownika"
            :remote-method="searchUsers"
            :loading="searchingUsers"
          >
            <el-option
              v-for="user in searchResults"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            >
              <div style="display: flex; align-items: center;">
                <img 
                  :src="user.avatar || '/default-avatar.png'" 
                  style="width: 20px; height: 20px; border-radius: 50%; margin-right: 10px;"
                />
                <span>{{ user.username }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="Wiadomość:">
          <el-input
            v-model="newMessageForm.content"
            type="textarea"
            :rows="4"
            placeholder="Treść wiadomości..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewMessageDialog = false">Anuluj</el-button>
        <el-button 
          type="primary" 
          @click="sendNewMessage"
          :disabled="!newMessageForm.receiver_id || !newMessageForm.content.trim()"
        >
          Wyślij
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import { Icon } from '@iconify/vue';

export default {
  name: 'PrivateMessages',
  components: {
    Icon
  },
  props: {
    currentUser: Object
  },
  data() {
    return {
      conversations: [],
      messages: [],
      activeConversation: null,
      newMessage: '',
      showNewMessageDialog: false,
      newMessageForm: {
        receiver_id: null,
        content: ''
      },
      searchResults: [],
      searchingUsers: false,
      searchQuery: '',
      loadingConversations: false,
      loadingMessages: false
    };
  },
  computed: {
    filteredConversations() {
      if (!this.searchQuery) return this.conversations;
      
      return this.conversations.filter(conv => {
        const otherUser = this.getOtherUser(conv);
        return otherUser.username.toLowerCase().includes(this.searchQuery.toLowerCase());
      });
    }
  },
  methods: {
    async loadConversations() {
      this.loadingConversations = true;
      try {
        const response = await axios.get('/private-messages/conversations');
        this.conversations = response.data;
      } catch (error) {
        console.error('Error loading conversations:', error);
        this.$message.error('Błąd podczas ładowania konwersacji');
      } finally {
        this.loadingConversations = false;
      }
    },
    async loadMessages(userId) {
      this.loadingMessages = true;
      try {
        const response = await axios.get(`/private-messages/conversation/${userId}`);
        this.messages = response.data;
        this.scrollToBottom();
      } catch (error) {
        console.error('Error loading messages:', error);
        this.$message.error('Błąd podczas ładowania wiadomości');
      } finally {
        this.loadingMessages = false;
      }
    },
    async sendMessage() {
      if (!this.newMessage.trim() || !this.activeConversation) return;
      
      try {
        await axios.post('/private-messages/send', {
          receiver_id: this.activeConversation,
          content: this.newMessage.trim()
        });
        
        this.newMessage = '';
        await this.loadMessages(this.activeConversation);
        await this.loadConversations(); // Odśwież listę konwersacji
      } catch (error) {
        console.error('Error sending message:', error);
        this.$message.error('Błąd podczas wysyłania wiadomości');
      }
    },
    async sendNewMessage() {
      try {
        await axios.post('/private-messages/send', this.newMessageForm);
        
        this.$message.success('Wiadomość została wysłana');
        this.showNewMessageDialog = false;
        this.newMessageForm = { receiver_id: null, content: '' };
        await this.loadConversations();
        
        // Otwórz nową konwersację
        this.selectConversation({ id: this.newMessageForm.receiver_id });
      } catch (error) {
        console.error('Error sending new message:', error);
        this.$message.error('Błąd podczas wysyłania wiadomości');
      }
    },
    async searchUsers(query) {
      if (!query) {
        this.searchResults = [];
        return;
      }
      
      this.searchingUsers = true;
      try {
        const response = await axios.get(`/users/search?q=${encodeURIComponent(query)}`);
        this.searchResults = response.data.filter(user => user.id !== this.currentUser.id);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        this.searchingUsers = false;
      }
    },
    selectConversation(user) {
      this.activeConversation = user.id;
      this.loadMessages(user.id);
    },
    getOtherUser(conversation) {
      return conversation.sender_id === this.currentUser.id 
        ? { 
            id: conversation.receiver_id, 
            username: conversation.receiver_username,
            avatar: conversation.receiver_avatar
          }
        : { 
            id: conversation.sender_id, 
            username: conversation.sender_username,
            avatar: conversation.sender_avatar
          };
    },
    getUserAvatar(userId) {
      const conversation = this.conversations.find(conv => 
        conv.sender_id === userId || conv.receiver_id === userId
      );
      
      if (!conversation) return '/default-avatar.png';
      
      return this.getOtherUser(conversation).avatar || '/default-avatar.png';
    },
    getUserName(userId) {
      const conversation = this.conversations.find(conv => 
        conv.sender_id === userId || conv.receiver_id === userId
      );
      
      if (!conversation) return 'Nieznany użytkownik';
      
      return this.getOtherUser(conversation).username;
    },
    async confirmDeleteConversation() {
      try {
        await this.$confirm(
          'Czy na pewno chcesz usunąć tę konwersację? Tej operacji nie można cofnąć.',
          'Potwierdzenie usunięcia',
          {
            confirmButtonText: 'Tak, usuń',
            cancelButtonText: 'Anuluj',
            type: 'warning'
          }
        );
        
        await this.deleteConversation();
      } catch (error) {
        // Anulowano
      }
    },
    async deleteConversation() {
      try {
        await axios.delete(`/private-messages/conversation/${this.activeConversation}`);
        
        this.$message.success('Konwersacja została usunięta');
        this.activeConversation = null;
        this.messages = [];
        await this.loadConversations();
      } catch (error) {
        console.error('Error deleting conversation:', error);
        this.$message.error('Błąd podczas usuwania konwersacji');
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$el.querySelector('.messages-list');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    formatRelativeTime(dateString) {
      // ... istniejąca implementacja ...
    },
    formatMessageTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    },
    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    }
  },
  mounted() {
    if (this.currentUser) {
      this.loadConversations();
    }
  },
  watch: {
    currentUser: {
      immediate: true,
      handler(user) {
        if (user) {
          this.loadConversations();
        }
      }
    }
  }
};
</script>

<style scoped>
.private-messages-container {
  padding: 20px;
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(31, 38, 135, 0.1);
}

.pm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pm-content {
  display: flex;
  gap: 20px;
  height: 600px;
}

.conversations-list {
  width: 300px;
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
}

.conversations-header {
  padding: 10px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.conversations {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s;
  position: relative;
}

.conversation-item:hover {
  background-color: var(--el-fill-color-light);
}

.conversation-item.active {
  background-color: var(--el-color-primary-light-9);
}

.conversation-item.unread {
  background-color: var(--el-color-primary-light-9);
}

.conversation-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
  object-fit: cover;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.conversation-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.conversation-preview {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  background: var(--el-color-primary);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.messages-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.message-partner {
  display: flex;
  align-items: center;
}

.partner-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
  object-fit: cover;
}

.partner-name {
  font-weight: 500;
}

.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message {
  display: flex;
  margin-bottom: 15px;
}

.message.own {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin: 0 10px;
  object-fit: cover;
}

.message-content {
  max-width: 70%;
  background: var(--el-fill-color-light);
  padding: 10px;
  border-radius: 8px;
  position: relative;
}

.message.own .message-content {
  background: var(--el-color-primary-light-9);
}

.message-text {
  margin-bottom: 5px;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

.message-input {
  padding: 10px;
  border-top: 1px solid var(--el-border-color-light);
}

.send-button {
  margin-top: 10px;
  width: 100%;
}

.no-conversation-selected,
.no-conversations,
.no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-secondary);
}

.no-conversation-selected .iconify,
.no-conversations .iconify,
.no-messages .iconify {
  font-size: 48px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.loading-conversations,
.loading-messages {
  padding: 20px;
}
</style>
