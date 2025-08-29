<template>
  <div class="achievements-system">
    <!-- Nagłówek i statystyki -->
    <div class="achievements-header">
      <div class="header-content">
        <h2>
          <Icon icon="mdi:trophy" />
          System Osiągnięć
        </h2>
        <p>Zdobywaj trofea i pokaż swoją aktywność na forum!</p>
      </div>
      
      <div class="user-stats">
        <div class="stat-card">
          <div class="stat-icon">
            <Icon icon="mdi:trophy-outline" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ unlockedAchievements.length }}</span>
            <span class="stat-label">Zdobyte osiągnięcia</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Icon icon="mdi:progress-clock" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ progressPercentage }}%</span>
            <span class="stat-label">Postęp ogólny</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <Icon icon="mdi:star" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalPoints }}</span>
            <span class="stat-label">Punkty reputacji</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtry i wyszukiwanie -->
    <div class="achievements-filters">
      <div class="filters-left">
        <el-input
          v-model="searchQuery"
          placeholder="Szukaj osiągnięć..."
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        
        <el-select 
          v-model="filterCategory" 
          placeholder="Wszystkie kategorie" 
          clearable
          class="category-filter"
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>
        
        <el-select 
          v-model="filterRarity" 
          placeholder="Wszystkie rarytasy" 
          clearable
          class="rarity-filter"
        >
          <el-option
            v-for="rarity in rarities"
            :key="rarity.value"
            :label="rarity.label"
            :value="rarity.value"
          />
        </el-select>
      </div>
      
      <div class="filters-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="grid">
            <Icon icon="mdi:view-grid" />
            Siatka
          </el-radio-button>
          <el-radio-button label="list">
            <Icon icon="mdi:view-list" />
            Lista
          </el-radio-button>
        </el-radio-group>
        
        <el-button 
          @click="showUnlockedOnly = !showUnlockedOnly"
          :type="showUnlockedOnly ? 'primary' : ''"
          size="small"
        >
          <Icon :icon="showUnlockedOnly ? 'mdi:eye' : 'mdi:eye-off'" />
          {{ showUnlockedOnly ? 'Tylko odblokowane' : 'Pokaż wszystkie' }}
        </el-button>
      </div>
    </div>

    <!-- Kategorie osiągnięć -->
    <div class="categories-tabs">
      <el-tabs v-model="activeCategory" @tab-click="handleCategoryChange">
        <el-tab-pane 
          v-for="category in categories" 
          :key="category.id" 
          :name="category.id.toString()"
        >
          <template #label>
            <span class="tab-label">
              <Icon :icon="category.icon" />
              {{ category.name }}
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Lista osiągnięć -->
    <div class="achievements-container">
      <!-- Widok siatki -->
      <div v-if="viewMode === 'grid'" class="achievements-grid">
        <div
          v-for="achievement in filteredAchievements"
          :key="achievement.id"
          class="achievement-card"
          :class="{
            'unlocked': achievement.unlocked,
            'locked': !achievement.unlocked,
            [`rarity-${achievement.rarity}`]: true
          }"
          @click="showAchievementDetails(achievement)"
        >
          <div class="achievement-icon">
            <div class="icon-container">
              <Icon :icon="achievement.unlocked ? achievement.icon : 'mdi:lock'" />
            </div>
            <div v-if="achievement.unlocked" class="unlocked-badge">
              <Icon icon="mdi:check" />
            </div>
          </div>
          
          <div class="achievement-content">
            <h4 class="achievement-name">{{ achievement.name }}</h4>
            <p class="achievement-description">{{ achievement.description }}</p>
            
            <div class="achievement-progress" v-if="!achievement.unlocked">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: achievement.progressPercentage + '%' }"
                ></div>
              </div>
              <span class="progress-text">
                {{ achievement.progress }}/{{ achievement.requirement }}
              </span>
            </div>
            
            <div class="achievement-meta">
              <el-tag 
                size="small" 
                :type="getRarityType(achievement.rarity)"
                class="rarity-tag"
              >
                {{ getRarityLabel(achievement.rarity) }}
              </el-tag>
              
              <div class="achievement-points">
                <Icon icon="mdi:star" />
                {{ achievement.points }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Widok listy -->
      <div v-else class="achievements-list">
        <div
          v-for="achievement in filteredAchievements"
          :key="achievement.id"
          class="achievement-item"
          :class="{
            'unlocked': achievement.unlocked,
            'locked': !achievement.unlocked,
            [`rarity-${achievement.rarity}`]: true
          }"
          @click="showAchievementDetails(achievement)"
        >
          <div class="item-icon">
            <div class="icon-container">
              <Icon :icon="achievement.unlocked ? achievement.icon : 'mdi:lock'" />
            </div>
          </div>
          
          <div class="item-content">
            <div class="item-header">
              <h4 class="achievement-name">{{ achievement.name }}</h4>
              <div class="item-meta">
                <el-tag 
                  size="small" 
                  :type="getRarityType(achievement.rarity)"
                  class="rarity-tag"
                >
                  {{ getRarityLabel(achievement.rarity) }}
                </el-tag>
                <div class="achievement-points">
                  <Icon icon="mdi:star" />
                  {{ achievement.points }}
                </div>
              </div>
            </div>
            
            <p class="achievement-description">{{ achievement.description }}</p>
            
            <div class="achievement-progress" v-if="!achievement.unlocked">
              <div class="progress-info">
                <span class="progress-text">
                  Postęp: {{ achievement.progress }}/{{ achievement.requirement }}
                  ({{ achievement.progressPercentage }}%)
                </span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: achievement.progressPercentage + '%' }"
                ></div>
              </div>
            </div>
            
            <div class="item-footer" v-if="achievement.unlocked">
              <span class="unlocked-date">
                <Icon icon="mdi:calendar" />
                Odblokowano: {{ formatDate(achievement.unlocked_at) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Brak osiągnięć -->
      <div v-if="filteredAchievements.length === 0" class="no-achievements">
        <Icon icon="mdi:trophy-off" />
        <h3>Brak osiągnięć do wyświetlenia</h3>
        <p>Zmodyfikuj filtry, aby zobaczyć więcej osiągnięć</p>
      </div>
    </div>

    <!-- Paginacja -->
    <div class="achievements-pagination" v-if="totalPages > 1">
      <el-pagination
        background
        layout="prev, pager, next, jumper, total"
        :total="totalAchievements"
        :page-size="pageSize"
        v-model:current-page="currentPage"
        @current-change="handlePageChange"
      />
    </div>

    <!-- Dialog szczegółów osiągnięcia -->
    <el-dialog 
      v-model="detailDialogVisible" 
      :title="selectedAchievement ? selectedAchievement.name : ''"
      width="600px"
    >
      <div v-if="selectedAchievement" class="achievement-detail">
        <div class="detail-header">
          <div class="detail-icon">
            <div class="icon-container" :class="`rarity-${selectedAchievement.rarity}`">
              <Icon :icon="selectedAchievement.unlocked ? selectedAchievement.icon : 'mdi:lock'" />
            </div>
          </div>
          
          <div class="detail-info">
            <div class="detail-meta">
              <el-tag :type="getRarityType(selectedAchievement.rarity)" size="large">
                {{ getRarityLabel(selectedAchievement.rarity) }}
              </el-tag>
              <div class="detail-points">
                <Icon icon="mdi:star" />
                {{ selectedAchievement.points }} punktów
              </div>
            </div>
            
            <p class="detail-description">{{ selectedAchievement.description }}</p>
          </div>
        </div>

        <el-divider />

        <div class="detail-content">
          <h4>Wymagania</h4>
          <p class="detail-requirements">{{ selectedAchievement.requirements_text }}</p>
          
          <div class="detail-progress" v-if="!selectedAchievement.unlocked">
            <div class="progress-stats">
              <span>Postęp: {{ selectedAchievement.progress }}/{{ selectedAchievement.requirement }}</span>
              <span>{{ selectedAchievement.progressPercentage }}%</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: selectedAchievement.progressPercentage + '%' }"
              ></div>
            </div>
          </div>

          <div class="detail-unlocked" v-else>
            <el-alert
              :title="`Osiągnięcie odblokowane ${formatDate(selectedAchievement.unlocked_at)}`"
              type="success"
              :closable="false"
            />
            
            <div class="unlocked-stats">
              <div class="stat">
                <span class="stat-label">Czas do odblokowania:</span>
                <span class="stat-value">{{ selectedAchievement.time_to_unlock }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Pozycja w rankingu:</span>
                <span class="stat-value">#{{ selectedAchievement.rank }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="detail-footer">
          <div class="global-stats">
            <h4>Statystyki globalne</h4>
            <div class="stats-grid">
              <div class="global-stat">
                <span class="stat-label">Odblokowane przez:</span>
                <span class="stat-value">{{ selectedAchievement.global_unlocked }} użytkowników</span>
              </div>
              <div class="global-stat">
                <span class="stat-label">Wskaźnik odblokowania:</span>
                <span class="stat-value">{{ selectedAchievement.global_percentage }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- Powiadomienie o nowym osiągnięciu -->
    <div v-if="showNewAchievementNotification" class="achievement-notification">
      <div class="notification-content">
        <div class="notification-icon">
          <Icon :icon="newAchievement.icon" />
        </div>
        <div class="notification-text">
          <h4>Nowe osiągnięcie!</h4>
          <p>{{ newAchievement.name }}</p>
        </div>
        <button class="notification-close" @click="hideNotification">
          <Icon icon="mdi:close" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";
import { debounce } from "lodash";

export default {
  name: 'AchievementsSystem',
  components: {
    Icon
  },
  props: {
    userId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      // Dane osiągnięć
      achievements: [],
      unlockedAchievements: [],
      categories: [],
      
      // Filtry i wyszukiwanie
      searchQuery: '',
      filterCategory: '',
      filterRarity: '',
      showUnlockedOnly: false,
      viewMode: 'grid',
      activeCategory: 'all',
      
      // Paginacja
      currentPage: 1,
      pageSize: 12,
      totalAchievements: 0,
      
      // Dialog szczegółów
      detailDialogVisible: false,
      selectedAchievement: null,
      
      // Powiadomienia
      showNewAchievementNotification: false,
      newAchievement: null,
      
      // Rarytasy
      rarities: [
        { value: 'common', label: 'Powszechne', type: 'info' },
        { value: 'uncommon', label: 'Niezbyt powszechne', type: '' },
        { value: 'rare', label: 'Rzadkie', type: 'warning' },
        { value: 'epic', label: 'Epickie', type: 'danger' },
        { value: 'legendary', label: 'Legendarne', type: 'success' }
      ],
      
      // Timer do odświeżania osiągnięć
      refreshTimer: null
    };
  },
  computed: {
    filteredAchievements() {
      let filtered = this.achievements;
      
      // Filtruj po kategorii
      if (this.activeCategory !== 'all') {
        filtered = filtered.filter(a => a.category_id.toString() === this.activeCategory);
      }
      
      // Filtruj po rarytasie
      if (this.filterRarity) {
        filtered = filtered.filter(a => a.rarity === this.filterRarity);
      }
      
      // Filtruj po odblokowaniu
      if (this.showUnlockedOnly) {
        filtered = filtered.filter(a => a.unlocked);
      }
      
      // Filtruj po wyszukiwaniu
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(a => 
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
        );
      }
      
      // Paginacja
      const start = (this.currentPage - 1) * this.pageSize;
      return filtered.slice(start, start + this.pageSize);
    },
    
    totalPages() {
      return Math.ceil(this.totalAchievements / this.pageSize);
    },
    
    progressPercentage() {
      if (this.achievements.length === 0) return 0;
      const unlocked = this.achievements.filter(a => a.unlocked).length;
      return Math.round((unlocked / this.achievements.length) * 100);
    },
    
    totalPoints() {
      return this.unlockedAchievements.reduce((total, achievement) => {
        return total + (achievement.points || 0);
      }, 0);
    }
  },
  watch: {
    searchQuery: debounce(function() {
      this.currentPage = 1;
      this.updateFilteredCount();
    }, 300),
    
    filterCategory() {
      this.currentPage = 1;
      this.updateFilteredCount();
    },
    
    filterRarity() {
      this.currentPage = 1;
      this.updateFilteredCount();
    },
    
    showUnlockedOnly() {
      this.currentPage = 1;
      this.updateFilteredCount();
    },
    
    activeCategory() {
      this.currentPage = 1;
      this.updateFilteredCount();
    }
  },
  methods: {
    // Ładowanie danych
    async loadAchievements() {
      try {
        const response = await axios.get(`/users/${this.userId}/achievements`);
        this.achievements = response.data.achievements;
        this.unlockedAchievements = response.data.unlocked_achievements;
        this.categories = response.data.categories;
        this.totalAchievements = this.achievements.length;
      } catch (error) {
        console.error('Error loading achievements:', error);
        this.$message.error('Błąd podczas ładowania osiągnięć');
      }
    },
    
    // Filtrowanie
    updateFilteredCount() {
      // Aktualizacja liczby przefiltrowanych osiągnięć
      this.totalAchievements = this.filteredAchievements.length;
    },
    
    handleCategoryChange(tab) {
      this.activeCategory = tab.paneName;
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    // Dialog szczegółów
    showAchievementDetails(achievement) {
      this.selectedAchievement = achievement;
      this.detailDialogVisible = true;
    },
    
    // Pomocnicze
    getRarityType(rarity) {
      const rarityObj = this.rarities.find(r => r.value === rarity);
      return rarityObj ? rarityObj.type : '';
    },
    
    getRarityLabel(rarity) {
      const rarityObj = this.rarities.find(r => r.value === rarity);
      return rarityObj ? rarityObj.label : rarity;
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Nie odblokowano';
      return new Date(dateString).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    // Powiadomienia
    showNewAchievement(achievement) {
      this.newAchievement = achievement;
      this.showNewAchievementNotification = true;
      
      // Automatyczne ukrywanie po 5 sekundach
      setTimeout(() => {
        this.hideNotification();
      }, 5000);
    },
    
    hideNotification() {
      this.showNewAchievementNotification = false;
    },
    
    // Odświeżanie osiągnięć co 30 sekund
    setupAutoRefresh() {
      this.refreshTimer = setInterval(() => {
        this.loadAchievements();
      }, 30000); // 30 sekund
    },
    
    // Symulacja odblokowania osiągnięcia (do testów)
    async simulateAchievementUnlock() {
      try {
        const lockedAchievements = this.achievements.filter(a => !a.unlocked);
        if (lockedAchievements.length > 0) {
          const randomAchievement = lockedAchievements[
            Math.floor(Math.random() * lockedAchievements.length)
          ];
          
          const response = await axios.post('/achievements/unlock', {
            achievement_id: randomAchievement.id
          });
          
          if (response.data.achievement) {
            this.showNewAchievement(response.data.achievement);
            this.loadAchievements(); // Odśwież listę
          }
        }
      } catch (error) {
        console.error('Error simulating achievement unlock:', error);
        this.$message.error('Błąd podczas symulacji odblokowania osiągnięcia');
      }
    }
  },
  async mounted() {
    await this.loadAchievements();
    this.setupAutoRefresh();
    
    // Nasłuchuj globalnych eventów osiągnięć
    this.$emitter.on('achievement-unlocked', this.showNewAchievement);
  },
  beforeUnmount() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.$emitter.off('achievement-unlocked', this.showNewAchievement);
  }
};
</script>

<style scoped>
.achievements-system {
  font-family: inherit;
  padding: 20px;
}

/* Nagłówek */
.achievements-header {
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-bg-color) 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--el-border-color-light);
}

