<template>
  <div class="user-avatar" :class="[size, status]">
    <img 
      v-if="avatarUrl" 
      :src="avatarUrl" 
      :alt="user" 
      class="avatar-image"
      @error="handleImageError"
    >
    <div v-else class="avatar-image fallback">
      {{ getUserInitials(user) }}
    </div>
    <div class="status-indicator" :class="status"></div>
  </div>
</template>

<script>
export default {
  name: 'UserAvatar',
  props: {
    user: String,
    avatar: String,
    status: {
      type: String,
      default: 'offline'
    },
    size: {
      type: String,
      default: 'medium'
    }
  },
  computed: {
    avatarUrl() {
      if (!this.avatar) return null;
      if (this.avatar.startsWith('http')) {
        return this.avatar;
      }
      return this.avatar;
    }
  },
  methods: {
    getUserInitials(username) {
      if (!username) return '?';
      return username.charAt(0).toUpperCase();
    },
    handleImageError(event) {
      event.target.style.display = 'none';
      const fallback = event.target.parentElement.querySelector('.fallback');
      if (fallback) {
        fallback.style.display = 'flex';
      }
    }
  }
}
</script>

<style scoped>
.user-avatar {
  position: relative;
  display: inline-block;
}

.avatar-image {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  object-fit: cover;
}

.avatar-image.fallback {
  background: var(--gradient-primary);
  color: white;
}

.avatar-image img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.user-avatar.small .avatar-image {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.user-avatar.medium .avatar-image {
  width: 40px;
  height: 40px;
  font-size: 16px;
}

.user-avatar.large .avatar-image {
  width: 60px;
  height: 60px;
  font-size: 20px;
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.online {
  background: #67c23a;
}

.status-indicator.recent {
  background: #e6a23c;
}

.status-indicator.offline {
  background: var(--text-secondary);
}
</style>
