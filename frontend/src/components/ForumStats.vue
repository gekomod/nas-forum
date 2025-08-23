<template>
  <div class="forum-stats">
    <div class="stat-card">
      <div class="stat-value">{{ stats.threads.toLocaleString() }}</div>
      <div class="stat-label">Wątków</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.posts.toLocaleString() }}</div>
      <div class="stat-label">Postów</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.users.toLocaleString() }}</div>
      <div class="stat-label">Użytkowników</div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
export default {
  name: 'ForumStats',
  components: {
    Icon
  },
  props: {
    stats: Object
  }
}
</script>
