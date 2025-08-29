<template>
  <div class="user-profile-page">
    <div class="profile-header">
      <el-button 
        @click="$emit('back')" 
        class="back-btn"
      >
       <Icon icon="f7:arrow-left" /> Wróć
      </el-button>
      <h1>Profil użytkownika</h1>
    </div>

    <div class="profile-content">
      <!-- Loading state -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="error-container">
        <el-alert
          :title="error"
          type="error"
          show-icon
          closable
          @close="error = ''"
        />
        <el-button @click="loadUserProfile" type="primary">
          Spróbuj ponownie
        </el-button>
      </div>

      <!-- Profile content -->
      <div v-else-if="user && user.id" class="profile-details">
        <div class="profile-card">
          <div class="avatar-section">
            <el-avatar 
              :size="120" 
              :src="getAvatarUrl(user.avatar)" 
              class="profile-avatar"
            />
            <div class="avatar-actions" v-if="isOwnProfile">
              <el-upload
                action="/api/upload-avatar"
                :show-file-list="false"
                :before-upload="beforeAvatarUpload"
                :on-success="handleAvatarSuccess"
                :on-error="handleAvatarError"
                :headers="uploadHeaders"
              >
                <el-button size="small">
                 <Icon icon="fluent-color:camera-16" /> Zmień avatar
                </el-button>
              </el-upload>
            </div>
          </div>

          <div class="profile-info">
            <h2 class="username">{{ user.username }}</h2>
            
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-number">{{ user.posts_count || 0 }}</span>
                <span class="stat-label">Posty</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ user.threads_count || 0 }}</span>
                <span class="stat-label">Wątki</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ user.reputation || 0 }}</span>
                <span class="stat-label">Reputacja</span>
              </div>
            </div>

            <div class="profile-details-grid">
              <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ user.email || 'Niepubliczny' }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Data rejestracji:</span>
                <span class="detail-value">{{ formatDate(user.created_at) }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Ostatnia aktywność:</span>
                <span class="detail-value">{{ formatDate(user.last_activity_at) }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Rola:</span>
                <span class="detail-value" :class="'role-' + (user.role_id || 3)">
                  {{ getUserRole(user.role_id) }}
                </span>
              </div>
              
              <div v-if="user.location" class="detail-item">
                <span class="detail-label">Lokalizacja:</span>
                <span class="detail-value">{{ user.location }}</span>
              </div>
              
              <div v-if="user.website" class="detail-item">
                <span class="detail-label">Strona WWW:</span>
                <a :href="ensureHttp(user.website)" target="_blank" class="detail-value link">
                  {{ user.website }}
                </a>
              </div>
              
              <div v-if="user.bio" class="detail-item full-width">
                <span class="detail-label">O mnie:</span>
                <p class="detail-value biography">{{ user.bio }}</p>
              </div>
            </div>

            <div class="profile-actions" v-if="isOwnProfile">
              <el-button 
                type="primary" 
                @click="editProfile"
              >
               <Icon icon="fluent-color:edit-16" /> Edytuj profil
              </el-button>
            </div>
          </div>
        </div>

        <!-- User activity tabs -->
        <div class="activity-tabs">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="Ostatnie posty" name="posts">
              <div v-if="userActivity.posts.length === 0" class="empty-state">
                <el-empty description="Brak postów" />
              </div>
              <div v-else class="activity-list">
                <div 
                  v-for="post in userActivity.posts" 
                  :key="post.id" 
                  class="activity-item"
                  @click="viewThread(post.thread_id)"
                >
                  <div class="activity-content">
                    <h4>{{ post.thread_title || 'Bez tytułu' }}</h4>
                    <p class="post-content">{{ truncateContent(post.content, 200) }}</p>
                    <div class="activity-meta">
                      <span class="activity-time">
                        {{ formatRelativeTime(post.created_at) }}
                      </span>
                      <span class="activity-category" v-if="post.category_name">
                        w {{ post.category_name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="Utworzone wątki" name="threads">
              <div v-if="userActivity.threads.length === 0" class="empty-state">
                <el-empty description="Brak wątków" />
              </div>
              <div v-else class="activity-list">
                <div 
                  v-for="thread in userActivity.threads" 
                  :key="thread.id" 
                  class="activity-item"
                  @click="viewThread(thread.id)"
                >
                  <div class="activity-content">
                    <h4>{{ thread.title }}</h4>
                    <div class="activity-meta">
                      <span class="activity-time">
                        {{ formatRelativeTime(thread.created_at) }}
                      </span>
                      <span class="activity-stats">
                        {{ thread.posts_count }} postów
                      </span>
                      <span class="activity-category" v-if="thread.category_name">
                        w {{ thread.category_name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            
      <el-tab-pane label="Osiągnięcia" name="achievements">
        <AchievementsSystem 
          :userId="userId" 
          :currentUser="userProfile"
        />
      </el-tab-pane>
      
          </el-tabs>
        </div>
      </div>

      <!-- User not found -->
      <div v-else-if="!loading" class="user-not-found">
        <el-empty description="Użytkownik nie znaleziony" />
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { Icon } from "@iconify/vue";
import AchievementsSystem from './AchievementsSystem.vue';

export default {
  name: 'UserProfilePage',
  components: {
    Icon,
    AchievementsSystem
  },
  props: {
    userId: {
      type: [String, Number],
      default: null
    }
  },
  data() {
    return {
      user: null,
      userActivity: {
        posts: [],
        threads: []
      },
      loading: true,
      error: '',
      activeTab: 'posts',
      uploadHeaders: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    };
  },
  computed: {
    currentUser() {
      // Pobierz currentUser z localStorage lub z głównego komponentu
      try {
        return JSON.parse(localStorage.getItem('userData') || '{}');
      } catch (e) {
        return {};
      }
    },
    isOwnProfile() {
      if (!this.user || !this.currentUser) return false;
      return this.user.id === this.currentUser.id;
    }
  },
  watch: {
    userId: {
      immediate: true,
      handler(newUserId) {
        if (newUserId) {
          this.loadUserProfile();
        }
      }
    }
  },
  methods: {
    async loadUserProfile() {
      this.loading = true;
      this.error = '';
      this.user = null;
      
      try {
        const userId = this.userId;
        if (!userId) {
          this.error = 'Nie znaleziono użytkownika';
          return;
        }
        
        // Użyj istniejącego endpointu /users/:id
        const response = await axios.get(`/users/${userId}`);
        
        if (response.data && response.data.id) {
          this.user = response.data;
          await this.loadUserActivity();
        } else {
          this.error = 'Użytkownik nie znaleziony';
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        if (error.response?.status === 404) {
          this.error = 'Użytkownik nie znaleziony';
        } else {
          this.error = error.response?.data?.error || 'Błąd podczas ładowania profilu';
        }
      } finally {
        this.loading = false;
      }
    },

    async loadUserActivity() {
      try {
        const userId = this.user.id;
        
        // Użyj endpointów z Twojego API
        const [postsResponse, threadsResponse] = await Promise.all([
          axios.get(`/users/${userId}/posts`).catch(error => {
            console.error('Error loading posts:', error);
            return { data: [] };
          }),
          axios.get(`/users/${userId}/threads`).catch(error => {
            console.error('Error loading threads:', error);
            return { data: [] };
          })
        ]);

        this.userActivity = {
          posts: postsResponse.data || [],
          threads: threadsResponse.data || []
        };
      } catch (error) {
        console.error('Error loading user activity:', error);
        this.userActivity = { posts: [], threads: [] };
      }
    },

    getAvatarUrl(avatarPath) {
      if (!avatarPath) return '/default-avatar.png';
      if (avatarPath.startsWith('http')) return avatarPath;
      return avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
    },

    beforeAvatarUpload(file) {
      const isJPG = file.type === 'image/jpeg' || file.type === 'image/png';
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isJPG) {
        this.$message.error('Avatar musi być w formacie JPG lub PNG!');
        return false;
      }
      if (!isLt2M) {
        this.$message.error('Rozmiar avatara nie może przekraczać 2MB!');
        return false;
      }
      return true;
    },

    handleAvatarSuccess(response, file) {
      if (response.avatarUrl) {
        this.user.avatar = response.avatarUrl;
        this.$message.success('Avatar został zaktualizowany');
      }
    },

    handleAvatarError(error) {
      console.error('Avatar upload error:', error);
      this.$message.error('Błąd podczas przesyłania avatara');
    },

    editProfile() {
      this.$emit('edit-profile');
    },

    viewThread(threadId) {
      this.$emit('view-thread', threadId);
    },

    getUserRole(roleId) {
      const roles = {
        1: 'Administrator',
        2: 'Moderator',
        3: 'Użytkownik',
        4: 'Zbanowany',
        5: 'VIP',
        6: 'Redaktor'
      };
      return roles[roleId] || 'Użytkownik';
    },

    formatDate(dateString) {
      if (!dateString) return 'Nieznana';
      try {
        return new Date(dateString).toLocaleDateString('pl-PL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return dateString;
      }
    },

    formatRelativeTime(dateString) {
      if (!dateString) return '';
      
      try {
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
        
        return this.formatDate(dateString);
      } catch (e) {
        return dateString;
      }
    },

    truncateContent(content, length) {
      if (!content) return '';
      if (content.length <= length) return content;
      return content.substring(0, length) + '...';
    },

    ensureHttp(url) {
      if (!url) return '#';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
      }
      return url;
    }
  },
  mounted() {
    if (!this.userId && this.currentUser && this.currentUser.id) {
      this.loadUserProfile();
    }
  }
};
</script>

<style scoped>
.user-profile-page {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.back-btn {
  margin-right: 15px;
}

.profile-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(31, 38, 135, 0.1);
  backdrop-filter: blur(10px);
}

.profile-card {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.profile-avatar {
  border: 4px solid var(--el-color-primary);
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
}

.profile-info {
  flex: 1;
  min-width: 300px;
}

.username {
  font-size: 28px;
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.user-stats {
  display: flex;
  gap: 30px;
  margin-bottom: 25px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 5px;
}

.detail-value {
  color: var(--text-primary);
}

.biography {
  line-height: 1.6;
  margin: 0;
}

.link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.role-1 {
  color: #f56c6c;
  font-weight: bold;
}

.role-2 {
  color: #e6a23c;
  font-weight: bold;
}

.role-3 {
  color: #67c23a;
}

.role-4 {
  color: #909399;
  font-style: italic;
}

.role-5 {
  color: #ffc107;
  font-weight: bold;
}

.role-6 {
  color: #9c27b0;
  font-weight: bold;
}

.profile-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.activity-tabs {
  margin-top: 30px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid var(--card-border);
  transition: all 0.3s ease;
  cursor: pointer;
}

.activity-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(31, 38, 135, 0.1);
}

.activity-content h4 {
  margin: 0 0 10px 0;
  color: var(--el-color-primary);
}

.post-content {
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 10px 0;
}

.activity-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.activity-time {
  color: var(--text-muted);
}

.activity-stats {
  color: var(--el-color-primary);
}

.activity-category {
  color: var(--el-color-success);
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.loading-container,
.error-container {
  padding: 40px 0;
  text-align: center;
}

.error-container .el-alert {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  
  .user-stats {
    justify-content: center;
  }
  
  .profile-details-grid {
    grid-template-columns: 1fr;
  }
  
  .profile-actions {
    justify-content: center;
  }
  
  .activity-meta {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
