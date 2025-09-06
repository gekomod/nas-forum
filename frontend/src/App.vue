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
        @show-notifications="currentView = 'notifications'"
        @view-thread="handleViewThread"
        @show-private-messages="currentView = 'private-messages'"
        @logout="handleLogout"
      />
      
      <div class="main-navigation">
        <el-menu 
          :default-active="currentView" 
          mode="horizontal" 
          @select="handleMenuSelect"
          class="nav-menu"
        >
          <el-menu-item index="categories" @click="forceGoToHome">
            <Icon icon="mdi:view-grid" />
            Kategorie
          </el-menu-item>
          <el-menu-item index="private-messages" v-if="currentUser">
	      <Icon icon="mdi:email" />
	      Wiadomości
	  </el-menu-item>
        <el-menu-item index="admin-panel" v-if="hasPermission('manage_users')">
          <Icon icon="mdi:cog" />
          Panel Administracyjny
        </el-menu-item>
        </el-menu>

  <div class="auth-buttons" v-if="!currentUser">
    <el-button 
      class="auth-btn login-btn" 
      @click="showAuthModal(true)"
      size="small"
    >
      <Icon icon="mdi:login" />
      Zaloguj
    </el-button>
    <el-button 
      class="auth-btn register-btn" 
      @click="showAuthModal(false)"
      type="primary"
      size="small"
    >
      <Icon icon="mdi:account-plus" />
      Rejestracja
    </el-button>
  </div>

      </div>
      
      <div class="forum-content">
        
        <CategoriesList 
        v-if="currentView === 'categories'"
  ref="categoriesList"
  :categories="categories" 
  :currentUser="currentUser"
  @select-category="selectCategory"
  @refresh-categories="loadCategories"
