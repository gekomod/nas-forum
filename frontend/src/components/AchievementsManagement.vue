<template>
  <div class="achievements-management">
    <div class="management-header">
      <h3><Icon icon="mdi:trophy" /> Zarządzanie Systemem Osiągnięć</h3>
      <p>Twórz i edytuj osiągnięcia oraz kategorie dla użytkowników forum</p>
    </div>

    <el-tabs v-model="activeTab" class="management-tabs">
      <el-tab-pane label="Osiągnięcia" name="achievements">
        <div class="management-actions">
          <el-button type="primary" @click="showCreateDialog = true">
            <Icon icon="mdi:plus" />
            Nowe Osiągnięcie
          </el-button>
          
          <el-button @click="loadAchievements" :loading="loading">
            <Icon icon="mdi:refresh" />
            Odśwież
          </el-button>
        </div>

        <el-table :data="achievements" v-loading="loading" class="achievements-table">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column label="Nazwa" min-width="150">
            <template #default="{ row }">
              <div class="achievement-info">
                <div class="achievement-icon">
                  <Icon :icon="row.icon" />
                </div>
                <div class="achievement-details">
                  <div class="achievement-name">{{ row.name }}</div>
                  <div class="achievement-description">{{ row.description }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="category_name" label="Kategoria" width="120" />
          <el-table-column label="Rarytas" width="100">
            <template #default="{ row }">
              <el-tag :type="getRarityType(row.rarity)" size="small">
                {{ getRarityLabel(row.rarity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="points" label="Punkty" width="80" />
          <el-table-column prop="requirement" label="Wymaganie" width="100" />
          <el-table-column label="Odblokowanych" width="120">
            <template #default="{ row }">
              {{ row.unlocked_count || 0 }} / {{ totalUsers }}
              ({{ row.unlock_percentage || 0 }}%)
            </template>
          </el-table-column>
          <el-table-column label="Status" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_hidden ? 'info' : 'success'" size="small">
                {{ row.is_hidden ? 'Ukryte' : 'Widoczne' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Akcje" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="editAchievement(row)">
                <Icon icon="mdi:pencil" />
                Edytuj
              </el-button>
              <el-button size="small" type="danger" @click="deleteAchievement(row)">
                <Icon icon="mdi:delete" />
                Usuń
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="Kategorie" name="categories">
        <div class="categories-management">
          <div class="categories-actions">
            <el-button type="primary" @click="showCategoryDialog = true">
              <Icon icon="mdi:plus" />
              Nowa Kategoria
            </el-button>
          </div>

          <el-table :data="categories" v-loading="loading">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="Nazwa" min-width="150">
              <template #default="{ row }">
                <div class="category-info">
                  <div class="category-icon">
                    <Icon :icon="row.icon" />
                  </div>
                  <div class="category-name">{{ row.name }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="Opis" />
            <el-table-column prop="position" label="Pozycja" width="80" />
            <el-table-column label="Liczba osiągnięć" width="120">
              <template #default="{ row }">
                {{ getAchievementsCount(row.id) }}
              </template>
            </el-table-column>
            <el-table-column label="Akcje" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="editCategory(row)">
                  <Icon icon="mdi:pencil" />
                  Edytuj
                </el-button>
                <el-button 
                  size="small" 
                  @click="moveCategory(row.id, 'up')"
                  :disabled="row.position === 1"
                >
                  <Icon icon="mdi:arrow-up" />
                </el-button>
                <el-button 
                  size="small" 
                  @click="moveCategory(row.id, 'down')"
                  :disabled="row.position === categories.length"
                >
                  <Icon icon="mdi:arrow-down" />
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteCategory(row)"
                  :disabled="getAchievementsCount(row.id) > 0"
                >
                  <Icon icon="mdi:delete" />
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Statystyki systemu -->
    <div class="system-stats">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="mdi:trophy" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ totalAchievements }}</div>
            <div class="stat-label">Łącznie osiągnięć</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="mdi:account-group" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ totalUnlocks }}</div>
            <div class="stat-label">Odblokowań</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <Icon icon="mdi:star" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ totalPoints }}</div>
            <div class="stat-label">Przyznanych punktów</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Dialog tworzenia/edycji osiągnięcia -->
    <el-dialog 
      :title="editingAchievement ? 'Edytuj Osiągnięcie' : 'Nowe Osiągnięcie'" 
      v-model="showCreateDialog"
      width="600px"
    >
      <el-form :model="achievementForm" label-width="120px" :rules="formRules" ref="achievementFormRef">
        <el-form-item label="Nazwa" prop="name">
          <el-input v-model="achievementForm.name" placeholder="Nazwa osiągnięcia" />
        </el-form-item>
        
        <el-form-item label="Opis" prop="description">
          <el-input 
            v-model="achievementForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="Opis osiągnięcia" 
          />
        </el-form-item>
        
        <el-form-item label="Ikona" prop="icon">
          <el-input v-model="achievementForm.icon" placeholder="mdi:icon-name">
            <template #prepend>
              <Icon :icon="achievementForm.icon || 'mdi:help'" />
            </template>
          </el-input>
          <div class="icon-help">
            Użyj nazw ikon z Material Design Icons (np. mdi:trophy, mdi:star, mdi:forum)
          </div>
        </el-form-item>
        
        <el-form-item label="Kategoria" prop="category_id">
          <el-select v-model="achievementForm.category_id" placeholder="Wybierz kategorię">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            >
              <div style="display: flex; align-items: center; gap: 8px;">
                <Icon :icon="category.icon" />
                {{ category.name }}
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Rarytas" prop="rarity">
          <el-select v-model="achievementForm.rarity" placeholder="Wybierz rarytas">
            <el-option
              v-for="rarity in rarities"
              :key="rarity.value"
              :label="rarity.label"
              :value="rarity.value"
            >
              <el-tag :type="rarity.type">{{ rarity.label }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Punkty" prop="points">
          <el-input-number 
            v-model="achievementForm.points" 
            :min="0" 
            :max="1000"
            controls-position="right"
          />
        </el-form-item>
        
        <el-form-item label="Wymaganie" prop="requirement">
          <el-input-number 
            v-model="achievementForm.requirement" 
            :min="1" 
            :max="1000000"
            controls-position="right"
          />
          <div class="help-text">Liczba akcji wymagana do odblokowania</div>
        </el-form-item>
        
        <el-form-item label="Tekst wymagań" prop="requirements_text">
          <el-input 
            v-model="achievementForm.requirements_text" 
            placeholder="Opis wymagań dla użytkownika"
          />
        </el-form-item>
        
        <el-form-item label="Status" prop="is_hidden">
          <el-switch
            v-model="achievementForm.is_hidden"
            active-text="Ukryte"
            inactive-text="Widoczne"
          />
          <div class="help-text">Ukryte osiągnięcia nie są widoczne dla użytkowników</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Anuluj</el-button>
        <el-button type="primary" @click="saveAchievement" :loading="saving">
          {{ editingAchievement ? 'Zapisz zmiany' : 'Utwórz' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Dialog kategorii -->
    <el-dialog 
      :title="editingCategory ? 'Edytuj Kategorię' : 'Nowa Kategoria'" 
      v-model="showCategoryDialog"
      width="500px"
    >
      <el-form :model="categoryForm" label-width="120px" :rules="categoryRules" ref="categoryFormRef">
        <el-form-item label="Nazwa" prop="name">
          <el-input v-model="categoryForm.name" />
        </el-form-item>
        <el-form-item label="Ikona" prop="icon">
          <el-input v-model="categoryForm.icon">
            <template #prepend>
              <Icon :icon="categoryForm.icon || 'mdi:help'" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="Opis" prop="description">
          <el-input v-model="categoryForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="Pozycja" prop="position">
          <el-input-number 
            v-model="categoryForm.position" 
            :min="1" 
            :max="categories.length + 1"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCategoryDialog = false">Anuluj</el-button>
        <el-button type="primary" @click="saveCategory" :loading="saving">
          {{ editingCategory ? 'Zapisz' : 'Utwórz' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'AchievementsManagement',
  components: {
    Icon
  },
  data() {
    return {
      activeTab: 'achievements',
      achievements: [],
      categories: [],
      loading: false,
      saving: false,
      showCreateDialog: false,
      showCategoryDialog: false,
      editingAchievement: null,
      editingCategory: null,
      achievementForm: {
        name: '',
        description: '',
        icon: 'mdi:trophy',
        category_id: '',
        rarity: 'common',
        points: 10,
        requirement: 1,
        requirements_text: '',
        is_hidden: false
      },
      categoryForm: {
        name: '',
        icon: 'mdi:shape',
        description: '',
        position: 1
      },
      formRules: {
        name: [{ required: true, message: 'Nazwa jest wymagana', trigger: 'blur' }],
        description: [{ required: true, message: 'Opis jest wymagany', trigger: 'blur' }],
        category_id: [{ required: true, message: 'Kategoria jest wymagana', trigger: 'change' }],
        icon: [{ required: true, message: 'Ikona jest wymagana', trigger: 'blur' }]
      },
      categoryRules: {
        name: [{ required: true, message: 'Nazwa jest wymagana', trigger: 'blur' }],
        icon: [{ required: true, message: 'Ikona jest wymagana', trigger: 'blur' }]
      },
      rarities: [
        { value: 'common', label: 'Powszechne', type: 'info' },
        { value: 'uncommon', label: 'Niezbyt powszechne', type: '' },
        { value: 'rare', label: 'Rzadkie', type: 'warning' },
        { value: 'epic', label: 'Epickie', type: 'danger' },
        { value: 'legendary', label: 'Legendarne', type: 'success' }
      ],
      totalUsers: 0,
      totalUnlocks: 0,
      totalPoints: 0
    };
  },
  computed: {
    totalAchievements() {
      return this.achievements.length;
    }
  },
  methods: {
    async loadAchievements() {
      this.loading = true;
      try {
        const [achievementsRes, categoriesRes, statsRes] = await Promise.all([
          axios.get('/admin/achievements'),
          axios.get('/achievements/categories'),
          axios.get('/admin/achievements/stats')
        ]);
        
        this.achievements = achievementsRes.data;
        this.categories = categoriesRes.data;
        
        if (statsRes.data) {
          this.totalUsers = statsRes.data.total_users || 0;
          this.totalUnlocks = statsRes.data.total_unlocks || 0;
          this.totalPoints = statsRes.data.total_points || 0;
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
        this.$message.error('Błąd podczas ładowania osiągnięć');
      } finally {
        this.loading = false;
      }
    },
    
    async loadCategories() {
      try {
        const response = await axios.get('/achievements/categories');
        this.categories = response.data;
      } catch (error) {
        console.error('Error loading categories:', error);
        this.$message.error('Błąd podczas ładowania kategorii');
      }
    },
    
    getRarityType(rarity) {
      const rarityObj = this.rarities.find(r => r.value === rarity);
      return rarityObj ? rarityObj.type : '';
    },
    
    getRarityLabel(rarity) {
      const rarityObj = this.rarities.find(r => r.value === rarity);
      return rarityObj ? rarityObj.label : rarity;
    },
    
    getAchievementsCount(categoryId) {
      return this.achievements.filter(a => a.category_id === categoryId).length;
    },
    
    editAchievement(achievement) {
      this.editingAchievement = achievement;
      this.achievementForm = { ...achievement };
      this.showCreateDialog = true;
    },
    
    async deleteAchievement(achievement) {
      try {
        await this.$confirm(
          `Czy na pewno chcesz usunąć osiągnięcie "${achievement.name}"?`,
          'Potwierdzenie usunięcia',
          {
            confirmButtonText: 'Tak, usuń',
            cancelButtonText: 'Anuluj',
            type: 'warning'
          }
        );
        
        await axios.delete(`/admin/achievements/${achievement.id}`);
        this.$message.success('Osiągnięcie zostało usunięte');
        await this.loadAchievements();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error deleting achievement:', error);
          this.$message.error('Błąd podczas usuwania osiągnięcia');
        }
      }
    },
    
    editCategory(category) {
      this.editingCategory = category;
      this.categoryForm = { ...category };
      this.showCategoryDialog = true;
    },
    
    async moveCategory(categoryId, direction) {
      try {
        await axios.post(`/admin/achievements/categories/${categoryId}/move`, {
          direction
        });
        this.$message.success('Kolejność kategorii została zmieniona');
        await this.loadCategories();
      } catch (error) {
        console.error('Error moving category:', error);
        this.$message.error('Błąd podczas zmiany kolejności kategorii');
      }
    },
    
    async deleteCategory(category) {
      try {
        await this.$confirm(
          `Czy na pewno chcesz usunąć kategorię "${category.name}"?`,
          'Potwierdzenie usunięcia',
          {
            confirmButtonText: 'Tak, usuń',
            cancelButtonText: 'Anuluj',
            type: 'warning'
          }
        );
        
        await axios.delete(`/admin/achievements/categories/${category.id}`);
        this.$message.success('Kategoria została usunięta');
        await this.loadCategories();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error deleting category:', error);
          this.$message.error('Błąd podczas usuwania kategorii');
        }
      }
    },
    
    async saveAchievement() {
      try {
        await this.$refs.achievementFormRef.validate();
        this.saving = true;
        
        const endpoint = this.editingAchievement 
          ? `/admin/achievements/${this.editingAchievement.id}`
          : '/admin/achievements';
        
        const method = this.editingAchievement ? 'put' : 'post';
        
        await axios[method](endpoint, this.achievementForm);
        
        this.$message.success(
          this.editingAchievement 
            ? 'Osiągnięcie zostało zaktualizowane' 
            : 'Osiągnięcie zostało utworzone'
        );
        
        this.showCreateDialog = false;
        this.resetAchievementForm();
        await this.loadAchievements();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error saving achievement:', error);
          this.$message.error(
            error.response?.data?.error || 'Błąd podczas zapisywania osiągnięcia'
          );
        }
      } finally {
        this.saving = false;
      }
    },
    
    async saveCategory() {
      try {
        await this.$refs.categoryFormRef.validate();
        this.saving = true;
        
        const endpoint = this.editingCategory 
          ? `/admin/achievements/categories/${this.editingCategory.id}`
          : '/admin/achievements/categories';
        
        const method = this.editingCategory ? 'put' : 'post';
        
        await axios[method](endpoint, this.categoryForm);
        
        this.$message.success(
          this.editingCategory 
            ? 'Kategoria została zaktualizowana' 
            : 'Kategoria została utworzona'
        );
        
        this.showCategoryDialog = false;
        this.resetCategoryForm();
        await this.loadCategories();
      } catch (error) {
        console.error('Error saving category:', error);
        this.$message.error('Błąd podczas zapisywania kategorii');
      } finally {
        this.saving = false;
      }
    },
    
    resetAchievementForm() {
      this.editingAchievement = null;
      this.achievementForm = {
        name: '',
        description: '',
        icon: 'mdi:trophy',
        category_id: '',
        rarity: 'common',
        points: 10,
        requirement: 1,
        requirements_text: '',
        is_hidden: false
      };
      
      if (this.$refs.achievementFormRef) {
        this.$refs.achievementFormRef.resetFields();
      }
    },
    
    resetCategoryForm() {
      this.editingCategory = null;
      this.categoryForm = {
        name: '',
        icon: 'mdi:shape',
        description: '',
        position: 1
      };
    }
  },
  async mounted() {
    await this.loadAchievements();
    await this.loadCategories();
  }
};
</script>

<style scoped>
.achievements-management {
  padding: 20px;
}

.management-header {
  margin-bottom: 24px;
}

.management-header h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.management-tabs {
  margin-bottom: 20px;
}

.management-actions {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.categories-management {
  padding: 20px 0;
}

.categories-actions {
  margin-bottom: 20px;
}

.achievements-table {
  margin-bottom: 24px;
}

.achievement-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.achievement-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.achievement-details {
  flex: 1;
}

.achievement-name {
  font-weight: 600;
  color: var(--text-primary);
}

.achievement-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-icon {
  width: 24px;
  height: 24px;
  color: var(--el-color-primary);
  font-size: 20px;
}

.category-name {
  font-weight: 600;
}

.icon-help {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.help-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.system-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-info {
  text-align: left;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
