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
      
      <button class="control-btn">
        <Icon icon="mdi:bell-outline" />
      </button>
    </div>
  </header>
</template>

<script>
import { Icon } from "@iconify/vue";

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
  ]
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
</style>
