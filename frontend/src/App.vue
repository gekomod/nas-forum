<template>
  <div id="app">
    <div class="forum-background">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
    </div>

    <div class="forum-container">
      <ForumHeader 
        :dark-mode="darkMode" 
        :user="currentUser"
        @toggle-dark-mode="toggleDarkMode"
        @show-login="showAuthModal(true)"
        @show-register="showAuthModal(false)"
        @show-profile="showProfileModal = true"
        @show-admin-panel="currentView = 'admin-panel'"
        @show-categories="showCategoryModal = true"
        @logout="handleLogout"
      />
      
      <div class="main-navigation">
        <el-menu 
          :default-active="currentView" 
          mode="horizontal" 
          @select="handleMenuSelect"
          class="nav-menu"
        >
          <el-menu-item index="categories">
            <Icon icon="mdi:view-grid" />
            Kategorie
          </el-menu-item>
          <el-menu-item index="admin-panel" v-if="isAdminOrModerator">
            <Icon icon="mdi:cog" />
            Panel Administracyjny
          </el-menu-item>
        </el-menu>
      </div>

      <ForumStats v-if="currentView === 'categories'" :stats="stats" />
      
      <div class="forum-content">
        <CategoriesList 
          v-if="currentView === 'categories'"
          :categories="categories"
          :current-user="currentUser"
          @select-category="selectCategory"
        />
        
        <ActiveThreads 
          v-if="currentView === 'categories'"
          :threads="activeThreads"
        />
                
        <CategoryPage 
          v-if="currentView === 'category'"
          :category="selectedCategory"
          :threads="categoryThreads"
          :user="currentUser"
          @back-to-categories="currentView = 'categories'"
          @create-thread="showCreateThreadDialog = true"
          @select-thread="handleSelectThread"
          @delete-thread="handleDeleteThread"
        />
        
        <ThreadPage 
          v-if="currentView === 'thread'"
          :thread-data="selectedThread"
          :category="selectedCategory"
          :user="currentUser"
          @back-to-category="currentView = 'category'"
        />

        <!-- Użyj nowego komponentu AdminPanel -->
        <AdminPanel 
          v-if="currentView === 'admin-panel'" 
          :is-admin="isAdmin"
        />
        
              <PageUsers 
        v-if="currentView !== 'categories'"
      />
      </div>
    </div>

    <!-- Modale pozostają bez zmian -->
    <AuthModal 
      :show="showAuthModalVisible" 
      :is-login="authModalIsLogin"
      @update:show="showAuthModalVisible = $event"
      @switch-mode="authModalIsLogin = !authModalIsLogin"
      @login-success="handleLoginSuccess"
    />

    <UserProfile 
      :show="showProfileModal" 
      :user="currentUser"
      @update:show="showProfileModal = $event"
      @profile-updated="loadUserProfile"
    />

    <ManageCategoryModal 
      :show="showCategoryModal"
      @update:show="showCategoryModal = $event"
      @category-saved="loadCategories"
    />
    
    <CreateThreadModal 
      v-if="selectedCategory"
      :show="showCreateThreadDialog"
      :category="selectedCategory"
      :user="currentUser"
      @update:show="showCreateThreadDialog = $event"
      @create-thread="handleCreateThread"
      @closed="resetThreadForm"
    />
  </div>
</template>

<script>
import ForumHeader from './components/ForumHeader.vue'
import ForumStats from './components/ForumStats.vue'
import CategoriesList from './components/CategoriesList.vue'
import ActiveThreads from './components/ActiveThreads.vue'
import CategoryPage from './components/CategoryPage.vue'
import AuthModal from './components/AuthModal.vue'
import UserProfile from './components/UserProfile.vue'
import UsersManagement from './components/UsersManagement.vue'
import ManageCategoryModal from './components/ManageCategoryModal.vue'
import CategoryManagement from './components/CategoryManagement.vue'
import ThreadPage from './components/ThreadPage.vue'
import CreateThreadModal from './components/CreateThreadModal.vue'
import ThreadsManagement from './components/ThreadsManagement.vue' 
import PostsManagement from './components/PostsManagement.vue';
import AdminPanel from './components/AdminPanel.vue';
import PageUsers from './components/PageUsers.vue';
import { Icon } from "@iconify/vue";
import axios from 'axios'