/>
                
        <CategoryPage 
          v-if="currentView === 'category'"
          :category="selectedCategory"
          :threads="categoryThreads"
          :user="currentUser"
          @back-to-categories="goToHome"
          @create-thread="showCreateThreadDialog = true"
          @select-thread="handleSelectThread"
          @delete-thread="handleDeleteThread"
          @refresh-category="loadCategoryThreads"
          @category-visited="handleCategoryVisited"
        />
        
        <ThreadPage 
          v-if="currentView === 'thread'"
          :thread-data="selectedThread"
          :category="selectedCategory"
          :user="currentUser"
          @back-to-category="goToCategory"
          @category-visited="handleCategoryVisited"
        />

        <!-- Użyj nowego komponentu AdminPanel -->
    <AdminPanel 
      v-if="currentView === 'admin-panel'" 
      :is-admin="isAdmin"
      :current-user-id="currentUser ? currentUser.id : null"
      :current-user="currentUser"
    />
        
          <PrivateMessages 
	    v-if="currentView === 'private-messages'"
	    :current-user="currentUser"
	    @show-profile="showProfileModal = true"
	  />
        
        <NotificationsPage v-if="currentView === 'notifications'" />
        
	<UserProfilePage 
	  v-if="currentView === 'user-profile'"
	  :userId="selectedUserId"
	  @back="currentView = 'categories'"
	  @edit-profile="showProfileModal = true"
	  @view-thread="handleViewThread"
	/>
        
        <PageUsers v-if="!['user-profile', 'category', 'categories', 'private-messages', 'notifications', 'admin-panel'].includes(currentView)"/>
      
      <ForumStats v-if="!['user-profile', 'private-messages', 'notifications', 'admin-panel'].includes(currentView)" :stats="stats" />
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
      :current-user="currentUser"
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
import NotificationsPage from './components/NotificationsPage.vue';
import PrivateMessages from './components/PrivateMessages.vue';
import UserProfilePage from './components/UserProfilePage.vue';
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
    NotificationsPage,
    PrivateMessages,
    UserProfilePage,
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
      selectedUserId: null,
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
      return this.hasPermission('manage_users'); // Administrator ma wszystkie uprawnienia
    },
    isModerator() {
      return this.hasPermission('manage_threads'); // Moderator ma uprawnienia do zarządzania wątkami
    },
    isAdminOrModerator() {
      return this.hasPermission('manage_users') || this.hasPermission('manage_threads');
    },
    isUser() {
      return this.currentUser && this.currentUser.role === 3;
    }
  },
  methods: {
    toggleDarkMode() {
      this.darkMode = !this.darkMode
      localStorage.setItem('darkMode', this.darkMode)
      this.updateDarkMode()
    },
    hasPermission(permissionName) {
      return this.$hasPermission(permissionName);
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
  // Modyfikacja metody selectCategory
  selectCategory(category) {
    this.selectedCategory = category;
    this.currentView = 'category';
    this.loadCategoryThreads(category.id);
    
    // Zaktualizuj URL
    window.history.pushState({}, '', `/category/${category.slug}`);
  },
  handleMenuSelect(index) {
    if (index === 'categories') {
      this.forceGoToHome();
    } else {
      this.currentView = index;
    }
  },
  forceGoToHome() {
    // Tylko jeśli NIE jesteśmy już na stronie głównej, zmieniaj URL
    if (this.currentView !== 'categories' || window.location.pathname !== '/') {
      this.currentView = 'categories';
      this.selectedCategory = null;
      this.selectedThread = null;
      window.history.pushState({}, '', '/');
    }
    
    // Zawsze odświeżaj dane gdy klikamy "Kategorie"
    this.loadCategories();
    this.loadActiveThreads();
  },
  goToHome() {
    this.currentView = 'categories';
    this.selectedCategory = null;
    this.selectedThread = null;
    window.history.pushState({}, '', '/');
  },
  selectThread(thread) {
    // Zapisz czas ostatniej wizyty w kategorii
    this.markCategoryVisited(this.category.id);
    
    if (!thread) {
      console.error('CategoryPage - BŁĄD: thread jest undefined/null');
      return;
    }
    
    try {
      // Zamiast emitować event, zmień URL
      const slug = this.generateSlug(thread.title);
      window.history.pushState({ threadId: thread.id }, '', `/thread/${thread.id}/${slug}`);
      
      // Powiadom komponent nadrzędny o zmianie wątku
      this.$emit('select-thread', thread);
      
      // Powiadom komponent CategoriesList o zmianie
      this.$emit('category-visited', this.category.id);
    } catch (error) {
      console.error('CategoryPage - BŁĄD podczas emitowania:', error);
    }
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
    
  handleUrl() {
    const path = window.location.pathname;
    
    // Obsługa strony głównej
    if (path === '/' || path === '') {
      this.currentView = 'categories';
      this.selectedCategory = null;
      this.selectedThread = null;
      return;
    }
    
    // Obsługa ścieżki kategorii: /category/nazwa-kategorii
    if (path.startsWith('/category/')) {
      const slug = path.split('/')[2];
      this.loadCategoryBySlug(slug);
    } 
    // Obsługa ścieżki wątku: /thread/id/nazwa-watku
    else if (path.startsWith('/thread/')) {
      const parts = path.split('/');
      const threadId = parseInt(parts[2]);
      
      if (!isNaN(threadId)) {
        this.loadThreadById(threadId);
      } else {
        console.error('Invalid thread ID:', parts[2]);
        this.currentView = 'categories';
      }
    }
    // Obsługa profilu użytkownika
    else if (path.startsWith('/profile/')) {
      const userId = path.split('/')[2];
      if (userId) {
        this.selectedUserId = parseInt(userId);
        this.currentView = 'user-profile';
      }
    }
    // Dla nieznanych ścieżek - przekieruj na stronę główną
    else {
      this.currentView = 'categories';
      window.history.replaceState({}, '', '/');
    }
  },
  
  setupNavigation() {
    window.addEventListener('popstate', (event) => {
      // Zapobiegaj domyślnemu zachowaniu
      event.preventDefault();
      
      // Obsłuż zmianę URL
      this.handleUrl();
    });
  },
  
  goToCategory() {
    if (this.selectedCategory) {
      const slug = this.generateSlug(this.selectedCategory.name);
      window.history.pushState({}, '', `/category/${slug}`);
      this.currentView = 'category';
    } else {
      this.goToHome();
    }
  },
  
  async loadThreadById(threadId) {
    try {
      // Najpierw pobierz dane wątku
      const threadResponse = await axios.get(`/thread/${threadId}`);
      this.selectedThread = threadResponse.data.thread;
      
      // Następnie pobierz kategorię dla breadcrumbs
      try {
        const categoryResponse = await axios.get(`/category/id/${this.selectedThread.category_id}`);
        this.selectedCategory = categoryResponse.data;
      } catch (categoryError) {
        console.error('Error loading category:', categoryError);
        // Utwórz tymczasowy obiekt kategorii jeśli nie uda się pobrać
        this.selectedCategory = {
          id: this.selectedThread.category_id,
          name: 'Unknown Category',
          slug: 'unknown'
        };
      }
      
      this.currentView = 'thread';
      
      // Zaktualizuj URL w przeglądarce z poprawnym slugiem
      const slug = this.generateSlug(this.selectedThread.title);
      window.history.replaceState({}, '', `/thread/${threadId}/${slug}`);
      
    } catch (error) {
      console.error('Error loading thread by ID:', error);
      this.$message.error('Wątek nie istnieje');
      this.currentView = 'categories';
      window.history.replaceState({}, '', '/');
    }
  },
  
  async loadCategoryBySlug(slug) {
    try {
      const response = await axios.get(`/category/${slug}`);
      this.selectedCategory = response.data;
      this.currentView = 'category';
      this.loadCategoryThreads(this.selectedCategory.id);
      
      // Zaktualizuj URL w przeglądarce
      window.history.replaceState({}, '', `/category/${slug}`);
    } catch (error) {
      console.error('Error loading category by slug:', error);
      this.$message.error('Kategoria nie istnieje');
      this.currentView = 'categories';
      window.history.replaceState({}, '', '/');
    }
  },
    
    showUserProfile(userId) {
      this.selectedUserId = userId;
      this.currentView = 'user-profile';
    },
    
    async handleLoginSuccess(userData) {
      this.currentUser = userData;
      const token = localStorage.getItem('authToken')
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
      
      // Załaduj uprawnienia po zalogowaniu
      await this.$loadPermissions();
      this.$message.success(`Witaj ${userData.username}!`);
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
      
      // Wyczyść uprawnienia
      this.$permissions.clearPermissions();
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
        handleViewThread(threadId) {
      // Przełącz na widok wątku
      // Najpierw pobierz dane wątku
      axios.get(`/thread/${threadId}`)
        .then(response => {
          this.selectedThread = response.data.thread;
          this.currentView = 'thread';
        })
        .catch(error => {
          console.error('Error loading thread:', error);
          this.$message.error('Błąd podczas ładowania wątku');
        });
    },
    async updateUserActivity() {
      try {
        await axios.post('/update-activity',{
    user: this.currentUser,
  });
      } catch (error) {
        console.error('Błąd aktualizacji aktywności:', error);
      }
    },
        async loadSEOSettings() {
      try {
        const response = await axios.get('/seo-settings');
        const seoSettings = response.data;
        
        // Aktualizuj metadania strony
        if (seoSettings.home_title) {
          document.title = seoSettings.home_title;
        }
        
        if (seoSettings.home_description) {
          let metaDescription = document.querySelector('meta[name="description"]');
          if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
          }
          metaDescription.content = seoSettings.home_description;
        }
        
        if (seoSettings.global_keywords) {
          let metaKeywords = document.querySelector('meta[name="keywords"]');
          if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
          }
          metaKeywords.content = seoSettings.global_keywords;
        }
      } catch (error) {
        console.error('Błąd podczas pobierania ustawień SEO:', error);
      }
    },
    handleCategoryVisited(categoryId) {
	  // Odśwież status kategorii
	  if (this.$refs.categoriesList && this.$refs.categoriesList.updateCategoryStatus) {
	    const category = this.categories.find(c => c.id === categoryId);
	    if (category) {
	      this.$refs.categoriesList.updateCategoryStatus(category);
	    }
	  }
	},
  generateSlug(text) {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD') // rozdziela znaki diakrytyczne
      .replace(/[\u0300-\u036f]/g, '') // usuwa znaki diakrytyczne
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
  },
  async mounted() {
    // Obsługa URL przy załadowaniu
    this.handleUrl();
    this.setupNavigation();
  
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
        // Załaduj uprawnienia globalnie
        await this.$loadPermissions();
        await this.loadUserProfile();
        this.updateUserActivity();
      } catch (error) {
        console.error('Error loading permissions:', error);
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
	  if (this.currentView === 'categories') {
	    await this.loadCategories();
	    await this.loadActiveThreads();
	    await this.loadStats();
	    await this.loadSEOSettings();
	  }
  }
}
</script>

<style src="./styles.css"></style>
<style>
 .main-navigation {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.nav-menu {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(31, 38, 135, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--card-border);
  flex: 1;
}

.nav-menu .el-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.auth-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--card-border);
  transition: all 0.3s ease;
}

.auth-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 38, 135, 0.15);
}

.login-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.register-btn {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
  border: none;
}

.register-btn:hover {
  background: linear-gradient(135deg, var(--el-color-primary-light-3), var(--el-color-primary));
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
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
