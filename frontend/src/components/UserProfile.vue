<template>
  <el-dialog v-model="visible" title="Profil użytkownika" width="500px">
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
          <p class="role">{{ user.role_name }}</p>
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
      }
    },
    user(newUser) {
      if (newUser) {
        this.editForm.email = newUser.email;
        this.editForm.signature = newUser.signature;
      }
    }
  },
  methods: {
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
        await axios.put('/api/profile', this.editForm);
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
            await axios.put('/api/change-password', this.passwordForm);
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
        // Możesz dodać automatyczne wylogowanie
        // this.$store.dispatch('logout');
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
</style>
