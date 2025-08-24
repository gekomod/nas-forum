<template>
  <div class="categories-container">
    <h2 class="categories-title">
      <Icon icon="mdi:view-grid" />
      Kategorie Forum
    </h2>
    <ul class="category-list">
      <li v-for="category in sortedCategories" :key="category.id" class="category-item" :class="{ locked: category.is_locked }">
        <div class="category-icon">
          <Icon :icon="category.icon" />
          <div class="lock-indicator" v-if="category.is_locked">
            <Icon icon="mdi:lock" />
          </div>
        </div>
        <div class="category-content">
          <div class="category-header">
            <a href="#" class="category-name" @click.prevent="handleCategoryClick(category)">
              {{ category.name }}
            </a>
            <el-tag v-if="category.is_locked" type="danger" size="small" effect="plain">
              <Icon icon="mdi:lock" />
              Zablokowana
            </el-tag>
            <el-tag v-else-if="category.required_role > 0" :type="getRoleType(category.required_role)" size="small" effect="plain">
              {{ getRoleName(category.required_role) }}
            </el-tag>
          </div>
          <div class="category-desc">{{ category.description }}</div>
        </div>
        
        <!-- Statystyki kategorii -->
        <div class="category-stats">
          <div class="category-stat">
            <Icon icon="mdi:comment-text" />
            {{ category.threads }} wątków
          </div>
          <div class="category-stat">
            <Icon icon="mdi:message-reply" />
            {{ category.posts }} postów
          </div>
        </div>
        
        <!-- Ostatni post -->
        <div class="category-lastpost" v-if="category.last_post_author && category.last_post_author !== 'Brak'">
          <div class="lastpost-info">
            <div class="lastpost-author">
              <Icon icon="mdi:account" />
              {{ category.last_post_author }}
            </div>
            <div class="lastpost-time">{{ category.last_post_time }}</div>
          </div>
        </div>
        <div class="category-lastpost" v-else>
          <div class="lastpost-info">
            <div class="lastpost-time">Brak aktywności</div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'CategoriesList',
  components: {
    Icon
  },
  props: {
    categories: Array,
    currentUser: Object
  },
  computed: {
    sortedCategories() {
      return [...this.categories].sort((a, b) => {
        // Sortuj najpierw po pozycji, potem po nazwie
        const posA = a.position || 999;
        const posB = b.position || 999;
        
        if (posA !== posB) {
          return posA - posB;
        }
        return a.name.localeCompare(b.name);
      });
    }
  },
  methods: {
    handleCategoryClick(category) {
      if (category.is_locked) {
        // Sprawdź czy użytkownik ma uprawnienia do przeglądania zablokowanych kategorii
        if (this.currentUser && (this.currentUser.role_id === 1 || this.currentUser.role_id === 2)) {
          // Administrator lub moderator - pozwól przeglądać
          this.$emit('select-category', category);
        } else {
          // Zwykły użytkownik - pokaż komunikat
          this.$message.warning('Ta kategoria jest tymczasowo zablokowana');
        }
      } else {
        // Normalna kategoria
        this.$emit('select-category', category);
      }
    },
    
    getRoleType(roleId) {
      const types = { 1: 'danger', 2: 'warning', 3: '', 4: 'info', 5: 'success' };
      return types[roleId] || 'info';
    },
    
    getRoleName(roleId) {
      const roles = {
        1: 'Administrator',
        2: 'Moderator', 
        3: 'Użytkownik',
        4: 'Zbanowany',
        5: 'VIP'
      };
      return roles[roleId] || `Rola ${roleId}`;
    }
  }
}
</script>

<style scoped>
.category-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 15px;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
}

.category-item:hover {
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.category-item.locked {
  opacity: 0.7;
  background-color: rgba(255, 0, 0, 0.05);
}

.category-item.locked:hover {
  background-color: rgba(255, 0, 0, 0.1);
}

.category-icon {
  position: relative;
  width: 40px;
  height: 40px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.lock-indicator {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: #f56c6c;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.category-content {
  flex: 1;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.category-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  margin-bottom: 5px;
  display: block;
}

.category-item.locked .category-name {
  color: var(--text-secondary);
}

.category-name:hover {
  color: var(--el-color-primary);
}

.category-desc {
  font-size: 14px;
  color: var(--text-secondary);
}

.category-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 120px;
}

.category-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
}

.category-lastpost {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 150px;
}

.lastpost-info {
  text-align: right;
}

.lastpost-author {
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: flex-end;
}

.lastpost-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Responsywność */
@media (max-width: 900px) {
  .category-item {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .category-stats, .category-lastpost {
    align-items: center;
  }
  
  .lastpost-info {
    text-align: center;
  }
  
  .lastpost-author {
    justify-content: center;
  }
  
  .category-header {
    justify-content: center;
    flex-direction: column;
    gap: 5px;
  }
}
</style>