.header-content h2 {
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--el-text-color-primary);
}

.header-content p {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  gap: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* Filtry */
.achievements-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.filters-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filters-right {
  display: flex;
  gap: 8px;
}

.search-input {
  width: 250px;
}

.category-filter,
.rarity-filter {
  width: 180px;
}

/* Zakładki kategorii */
.categories-tabs {
  margin-bottom: 24px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Kontener osiągnięć */
.achievements-container {
  margin-bottom: 24px;
}

/* Widok siatki */
.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.achievement-card {
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.achievement-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.achievement-card.unlocked {
  border-color: var(--el-color-success-light-5);
}

.achievement-card.locked {
  opacity: 0.8;
}

.achievement-card.rarity-common {
  border-color: var(--el-border-color);
}

.achievement-card.rarity-uncommon {
  border-color: var(--el-color-primary-light-3);
}

.achievement-card.rarity-rare {
  border-color: var(--el-color-warning-light-3);
}

.achievement-card.rarity-epic {
  border-color: var(--el-color-danger-light-3);
}

.achievement-card.rarity-legendary {
  border-color: var(--el-color-success-light-3);
}

.achievement-icon {
  position: relative;
  margin-bottom: 16px;
  text-align: center;
}

.icon-container {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 32px;
}

.achievement-card.rarity-common .icon-container {
  color: var(--el-text-color-secondary);
}

.achievement-card.rarity-uncommon .icon-container {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.achievement-card.rarity-rare .icon-container {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.achievement-card.rarity-epic .icon-container {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.achievement-card.rarity-legendary .icon-container {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.unlocked-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-success);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.achievement-content {
  text-align: center;
}

.achievement-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.achievement-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.achievement-progress {
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--el-color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.achievement-card.rarity-uncommon .progress-fill {
  background: var(--el-color-primary);
}

.achievement-card.rarity-rare .progress-fill {
  background: var(--el-color-warning);
}

.achievement-card.rarity-epic .progress-fill {
  background: var(--el-color-danger);
}

.achievement-card.rarity-legendary .progress-fill {
  background: var(--el-color-success);
}

.progress-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.achievement-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.rarity-tag {
  font-weight: 500;
}

.achievement-points {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-warning);
}

/* Widok listy */
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 16px;
}

.achievement-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.achievement-item.unlocked {
  border-left: 4px solid var(--el-color-success);
}

.achievement-item.locked {
  border-left: 4px solid var(--el-border-color);
}

.achievement-item.rarity-uncommon.unlocked {
  border-left-color: var(--el-color-primary);
}

.achievement-item.rarity-rare.unlocked {
  border-left-color: var(--el-color-warning);
}

.achievement-item.rarity-epic.unlocked {
  border-left-color: var(--el-color-danger);
}

.achievement-item.rarity-legendary.unlocked {
  border-left-color: var(--el-color-success);
}

.item-icon {
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.achievement-progress {
  margin: 12px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.item-footer {
  margin-top: 8px;
}

.unlocked-date {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Brak osiągnięć */
.no-achievements {
  text-align: center;
  padding: 60px 20px;
  color: var(--el-text-color-secondary);
}

.no-achievements .iconify {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-achievements h3 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.no-achievements p {
  margin: 0;
}

/* Paginacja */
.achievements-pagination {
  display: flex;
  justify-content: center;
}

/* Dialog szczegółów */
.achievement-detail {
  padding: 8px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.detail-icon .icon-container {
  width: 80px;
  height: 80px;
  font-size: 40px;
}

.detail-info {
  flex: 1;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-points {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-warning);
}

.detail-description {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.detail-content h4 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

.detail-requirements {
  margin: 0 0 20px 0;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
  font-size: 14px;
  line-height: 1.5;
}

.detail-progress {
  margin: 20px 0;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.detail-unlocked {
  margin: 20px 0;
}

.unlocked-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-footer {
  margin-top: 16px;
}

.global-stats h4 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.global-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Powiadomienie */
.achievement-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  animation: slideIn 0.3s ease;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color);
  border: 2px solid var(--el-color-success);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  gap: 12px;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.notification-text h4 {
  margin: 0 0 4px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.notification-text p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.notification-close {
  background: none;
  border: none;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.notification-close:hover {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsywność */
@media (max-width: 768px) {
  .achievements-header {
    padding: 16px;
  }
  
  .user-stats {
    grid-template-columns: 1fr;
  }
  
  .achievements-filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filters-left,
  .filters-right {
    width: 100%;
  }
  
  .search-input,
  .category-filter,
  .rarity-filter {
    width: 100%;
  }
  
  .achievements-grid {
    grid-template-columns: 1fr;
  }
  
  .achievement-item {
    flex-direction: column;
    text-align: center;
  }
  
  .item-header {
    flex-direction: column;
    align-items: center;
  }
  
  .detail-header {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-meta {
    justify-content: center;
  }
  
  .stats-grid,
  .unlocked-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .achievements-system {
    padding: 10px;
  }
  
  .categories-tabs :deep(.el-tabs__nav) {
    flex-wrap: wrap;
  }
  
  .categories-tabs :deep(.el-tabs__item) {
    padding: 0 8px;
  }
}
</style>