export default {
  name: 'App',
  components: {
    ForumHeader,
    ForumStats,
    CategoriesList,
    ActiveThreads,
    CategoryPage,
    AuthModal,
    UserProfile,
    UsersManagement,
    ManageCategoryModal,
    CategoryManagement,
    ThreadPage,
    CreateThreadModal,
    ThreadsManagement,
    PostsManagement,
    AdminPanel,
    PageUsers,
    Icon
  },
  data() {
    return {
      darkMode: false,
      currentView: 'categories',
      selectedCategory: null,
      categories: [],
      activeThreads: [],
      categoryThreads: [],
      stats: {
        threads: 1243,
        posts: 5892,
        users: 1057
      },
      showCreateThreadDialog: false,
      selectedCategory: null,
      showAuthModalVisible: false,
      authModalIsLogin: true,
      showProfileModal: false,
      showCategoryModal: false,
      currentUser: null,
      newThreadForm: {
        title: '',
        content: ''
      }
    }
  },
  async created() {
    await this.restoreUserSession();
  },
  computed: {
    isAdmin() {
      // Bezpieczne sprawdzenie - uwzględnij że currentUser może być null
      return this.currentUser && this.currentUser.role_id === 1;
    },
    isModerator() {
      return this.currentUser && this.currentUser.role_id === 2;
    },
    isUser() {
      return this.currentUser && this.currentUser.role_id === 3;
    },
    isAdminOrModerator() {
      return this.isAdmin || this.isModerator;
    }
  },
  methods: {
    toggleDarkMode() {
      this.darkMode = !this.darkMode
      localStorage.setItem('darkMode', this.darkMode)
      this.updateDarkMode()
    },
    async restoreUserSession() {
      const token = localStorage.getItem('authToken')
      const userDataStr = localStorage.getItem('userData')

      if (token && userDataStr) {
        try {
          // Ustaw token w headerze axios (na wypadek, gdyby interceptor nie zadziałał)
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          // Zweryfikuj token i pobierz aktualne dane użytkownika
          const response = await axios.get('/profile')
          this.currentUser = response.data
        } catch (error) {
          console.error('Błąd weryfikacji tokena:', error)
          this.clearAuthData()
        }
      }
    },
    clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    delete axios.defaults.headers.common['Authorization'];
  },
    updateDarkMode() {
      if (this.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    selectCategory(category) {
      this.selectedCategory = category
      this.currentView = 'category'
      this.loadCategoryThreads(category.id)
    },
    handleMenuSelect(index) {
      this.currentView = index;
    },
    selectThread(thread) {
      if (!thread || !thread.id) {
        console.error('App.vue - BŁĄD: Brak ID wątku!', thread);
        this.$message.error('Błąd: Nieprawidłowy wątek');
        return;
      }
      
      this.selectedThread = thread;
      this.currentView = 'thread';
    },
    handleCreateThread(threadData) {
      this.createNewThread(threadData);
    },
    
    async createNewThread(threadData) {
      
      if (!this.selectedCategory) {
        this.$message.error('Nie wybrano kategorii');
        return;
      }

      if (this.selectedCategory.is_locked) {
        if (!this.currentUser || (this.currentUser.role !== 1 && this.currentUser.role !== 2)) {
          this.$message.warning('Nie możesz tworzyć wątków w zablokowanej kategorii');
          return;
        }
      }

      try {
        const response = await axios.post('/threads', threadData);
        this.$message.success('Wątek został utworzony');
        this.showCreateThreadDialog = false;
        this.loadCategoryThreads(this.selectedCategory.id);
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas tworzenia wątku');
      }
    },
    
    resetThreadForm() {
      this.newThreadForm = {
        title: '',
        content: ''
      };
    },
    
        handleSelectThread(thread) {
      this.selectThread(thread);
    },
    
    selectThread(thread) {
      if (!thread) {
        console.error('App.vue - BŁĄD: thread jest undefined/null');
        return;
      }
      
      if (!thread.id) {
        console.error('App.vue - BŁĄD: thread nie ma ID:', thread);
        return;
      }

      this.selectedThread = thread;
      this.currentView = 'thread';
      
      // Dodajmy też do localStorage aby sprawdzić czy metoda jest wołana
      localStorage.setItem('lastSelectedThread', JSON.stringify(thread));
    },
    
async loadCategories() {
  try {
    const response = await axios.get('/categories');
    this.categories = response.data;
  } catch (error) {
    console.error('Error loading categories:', error);
  }
},
    async loadActiveThreads() {
      try {
        const response = await axios.get('/active-threads')
        this.activeThreads = response.data
      } catch (error) {
        console.error('Error loading active threads:', error)
      }
    },
    async loadCategoryThreads(categoryId) {
      try {
        const response = await axios.get(`/category/${categoryId}/threads`)
        this.categoryThreads = response.data
      } catch (error) {
        console.error('Error loading category threads:', error)
      }
    },
async loadStats() {
  try {
    const response = await axios.get('/stats');
    this.stats = response.data;
    this.$emit('stats-updated', this.stats);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
},

    showAuthModal(isLogin) {
      this.authModalIsLogin = isLogin;
      this.showAuthModalVisible = true;
    },
    
    async handleLoginSuccess(user) {
      this.currentUser = user;
      const token = localStorage.getItem('authToken')
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
      await this.loadUserProfile();
      this.$message.success(`Witaj ${user.username}!`);
    },
    
    async loadUserProfile() {
      try {
        const response = await axios.get('/profile');
        this.currentUser = { ...this.currentUser, ...response.data };
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    },
    
    handleLogout() {
      this.clearAuthData();
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
      this.currentUser = null;
      this.$message.success('Wylogowano pomyślnie');
    },
    
    async handleDeleteThread(threadId) {
      try {
        await axios.delete(`/thread/${threadId}`);
        this.$message.success('Wątek został usunięty');
        this.loadCategoryThreads(this.selectedCategory.id);
      } catch (error) {
        this.$message.error(error.response?.data?.error || 'Wystąpił błąd podczas usuwania wątku');
      }
    },
    async updateUserActivity() {
      try {
        await axios.post('/update-activity',{
    user: this.currentUser,
  });
      } catch (error) {
        console.error('Błąd aktualizacji aktywności:', error);
      }
    }
  },
  async mounted() {
    // Sprawdź zapisane preferencje przy załadowaniu
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      this.darkMode = savedMode === 'true';
      this.updateDarkMode();
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.darkMode = true;
      this.updateDarkMode();
    }
    
    // Sprawdź czy użytkownik jest zalogowany
    const token = localStorage.getItem('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        await this.loadUserProfile();
        this.updateUserActivity();
      } catch (error) {
        console.error('Error loading user profile:', error);
        this.handleLogout();
      }
    }
    
    setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token) { // jeśli użytkownik jest zalogowany
        this.updateUserActivity();
      }
    }, 60000); // co 60 sekund
    
    // Załaduj dane
    await this.loadCategories();
    await this.loadActiveThreads();
    await this.loadStats();
  }
}
</script>

<style src="./styles.css"></style>
<style>
.main-navigation {
  margin-bottom: 20px;
}

.nav-menu {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(31, 38, 135, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--card-border);
}

.nav-menu .el-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
