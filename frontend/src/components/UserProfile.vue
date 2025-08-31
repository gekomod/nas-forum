<template>
  <el-dialog v-model="visible" title="Profil użytkownika" width="600px">
    <div v-if="user" class="profile-content">
      <div class="profile-header">
        <div class="avatar-container">
          <img :src="user.avatar || '/default-avatar.png'" class="avatar" />
          <el-upload
            :action="uploadAction"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :on-error="handleAvatarError"
            :before-upload="beforeAvatarUpload"
            name="avatar">
            <el-button size="small">Zmień avatar</el-button>
          </el-upload>
        </div>
        <div class="user-info">
          <h3>{{ user.username }}<div class="status-indicator" :class="statusClass"></div></h3>
          <p class="role">{{ user.role_names || 'Użytkownik' }}</p>
          <p>Dołączył: {{ formatDate(user.created_at) }}</p>
          <p v-if="user.last_login">
            Ostatnia aktywność: {{ formatDate(user.last_login) }}
            <span class="status-text">({{ statusText }})</span>
          </p>
        </div>
      </div>
      
      <el-tabs v-model="activeTab" class="profile-tabs">
        <el-tab-pane label="Edycja profilu" name="edit">
          <el-form :model="editForm" label-width="100px">
            <el-form-item label="Email">
              <el-input v-model="editForm.email"></el-input>
            </el-form-item>
            <el-form-item label="Sygnatura">
              <el-input 
                v-model="editForm.signature" 
                type="textarea" 
                :rows="2" 
                placeholder="Krótka sygnatura pod twoimi postami">
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updateProfile">Zapisz zmiany</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="Zmiana hasła" name="password">
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordForm" label-width="100px">
            <el-form-item label="Obecne hasło" prop="currentPassword">
              <el-input v-model="passwordForm.currentPassword" type="password"></el-input>
            </el-form-item>
            <el-form-item label="Nowe hasło" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password"></el-input>
            </el-form-item>
            <el-form-item label="Powtórz hasło" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword">Zmień hasło</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="Powiadomienia" name="notifications">
          <el-form :model="notificationForm" label-width="200px">
            <el-form-item label="Powiadomienia email">
              <el-switch 
                v-model="notificationForm.email_notifications" 
                :active-value="1" 
                :inactive-value="0">
              </el-switch>
            </el-form-item>
            <el-form-item label="Powiadomienia push">
              <el-switch 
                v-model="notificationForm.push_notifications" 
                :active-value="1" 
                :inactive-value="0">
              </el-switch>
            </el-form-item>
            <el-form-item label="Powiadomienia o odpowiedziach">
              <el-switch 
                v-model="notificationForm.notify_on_reply" 
                :active-value="1" 
                :inactive-value="0">
              </el-switch>
            </el-form-item>
            <el-form-item label="Powiadomienia o wzmiankach">
              <el-switch 
                v-model="notificationForm.notify_on_mention" 
                :active-value="1" 
                :inactive-value="0">
              </el-switch>
            </el-form-item>
            <el-form-item label="Powiadomienia o aktualizacjach wątków">
              <el-switch 
                v-model="notificationForm.notify_on_thread_update" 
                :active-value="1" 
                :inactive-value="0">
              </el-switch>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updateNotificationSettings">Zapisz ustawienia</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="Wiadomości Prywatne" name="privateMessages">
          <div class="private-messages">
            <div class="pm-header">
              <h3>Ustawienia Wiadomości Prywatnych</h3>
              <el-button 
                type="primary" 
                size="small" 
                @click="sendPrivateMessage">
                Wyślij wiadomość
              </el-button>
            </div>
            
            <el-form :model="pmSettingsForm" label-width="200px">
              <el-form-item label="Akceptuj wiadomości prywatne">
                <el-switch 
                  v-model="pmSettingsForm.allow_private_messages" 
                  :active-value="1" 
                  :inactive-value="0">
                </el-switch>
              </el-form-item>
              <el-form-item label="Powiadomienia o nowych wiadomościach">
                <el-switch 
                  v-model="pmSettingsForm.notify_on_pm" 
                  :active-value="1" 
                  :inactive-value="0">
                </el-switch>
              </el-form-item>
              <el-form-item label="Automatyczne zapisywanie kopii wysłanych">
                <el-switch 
                  v-model="pmSettingsForm.save_sent_messages" 
                  :active-value="1" 
                  :inactive-value="0">
                </el-switch>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="updatePmSettings">Zapisz ustawienia</el-button>
              </el-form-item>
            </el-form>
            
            <div class="pm-stats" v-if="pmStats">
              <el-divider></el-divider>
              <h4>Statystyki wiadomości</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Odebrane</span>
                  <span class="stat-value">{{ pmStats.received_count }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Wysłane</span>
                  <span class="stat-value">{{ pmStats.sent_count }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Nieprzeczytane</span>
                  <span class="stat-value">{{ pmStats.unread_count }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Zapisane</span>
                  <span class="stat-value">{{ pmStats.saved_count }}</span>
                </div>
              </div>
              <el-button 
                type="text" 
                @click="goToMessages"
                class="view-all-btn">
                Zobacz wszystkie wiadomości →
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script>
import axios from "axios";

export default {
  name: 'UserProfile',
  props: {
    show: Boolean,
    user: Object,
    isCurrentUser: Boolean
  },
  data() {
    const validatePassword = (rule, value, callback) => {
      if (value !== this.passwordForm.newPassword) {
        callback(new Error('Hasła nie są identyczne'));
      } else {
        callback();
      }
    };
    
    return {
      visible: this.show,
      activeTab: 'edit',
      editForm: {
        email: '',
        signature: ''
      },
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      notificationForm: {
        email_notifications: 0,
        push_notifications: 0,
        notify_on_reply: 0,
        notify_on_mention: 0,
        notify_on_thread_update: 0
      },
      pmSettingsForm: {
        allow_private_messages: 1,
        notify_on_pm: 1,
        save_sent_messages: 1
      },
      pmStats: null,
      passwordRules: {
        currentPassword: [
          { required: true, message: 'Obecne hasło jest wymagane', trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: 'Nowe hasło jest wymagane', trigger: 'blur' },
          { min: 6, message: 'Hasło musi mieć co najmniej 6 znaków', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: 'Proszę powtórzyć hasło', trigger: 'blur' },
          { validator: validatePassword, trigger: 'blur' }
        ]
      },
      uploadAction: '/api/upload-avatar'
    };
  },
  computed: {
    status() {
      return this.getUserStatus(this.user.last_login, this.isCurrentUser);
    },
    statusClass() {
      return `status-${this.status}`;
    },
    statusText() {
      const texts = {
        'online': 'Online',
        'recent': 'Ostatnio aktywny',
        'offline': 'Offline'
      };
      return texts[this.status];
    },
    uploadHeaders() {
      const token = localStorage.getItem('authToken') || '';
      return {
        'Authorization': `Bearer ${token}`
      };
    }
  },
  watch: {
    show(newVal) {
      this.visible = newVal;
      if (newVal && this.user) {
        this.editForm.email = this.user.email;
        this.editForm.signature = this.user.signature;
        
        // Załaduj ustawienia powiadomień, jeśli dostępne
        this.loadNotificationSettings();
        
        // Załaduj ustawienia wiadomości prywatnych
        this.loadPmSettings();
        
        // Załaduj statystyki wiadomości
        this.loadPmStats();
      }
    },
    user(newUser) {
      if (newUser) {
        this.editForm.email = newUser.email;
        this.editForm.signature = newUser.signature;
        
        // Załaduj ustawienia powiadomień, jeśli dostępne
        this.loadNotificationSettings();
        
        // Załaduj ustawienia wiadomości prywatnych
        this.loadPmSettings();
        
        // Załaduj statystyki wiadomości
        this.loadPmStats();
      }
    }
  },
  methods: {
    sendPrivateMessage() {
      this.$emit('send-private-message', this.user);
      this.visible = false;
    },
    async loadNotificationSettings() {
      try {
        const response = await axios.get('/notification-settings');
        if (response.data) {
          // Ustaw wartości z bazy danych lub domyślne 0
          this.notificationForm = {
            email_notifications: response.data.email_notifications || 0,
            push_notifications: response.data.push_notifications || 0,
            notify_on_reply: response.data.notify_on_reply || 0,
            notify_on_mention: response.data.notify_on_mention || 0,
            notify_on_thread_update: response.data.notify_on_thread_update || 0
          };
        }
      } catch (error) {
        console.error('Błąd ładowania ustawień powiadomień:', error);
        // W przypadku błędu ustaw domyślne wartości
        this.notificationForm = {
          email_notifications: 0,
          push_notifications: 0,
          notify_on_reply: 0,
          notify_on_mention: 0,
          notify_on_thread_update: 0
        };
      }
    },
    
    async loadPmSettings() {
  try {
    const response = await axios.get('/pm-settings');
    if (response.data) {
      this.pmSettingsForm = {
        allow_private_messages: response.data.allow_private_messages || 1,
        notify_on_pm: response.data.notify_on_pm || 1,
        save_sent_messages: response.data.save_sent_messages || 1
      };
    }
  } catch (error) {
    console.error('Błąd ładowania ustawień wiadomości prywatnych:', error);
    // Ustaw domyślne wartości w przypadku błędu
    this.pmSettingsForm = {
      allow_private_messages: 1,
      notify_on_pm: 1,
      save_sent_messages: 1
    };
  }
},
    
async loadPmStats() {
  try {
    const response = await axios.get('/pm-stats');
    if (response.data) {
      this.pmStats = response.data;
    }
  } catch (error) {
    console.error('Błąd ładowania statystyk wiadomości:', error);
    // Ustaw domyślne wartości w przypadku błędu
    this.pmStats = {
      received_count: 0,
      sent_count: 0,
      unread_count: 0,
      saved_count: 0
    };
  }
},
    
    async updatePmSettings() {
      try {
        const payload = {
          allow_private_messages: Number(this.pmSettingsForm.allow_private_messages),
          notify_on_pm: Number(this.pmSettingsForm.notify_on_pm),
          save_sent_messages: Number(this.pmSettingsForm.save_sent_messages)
        };
        
        await axios.put('/pm-settings', payload);
        this.$message.success('Ustawienia wiadomości prywatnych zostały zaktualizowane');
        this.$emit('profile-updated');
      } catch (error) {
        console.error('Błąd zapisu ustawień wiadomości:', error);
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas zapisywania ustawień');
      }
    },
    
    composeNewMessage() {
      this.$emit('compose-pm', this.user);
      this.visible = false;
    },
    
    goToMessages() {
      this.$emit('navigate-to-messages');
      this.visible = false;
    },
    
    getUserStatus(lastLogin, isCurrentUser) {
      if (!lastLogin) return 'offline';
      
      // Obecnie zalogowany użytkownik jest zawsze online
      if (isCurrentUser) {
        return 'online';
      }
      
      try {
        const lastActive = new Date(lastLogin);
        if (isNaN(lastActive.getTime())) return 'offline';
        
        const now = new Date();
        const diffMinutes = (now - lastActive) / (1000 * 60);
        
        if (diffMinutes < 5) return 'online';
        if (diffMinutes < 1440) return 'recent';
        return 'offline';
      } catch (error) {
        return 'offline';
      }
    },
    
    formatDate(date) {
      return new Date(date).toLocaleString('pl-PL');
    },
    
    async updateProfile() {
      try {
        await axios.put('/profile', this.editForm);
        this.$message.success('Profil zaktualizowany pomyślnie');
        this.$emit('profile-updated');
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd');
      }
    },
    
    changePassword() {
      this.$refs.passwordForm.validate(async (valid) => {
        if (valid) {
          try {
            await axios.put('/change-password', this.passwordForm);
            this.$message.success('Hasło zostało zmienione');
            this.passwordForm = {
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            };
          } catch (error) {
            this.$message.error(error.response?.data?.error || 'Wystąpił błąd');
          }
        }
      });
    },
    
    async updateNotificationSettings() {
      try {
        // Konwersja wartości na liczby (dla bezpieczeństwa)
        const payload = {
          email_notifications: Number(this.notificationForm.email_notifications),
          push_notifications: Number(this.notificationForm.push_notifications),
          notify_on_reply: Number(this.notificationForm.notify_on_reply),
          notify_on_mention: Number(this.notificationForm.notify_on_mention),
          notify_on_thread_update: Number(this.notificationForm.notify_on_thread_update)
        };
        
        await axios.put('/notification-settings', payload);
        this.$message.success('Ustawienia powiadomień zostały zaktualizowane');
        this.$emit('profile-updated');
      } catch (error) {
        console.error('Błąd zapisu ustawień:', error);
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas zapisywania ustawień');
      }
    },
    
    handleAvatarSuccess(response) {
      if (response.success) {
        this.user.avatar = response.url;
        this.$message.success('Avatar został zaktualizowany');
        this.$emit('profile-updated');
      } else {
        this.$message.error(response.message || 'Wystąpił błąd podczas przesyłania avatara');
      }
    },
    
    handleAvatarError(error) {
      console.error('Avatar upload error:', error);
      
      // Sprawdź, czy to błąd autoryzacji
      if (error.status === 401) {
        this.$message.error('Sesja wygasła. Zaloguj się ponownie.');
      } else {
        this.$message.error('Wystąpił błąd podczas przesyłania avatara');
      }
    },
    
    beforeAvatarUpload(file) {
      const isJPGOrPNG = file.type === 'image/jpeg' || file.type === 'image/png';
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isJPGOrPNG) {
        this.$message.error('Avatar musi być w formacie JPG lub PNG!');
        return false;
      }
      if (!isLt2M) {
        this.$message.error('Rozmiar avatara nie może przekraczać 2MB!');
        return false;
      }

      // Sprawdź czy użytkownik jest zalogowany
      const token = localStorage.getItem('authToken');
      if (!token) {
        this.$message.error('Musisz być zalogowany, aby zmienić avatar');
        return false;
      }

      return true;
    }
  }
}
</script>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-container {
  margin-right: 20px;
  text-align: center;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.user-info h3 {
  margin: 0 0 5px 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.role {
  color: var(--el-color-primary);
  font-weight: 500;
  margin: 0 0 10px 0;
}

.profile-tabs {
  margin-top: 20px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  margin-left: 10px;
}

.status-online {
  background-color: #52c41a;
}

.status-recent {
  background-color: #faad14;
}

.status-offline {
  background-color: #d9d9d9;
}

.status-text {
  font-weight: 500;
  margin-left: 5px;
}

.private-messages {
  padding: 10px 0;
}

.pm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pm-header h3 {
  margin: 0;
}

.pm-stats {
  margin-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin: 15px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
}

.view-all-btn {
  margin-top: 10px;
  width: 100%;
  text-align: center;
}

.el-divider {
  margin: 20px 0;
}
</style>
