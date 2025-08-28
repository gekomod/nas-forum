<template>
  <div class="reputation-system-compact">
    <div class="voting-container">
      <el-tooltip content="Pozytywna ocena" placement="top">
        <button 
          class="vote-btn upvote" 
          :class="{ active: currentVote === 'upvote' }"
          @click="vote('upvote')"
          :disabled="!canVote || voting"
        >
          <Icon icon="mdi:arrow-up-thick" />
        </button>
      </el-tooltip>
      
      <span class="reputation-score" :class="getScoreColor">
        {{ formattedScore }}
      </span>
      
      <el-tooltip content="Negatywna ocena" placement="top">
        <button 
          class="vote-btn downvote" 
          :class="{ active: currentVote === 'downvote' }"
          @click="vote('downvote')"
          :disabled="!canVote || voting"
        >
          <Icon icon="mdi:arrow-down-thick" />
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ReputationSystem',
  components: {
    Icon
  },
  props: {
    targetType: {
      type: String,
      default: 'post'
    },
    targetId: {
      type: [String, Number],
      required: true
    },
    userId: {
      type: [String, Number],
      required: true
    },
    currentUser: {
      type: Object,
      required: true
    },
    initialScore: {
      type: Number,
      default: 0
    },
    initialVote: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      score: this.initialScore,
      currentVote: this.initialVote,
      voting: false
    };
  },
  computed: {
    canVote() {
      if (!this.currentUser) return false;
      if (this.currentUser.id === this.userId) return false;
      return true;
    },
    
    formattedScore() {
      if (this.score > 0) return `+${this.score}`;
      return this.score.toString();
    },
    
    getScoreColor() {
      if (this.score > 0) return 'positive';
      if (this.score < 0) return 'negative';
      return 'neutral';
    }
  },
  methods: {
    async vote(type) {
      if (!this.canVote || this.voting) return;
      
      this.voting = true;
      try {
        const voteType = this.currentVote === type ? null : type;
        
        const response = await axios.post('/reputation/vote', {
          target_type: this.targetType,
          target_id: this.targetId,
          vote_type: voteType
        });
        
        this.score = response.data.new_score;
        this.currentVote = voteType;
        
        this.$emit('vote-cast', {
          targetId: this.targetId,
          voteType: voteType,
          newScore: this.score
        });
        
      } catch (error) {
        console.error('Error voting:', error);
        this.$message.error(error.response?.data?.error || 'Błąd podczas głosowania');
      } finally {
        this.voting = false;
      }
    }
  }
}
</script>

<style scoped>
.reputation-system-compact {
  display: inline-block;
}

.voting-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px;
}

.vote-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.vote-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background-color: var(--el-fill-color-light);
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-btn.upvote.active {
  background-color: var(--el-color-success-light-9);
  border-color: var(--el-color-success);
  color: var(--el-color-success);
}

.vote-btn.downvote.active {
  background-color: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger);
  color: var(--el-color-danger);
}

.reputation-score {
  font-size: 14px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
}

.reputation-score.positive {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.reputation-score.negative {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.reputation-score.neutral {
  color: var(--el-text-color-secondary);
}

/* Responsywność */
@media (max-width: 768px) {
  .voting-container {
    flex-direction: row;
    gap: 8px;
  }
  
  .vote-btn {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
  
  .reputation-score {
    font-size: 12px;
  }
}

/* Style dla ciemnego motywu */
html.dark .reputation-system-compact .voting-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

html.dark .vote-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

html.dark .vote-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

html.dark .vote-btn.upvote.active {
  background-color: rgba(103, 194, 58, 0.2);
  border-color: rgba(103, 194, 58, 0.4);
  color: #67c23a;
}

html.dark .vote-btn.downvote.active {
  background-color: rgba(245, 108, 108, 0.2);
  border-color: rgba(245, 108, 108, 0.4);
  color: #f56c6c;
}

html.dark .vote-btn:disabled {
  opacity: 0.3;
  color: rgba(255, 255, 255, 0.4);
}

html.dark .reputation-score {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

html.dark .reputation-score.positive {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

html.dark .reputation-score.negative {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

html.dark .reputation-score.neutral {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
}

/* Dla bardzo małych ekranów w ciemnym motywie */
@media (max-width: 768px) {
  html.dark .voting-container {
    background: transparent;
    border: none;
    padding: 2px;
  }
}
</style>
