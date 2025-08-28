<template>
  <div class="user-profile-page">
    <div class="profile-header">
      <el-button 
        icon="el-icon-arrow-left" 
        @click="$emit('back')" 
        class="back-btn"
      >
        Wróć
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
      <div v-else-if="user" class="profile-details">
        <div class="profile-card">
          <div class="avatar-section">
            <el-avatar 
              :size="120" 
              :src="user.avatar || '/default-avatar.png'"
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
                <el-button size="small" icon="el-icon-camera">
                  Zmień avatar
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
                icon="el-icon-edit" 
                @click="editProfile"
              >
                Edytuj profil
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
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UserProfilePage',
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
        threads: [],
        likes: []
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
      // Zakładając, że currentUser jest w props lub store
      return this.$parent.currentUser;
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
      
      try {
        const userId = this.userId || this.currentUser?.id;
        if (!userId) {
          this.error = 'Nie znaleziono użytkownika';
          return;
        }

        // Zakładając, że endpoint to /users/{id}
        const response = await axios.get(`/users/${userId}`);
        this.user = response.data;
        
        // Load user activity
        await this.loadUserActivity(userId);
      } catch (error) {
        console.error('Error loading user profile:', error);
        this.error = error.response?.data?.error || 'Błąd podczas ładowania profilu';
      } finally {
        this.loading = false;
      }
    },

    async loadUserActivity(userId) { 
      try {

        
        // Zakładając, że endpointy to:
        // /users/{id}/posts
        // /users/{id}/threads
        const [postsRes, threadsRes] = await Promise.all([
          axios.get(`/users/${userId}/posts`).catch(() => ({ data: [] })),
          axios.get(`/users/${userId}/threads`).catch(() => ({ data: [] }))
        ]);

        this.userActivity = {
          posts: postsRes.data || [],
          threads: threadsRes.data || [],
          likes: [] // Tymczasowo puste
        };
      } catch (error) {
        console.error('Error loading user activity:', error);
        this.userActivity = { posts: [], threads: [], likes: [] };
      }
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
      if (response.avatar) {
        this.user.avatar = response.avatar;
      }
      this.$message.success('Avatar został zaktualizowany');
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
        4: 'Gość'
      };
      return roles[roleId] || 'Użytkownik';
    },

    formatDate(dateString) {
      if (!dateString) return 'Nieznana';
      return new Date(dateString).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
      
      return this.formatDate(dateString);
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
    if (!this.userId && this.currentUser) {
      this.loadUserProfile();
    }
  }
};
</script>

<style scoped>
.user-profile-page {
  width: 100%;
  margin: 0 auto;
  padding: 20px;
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
}

.activity-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(31, 38, 135, 0.1);
}

.activity-content h4 {
  margin: 0 0 10px 0;
}

.thread-link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.thread-link:hover {
  text-decoration: underline;
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
}

.activity-time {
  color: var(--text-muted);
}

.activity-stats {
  color: var(--el-color-primary);
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
}
</style>
