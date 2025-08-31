<template>
  <div class="reputation-management">
     <div class="page-header">
      <h2>
        <Icon icon="mdi:forum-outline" />
        Zarządzanie systemem reputacji
      </h2>
    </div>
    
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <Icon icon="mdi:thumb-up" class="stat-icon positive" />
          <div class="stat-info">
            <div class="stat-number">{{ stats.total_upvotes }}</div>
            <div class="stat-label">Pozytywne głosy</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <Icon icon="mdi:thumb-down" class="stat-icon negative" />
          <div class="stat-info">
            <div class="stat-number">{{ stats.total_downvotes }}</div>
            <div class="stat-label">Negatywne głosy</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <Icon icon="mdi:account-group" class="stat-icon" />
          <div class="stat-info">
            <div class="stat-number">{{ stats.active_voters }}</div>
            <div class="stat-label">Aktywni głosujący</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-tabs v-model="activeTab" class="reputation-tabs">
      <el-tab-pane label="Ostatnie głosy" name="recent-votes">
        <el-table :data="recentVotes" style="width: 100%">
          <el-table-column prop="voter" label="Głosujący" width="120" />
          <el-table-column prop="type" label="Typ" width="80">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'upvote' ? 'success' : 'danger'" size="small">
                {{ scope.row.type === 'upvote' ? '+' : '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="target" label="Cel" />
          <el-table-column prop="created_at" label="Data" width="150">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="Akcje" width="100">
            <template #default="scope">
              <el-button 
                size="small" 
                @click="reverseVote(scope.row.id)"
                title="Cofnij głos"
              >
                <Icon icon="mdi:undo" />
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="Top użytkownicy" name="top-users">
        <el-table :data="topUsers" style="width: 100%">
          <el-table-column prop="username" label="Użytkownik" />
          <el-table-column prop="reputation" label="Reputacja" width="100">
            <template #default="scope">
              <span :class="getReputationClass(scope.row.reputation)">
                {{ scope.row.reputation > 0 ? '+' : '' }}{{ scope.row.reputation }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="upvotes" label="+" width="80" />
          <el-table-column prop="downvotes" label="-" width="80" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ReputationManagement',
  components: {
    Icon
  },
  data() {
    return {
      activeTab: 'recent-votes',
      stats: {
        total_upvotes: 0,
        total_downvotes: 0,
        active_voters: 0
      },
      recentVotes: [],
      topUsers: [],
      loading: false
    };
  },
  mounted() {
    this.loadStats();
    this.loadRecentVotes();
    this.loadTopUsers();
  },
  methods: {
    async loadStats() {
      try {
        const response = await axios.get('/admin/reputation/stats');
        this.stats = response.data;
      } catch (error) {
        console.error('Error loading reputation stats:', error);
        this.$message.error('Błąd podczas ładowania statystyk');
      }
    },
    
    async loadRecentVotes() {
      try {
        const response = await axios.get('/admin/reputation/recent-votes');
        this.recentVotes = response.data;
      } catch (error) {
        console.error('Error loading recent votes:', error);
        this.$message.error('Błąd podczas ładowania ostatnich głosów');
      }
    },
    
    async loadTopUsers() {
      try {
        const response = await axios.get('/admin/reputation/top-users');
        this.topUsers = response.data;
      } catch (error) {
        console.error('Error loading top users:', error);
        this.$message.error('Błąd podczas ładowania top użytkowników');
      }
    },
    
    async reverseVote(voteId) {
      try {
        await axios.post(`/reputation/${voteId}/reverse`);
        this.$message.success('Głos został cofnięty');
        this.loadStats();
        this.loadRecentVotes();
        this.loadTopUsers();
      } catch (error) {
        console.error('Error reversing vote:', error);
        this.$message.error('Błąd podczas cofania głosu');
      }
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('pl-PL');
    },
    
    getReputationClass(reputation) {
      if (reputation > 0) return 'positive';
      if (reputation < 0) return 'negative';
      return 'neutral';
    }
  }
}
</script>

<style scoped>
.reputation-management {
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--card-border);
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: var(--text-primary);
  font-size: 22px;
  font-weight: 600;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.stat-icon {
  font-size: 24px;
}

.stat-icon.positive {
  color: var(--el-color-success);
}

.stat-icon.negative {
  color: var(--el-color-danger);
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.reputation-tabs {
  margin-top: 20px;
}

.positive {
  color: var(--el-color-success);
  font-weight: bold;
}

.negative {
  color: var(--el-color-danger);
  font-weight: bold;
}

.neutral {
  color: var(--el-text-color-secondary);
}
</style>
