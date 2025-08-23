<template>
  <div class="user-avatar" :class="[size, status]">
    <div class="avatar-image">
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
    status: {
      type: String,
      default: 'offline'
    },
    size: {
      type: String,
      default: 'medium'
    }
  },
  methods: {
    getUserInitials(username) {
      if (!username) return '?';
      return username.charAt(0).toUpperCase();
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
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
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