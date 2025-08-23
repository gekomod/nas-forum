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

import Prism from 'prismjs'

import plPL from '@kangc/v-md-editor/lib/lang/pl-PL';

VueMarkdownEditor.lang.use('pl-PL', plPL);


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

VueMarkdownEditor.use(vuepressTheme, {
  Prism,
  Hljs: hljs,
})

const app = createApp(App)
app.use(ElementPlus)
app.use(VueMarkdownEditor)
app.mount('#app')

// Dodaj globalny komponent Iconify
app.component('iconify-icon', {
  template: `<span class="iconify" :data-icon="icon"></span>`,
  props: ['icon']
})

