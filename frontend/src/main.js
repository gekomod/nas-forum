import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import { Icon } from "@iconify/vue";
import 'element-plus/dist/index.css'
import App from './App.vue'
import axios from 'axios'
import VueMarkdownEditor from '@kangc/v-md-editor'
import '@kangc/v-md-editor/lib/style/base-editor.css'
import vuepressTheme from '@kangc/v-md-editor/lib/theme/vuepress.js'
import '@kangc/v-md-editor/lib/theme/style/vuepress.css'
import VMdPreviewHtml from '@kangc/v-md-editor/lib/preview-html';
import { GlobalPermissionsPlugin } from './plugins/globalPermissions'

import Prism from 'prismjs'

import plPL from '@kangc/v-md-editor/lib/lang/pl-PL';
import mitt from 'mitt'

VueMarkdownEditor.lang.use('pl-PL', plPL);

const emitter = mitt()

// highlightjs
import hljs from 'highlight.js';

// Konfiguracja axios
axios.defaults.baseURL = 'http://localhost:3000/api'

// Interceptor do automatycznego dodawania tokena do każdego żądania
axios.interceptors.request.use(
  (config) => {
    // Pobierz token z localStorage
    const token = localStorage.getItem('authToken')
    
    // Jeśli token istnieje, dodaj go do nagłówka Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Funkcja do pobierania i aktualizacji metadanych SEO
async function updateSEOMetadata() {
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
}
updateSEOMetadata();

VueMarkdownEditor.use(vuepressTheme, {
  Prism,
  Hljs: hljs,
})

const app = createApp(App)
// Dodaj emitter do globalnych właściwości
app.config.globalProperties.$emitter = emitter
app.use(ElementPlus)
app.use(VueMarkdownEditor)
app.use(GlobalPermissionsPlugin)
app.directive('tooltip', {
  mounted(el, binding) {
    el.setAttribute('title', binding.value);
  },
  updated(el, binding) {
    el.setAttribute('title', binding.value);
  }
});

app.provide('emitter', emitter)
app.mount('#app')

// Dodaj globalny komponent Iconify
app.component('iconify-icon', {
  template: `<span class="iconify" :data-icon="icon"></span>`,
  props: ['icon']
})

