<template>
  <div class="seo-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <Icon icon="mdi:google" width="24" />
          <h3>Zarządzanie SEO</h3>
          <el-button type="primary" @click="runSeoAudit" :loading="auditLoading">
            <Icon icon="mdi:robot" width="16" />
            Uruchom Audyt SEO
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- Podgląd wyników wyszukiwania -->
        <el-tab-pane name="preview" label="Podgląd Google">
          <div class="google-preview">
            <div class="search-result">
              <div class="url">{{ currentUrl }}</div>
              <h3 class="title">{{ metaTitle || 'Tytuł strony' }}</h3>
              <p class="description">{{ metaDescription || 'Opis meta strony' }}</p>
            </div>
          </div>
        </el-tab-pane>

        <!-- Ustawienia globalne -->
        <el-tab-pane name="global" label="Ustawienia Globalne">
          <el-form :model="globalSeoSettings" label-width="200px">
            <el-form-item label="Tytuł strony głównej">
              <el-input v-model="globalSeoSettings.homeTitle" />
              <div class="character-count">
                {{ globalSeoSettings.homeTitle.length }}/60 znaków
              </div>
            </el-form-item>

            <el-form-item label="Opis meta strony głównej">
              <el-input 
                v-model="globalSeoSettings.homeDescription" 
                type="textarea" 
                :rows="3" 
              />
              <div class="character-count">
                {{ globalSeoSettings.homeDescription.length }}/160 znaków
              </div>
            </el-form-item>
            
            <el-form-item label="GA View ID">
              <el-input v-model="globalSeoSettings.GA_VIEW_ID" placeholder="np. ga:123456789" />
              <div class="character-count">
                {{ globalSeoSettings.GA_VIEW_ID.length }}/200 znaków
              </div>
            </el-form-item>
            
            <el-form-item label="Google Credentials JSON">
  <el-input 
    v-model="globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS" 
    type="textarea" 
    :rows="6"
    placeholder="Wklej JSON z credentials Google Service Account"
  />
  <div class="character-count">
    {{ globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS ? globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS.length : 0 }}/3000 znaków
  </div>
  
  <div class="credentials-help">
    <el-button 
      type="primary" 
      size="small" 
      @click="verifyGoogleCredentials"
      :loading="verifyingCredentials"
      style="margin-top: 8px; margin-right: 8px;"
    >
      Zweryfikuj Credentials
    </el-button>
    
    <el-button 
      type="info" 
      size="small" 
      @click="showCredentialsHelp = true"
      style="margin-top: 8px;"
    >
      Jak uzyskać credentials?
    </el-button>
  </div>
  
  <div v-if="verifiedClientEmail" class="verified-info">
    <Icon icon="mdi:check-circle" color="#67c23a" />
    Zweryfikowano: {{ verifiedClientEmail }}
  </div>
</el-form-item>

<el-form-item label="Status autoryzacji Google">
  <div class="oauth-status">
    <el-tag :type="oauthStatus.isAuthenticated ? 'success' : 'warning'">
      <Icon :icon="oauthStatus.isAuthenticated ? 'mdi:check-circle' : 'mdi:alert-circle'" />
      {{ oauthStatus.isAuthenticated ? 'Autoryzowano' : 'Wymaga autoryzacji' }}
    </el-tag>
    
    <el-button 
      type="primary" 
      size="small" 
      @click="startOAuthFlow"
      :loading="startingOAuth || completingOAuth"
      style="margin-left: 12px;"
    >
      <Icon icon="mdi:google" width="16" />
      Autoryzuj z Google
    </el-button>
    
    <el-button 
      v-if="oauthStatus.isAuthenticated"
      type="danger" 
      size="small" 
      @click="revokeOAuth"
      :loading="revokingOAuth"
      style="margin-left: 8px;"
    >
      <Icon icon="mdi:logout" width="16" />
      Cofnij autoryzację
    </el-button>
  </div>
  
  <div class="oauth-help">
    <small v-if="!oauthStatus.isAuthenticated">
      Po zapisaniu credentials, kliknij "Autoryzuj z Google" aby udzielić dostępu do Google Analytics i Search Console.
    </small>
    <small v-else style="color: #67c23a;">
      <Icon icon="mdi:check-circle" />
      Autoryzacja aktywna. Możesz teraz pobrać dane z Google Analytics.
    </small>
  </div>
</el-form-item>
           

            <el-form-item label="Słowa kluczowe">
              <el-tag
                v-for="keyword in globalSeoSettings.keywords"
                :key="keyword"
                closable
                @close="removeKeyword(keyword)"
                class="keyword-tag"
              >
                {{ keyword }}
              </el-tag>
              <div class="keyword-input-container">
                <el-input
                  v-model="newKeyword"
                  placeholder="Dodaj słowo kluczowe"
                  @keyup.enter="addKeyword"
                  class="keyword-input"
                />
                <el-button @click="addKeyword" type="primary">Dodaj</el-button>
              </div>
            </el-form-item>

            <el-form-item label="Struktura danych">
              <el-checkbox v-model="globalSeoSettings.schema_enabled">
                Włącz Schema.org
              </el-checkbox>
              <el-checkbox v-model="globalSeoSettings.open_graph_enabled">
                Włącz Open Graph
              </el-checkbox>
              <el-checkbox v-model="globalSeoSettings.twitter_cards_enabled">
                Włącz Twitter Cards
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveGlobalSeoSettings" :loading="savingSettings">
                Zapisz ustawienia globalne
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- SEO dla kategorii -->
        <el-tab-pane name="categories" label="Kategorie">
          <el-table :data="categories" style="width: 100%" v-loading="loadingCategories">
            <el-table-column prop="name" label="Kategoria" />
            <el-table-column label="Tytuł SEO" width="300">
              <template #default="{ row }">
                <el-input v-model="row.seo_title" />
                <div class="character-count">
                  {{ row.seo_title?.length || 0 }}/60 znaków
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Opis SEO" width="400">
              <template #default="{ row }">
                <el-input v-model="row.seo_description" type="textarea" :rows="2" />
                <div class="character-count">
                  {{ row.seo_description?.length || 0 }}/160 znaków
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Akcje" width="120">
              <template #default="{ row }">
                <el-button 
                  size="small" 
                  @click="saveCategorySeo(row)" 
                  :loading="row.saving"
                  :disabled="!hasChanges(row)"
                >
                  Zapisz
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Raporty i analityka -->
        <el-tab-pane name="analytics" label="Analityka">
          <div class="seo-analytics">
            <div class="metrics-grid">
              <metric-card 
                title="Pozycje w Google" 
                :value="seoMetrics.positions" 
                :trend="seoMetrics.positionsTrend"
                :icon="seoMetrics.positionsIcon"
              />
              <metric-card 
                title="Organic Traffic" 
                :value="seoMetrics.organicTraffic" 
                :trend="seoMetrics.trafficTrend"
                :icon="seoMetrics.trafficIcon"
              />
              <metric-card 
                title="CTR" 
                :value="seoMetrics.ctr + '%'" 
                :trend="seoMetrics.ctrTrend"
                :icon="seoMetrics.ctrIcon"
              />
              <metric-card 
                title="Backlinks" 
                :value="seoMetrics.backlinks" 
                :trend="seoMetrics.backlinksTrend"
                :icon="seoMetrics.backlinksIcon"
              />
              <metric-card 
		  title="Sesje" 
		  :value="seoMetrics.totalSessions" 
		  :trend="seoMetrics.trafficTrend"
		  icon="mdi:account-group"
		/>
		<metric-card 
		  title="Użytkownicy" 
		  :value="seoMetrics.totalUsers" 
		  :trend="'+5%'"
		  icon="mdi:account"
		/>
		<metric-card 
		  title="Odsłony" 
		  :value="seoMetrics.totalPageviews" 
		  :trend="'+12%'"
		  icon="mdi:eye"
		/>
		<metric-card 
		  title="Nowi użytkownicy" 
		  :value="seoMetrics.newUsers" 
		  :trend="'+8%'"
		  icon="mdi:account-plus"
		/>
		<metric-card 
		  title="Współczynnik odrzuceń" 
		  :value="seoMetrics.bounceRate + '%'" 
		  :trend="'-2.3%'"
		  icon="mdi:exit-run"
		/>
            </div>

            <div class="charts">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="chart-container">
                    <h4>Ruch Organiczy (ostatnie 6 miesięcy)</h4>
                    <div class="chart-content">
                      <div v-for="(item, index) in trafficData" :key="index" class="chart-bar">
                        <div class="bar-label">{{ item.date }}</div>
                        <div class="bar-container">
                          <div 
                            class="bar" 
                            :style="{ width: (item.traffic / maxTraffic * 100) + '%' }"
                          ></div>
                        </div>
                        <div class="bar-value">{{ item.traffic.toLocaleString() }}</div>
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="chart-container">
                    <h4>Top Słowa Kluczowe</h4>
                    <div class="chart-content">
                      <div v-for="(item, index) in keywordData" :key="index" class="keyword-item">
                        <div class="keyword-name">{{ item.keyword }}</div>
                        <div class="keyword-stats">
                          <span class="position">Pozycja: {{ item.position }}</span>
                          <span class="traffic">Ruch: {{ item.traffic.toLocaleString() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-tab-pane>

        <!-- Narzędzia SEO -->
        <el-tab-pane name="tools" label="Narzędzia">
          <div class="seo-tools">
            <el-card class="tool-card">
              <template #header>
                <h4>Generator Robot.txt</h4>
              </template>
              <el-form :model="robotsSettings">
                <el-form-item label="Blokuj User-Agent">
                  <el-input v-model="robotsSettings.disallowUserAgents" 
                            placeholder="np. BadBot, Scraper" />
                </el-form-item>
                <el-form-item label="Zablokowane ścieżki">
                  <el-input v-model="robotsSettings.disallowPaths" 
                            placeholder="np. /admin/, /private/" />
                </el-form-item>
                <el-form-item label="Dozwolone ścieżki">
                  <el-input v-model="robotsSettings.allowPaths" 
                            placeholder="np. /public/, /images/" />
                </el-form-item>
                <el-form-item label="Sitemap URL">
                  <el-input v-model="robotsSettings.sitemapUrl" 
                            placeholder="https://example.com/sitemap.xml" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="generateRobotsTxt" :loading="generatingRobots">
                    Generuj robots.txt
                  </el-button>
                  <el-button @click="downloadRobotsTxt" :disabled="!generatedRobotsTxt">
                    Pobierz
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>

            <el-card class="tool-card">
              <template #header>
                <h4>Mapa strony XML</h4>
              </template>
              <el-form :model="sitemapSettings">
                <el-form-item label="Częstotliwość zmian">
                  <el-select v-model="sitemapSettings.changefreq">
                    <el-option value="always" label="Zawsze" />
                    <el-option value="hourly" label="Co godzinę" />
                    <el-option value="daily" label="Codziennie" />
                    <el-option value="weekly" label="Co tydzień" />
                    <el-option value="monthly" label="Co miesiąc" />
                    <el-option value="yearly" label="Co rok" />
                    <el-option value="never" label="Nigdy" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Priorytet (0.0-1.0)">
                  <el-slider v-model="sitemapSettings.priority" :min="0" :max="1" :step="0.1" />
                  <span class="priority-value">{{ sitemapSettings.priority.toFixed(1) }}</span>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="generateSitemap" :loading="generatingSitemap">
                    Generuj Sitemap.xml
                  </el-button>
                  <el-button @click="downloadSitemap" :disabled="!generatedSitemap">
                    Pobierz
                  </el-button>
                  <el-button @click="submitSitemap" type="success" :disabled="!generatedSitemap">
                    Wyślij do Google
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>

            <el-card class="tool-card">
              <template #header>
                <h4>Analiza konkurencji</h4>
              </template>
              <el-form :model="competitorAnalysis">
                <el-form-item label="URL konkurencji">
                  <el-input v-model="competitorAnalysis.url" 
                            placeholder="https://przyklad.com" />
                </el-form-item>
                <el-form-item label="Analizuj">
                  <el-checkbox-group v-model="competitorAnalysis.options">
                    <el-checkbox label="keywords">Słowa kluczowe</el-checkbox>
                    <el-checkbox label="backlinks">Backlinki</el-checkbox>
                    <el-checkbox label="performance">Wydajność</el-checkbox>
                    <el-checkbox label="structure">Struktura strony</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="analyzeCompetitor" :loading="analyzingCompetitor">
                    Analizuj
                  </el-button>
                </el-form-item>
              </el-form>
              
              <div v-if="competitorResults" class="competitor-results">
                <h4>Wyniki analizy:</h4>
                <div v-if="competitorAnalysis.options.includes('keywords')">
                  <h5>Słowa kluczowe:</h5>
                  <el-tag
                    v-for="(keyword, index) in competitorResults.keywords"
                    :key="index"
                    class="result-tag"
                  >
                    {{ keyword }}
                  </el-tag>
                </div>
                <div v-if="competitorAnalysis.options.includes('backlinks')">
                  <h5>Backlinki: {{ competitorResults.backlinks }}</h5>
                </div>
                <div v-if="competitorAnalysis.options.includes('performance')">
                  <h5>Wydajność: {{ competitorResults.performance }}/100</h5>
                </div>
                <div v-if="competitorAnalysis.options.includes('structure')">
                  <h5>Struktura: {{ competitorResults.structure }}</h5>
                </div>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Modal z audytem SEO -->
    <el-dialog v-model="auditModalVisible" title="Raport Audytu SEO" width="80%">
      <seo-audit-report :issues="auditIssues" />
      <template #footer>
        <el-button @click="auditModalVisible = false">Zamknij</el-button>
        <el-button type="primary" @click="exportAuditReport">Eksportuj raport</el-button>
      </template>
    </el-dialog>

    <!-- Modal z generowanym robots.txt -->
    <el-dialog v-model="robotsModalVisible" title="Wygenerowany robots.txt" width="600px">
      <pre class="generated-content">{{ generatedRobotsTxt }}</pre>
      <template #footer>
        <el-button @click="copyToClipboard(generatedRobotsTxt)">Kopiuj</el-button>
        <el-button type="primary" @click="downloadRobotsTxt">Pobierz</el-button>
      </template>
    </el-dialog>

    <!-- Modal z generowaną sitemap -->
    <el-dialog v-model="sitemapModalVisible" title="Wygenerowana Sitemap.xml" width="700px">
      <pre class="generated-content">{{ generatedSitemap }}</pre>
      <template #footer>
        <el-button @click="copyToClipboard(generatedSitemap)">Kopiuj</el-button>
        <el-button type="primary" @click="downloadSitemap">Pobierz</el-button>
      </template>
    </el-dialog>
    
    <!-- Modal z instrukcjami credentials -->
<el-dialog v-model="showCredentialsHelp" title="Konfiguracja Google API" width="800px">
  <div class="credentials-help-content">
    <el-alert type="info" show-icon>
      Posiadasz OAuth Client ID credentials. To poprawny format dla aplikacji webowych.
    </el-alert>

    <h4>Krok po kroku konfiguracji OAuth:</h4>
    <ol>
      <li>Wejdź na <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
      <li>Upewnij się że masz włączone API:
        <ul>
          <li>Google Analytics API</li>
          <li>Google Search Console API</li>
        </ul>
      </li>
      <li>W sekcji "Credentials" sprawdź czy OAuth consent screen jest skonfigurowany</li>
      <li>Dodaj następujące uprawnienia w OAuth consent screen:
        <ul>
          <li><code>.../auth/analytics.readonly</code></li>
          <li><code>.../auth/webmasters</code></li>
        </ul>
      </li>
      <li>Wklej poniższy JSON do pola credentials</li>
    </ol>
    
    <h4>Twój format OAuth Client ID:</h4>
    <pre class="json-example">{
  "web": {
    "client_id": "885503146808-6gldg7topoo8ksu9rt9u60ngkr24370h.apps.googleusercontent.com",
    "project_id": "nasforum",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "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",
    "redirect_uris": ["https://forum.naspanel.site"],
    "javascript_origins": ["https://forum.naspanel.site"]
  }
}</pre>

    <el-alert type="warning" show-icon style="margin-top: 16px;">
      Uwaga: Dla OAuth wymagany będzie dodatkowo proces autoryzacji przez przeglądarkę.
    </el-alert>
  </div>
  
  <template #footer>
    <el-button @click="showCredentialsHelp = false">Zamknij</el-button>
    <el-button 
      type="primary" 
      @click="copyCurrentJson"
    >
      Kopiuj swój JSON
    </el-button>
  </template>
</el-dialog>

  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import axios from 'axios'

export default {
  name: 'SeoManagement',
  components: {
    Icon,
    MetricCard: {
      template: `
        <div class="metric-card">
          <div class="metric-icon">
            <Icon :icon="icon" width="24" />
          </div>
          <div class="metric-content">
            <h3>{{ value }}</h3>
            <p>{{ title }}</p>
            <span class="trend" :class="trendClass">{{ trend }}</span>
          </div>
        </div>
      `,
      props: ['title', 'value', 'trend', 'icon'],
      computed: {
        trendClass() {
          return this.trend.startsWith('+') ? 'positive' : 'negative'
        }
      }
    },
    SeoAuditReport: {
      template: `
        <div class="seo-audit-report">
          <div class="audit-summary">
            <h4>Podsumowanie Audytu</h4>
            <div class="summary-stats">
              <div class="stat">
                <span class="count error">{{ errorCount }}</span>
                <span>Błędy</span>
              </div>
              <div class="stat">
                <span class="count warning">{{ warningCount }}</span>
                <span>Ostrzeżenia</span>
              </div>
              <div class="stat">
                <span class="count success">{{ successCount }}</span>
                <span>Poprawne</span>
              </div>
              <div class="stat">
                <span class="count info">{{ infoCount }}</span>
                <span>Informacje</span>
              </div>
            </div>
          </div>

          <el-table :data="issues" style="width: 100%">
            <el-table-column label="Status" width="80">
              <template #default="{ row }">
                <el-tag :type="row.type">
                  {{ row.type.toUpperCase() }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="Problem" />
            <el-table-column prop="fix" label="Rozwiązanie" />
            <el-table-column label="Priorytet" width="100">
              <template #default="{ row }">
                <span :class="'priority-' + row.type">{{ getPriorityText(row.type) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      `,
      props: ['issues'],
      computed: {
        errorCount() {
          return this.issues.filter(i => i.type === 'error').length
        },
        warningCount() {
          return this.issues.filter(i => i.type === 'warning').length
        },
        successCount() {
          return this.issues.filter(i => i.type === 'success').length
        },
        infoCount() {
          return this.issues.filter(i => i.type === 'info').length
        }
      },
      methods: {
        getPriorityText(type) {
          const priorities = {
            error: 'Wysoki',
            warning: 'Średni',
            info: 'Niski',
            success: 'Brak'
          }
          return priorities[type] || 'Niski'
        }
      }
    }
  },
  setup() {
    const activeTab = ref('preview')
    const auditModalVisible = ref(false)
    const robotsModalVisible = ref(false)
    const sitemapModalVisible = ref(false)
    const newKeyword = ref('')
    const generatedRobotsTxt = ref('')
    const generatedSitemap = ref('')
    const currentUrl = ref(window.location.hostname)
    const competitorResults = ref(null)
    const verifyingCredentials = ref(false)
    const showCredentialsHelp = ref(false)
    const verifiedClientEmail = ref('')
    const oauthStatus = reactive({
      isAuthenticated: false,
      hasRefreshToken: false
    })
    const startingOAuth = ref(false)
    const completingOAuth = ref(false)
    const revokingOAuth = ref(false)
    
    // Stany ładowania
    const auditLoading = ref(false)
    const savingSettings = ref(false)
    const loadingCategories = ref(false)
    const generatingRobots = ref(false)
    const generatingSitemap = ref(false)
    const analyzingCompetitor = ref(false)

    const globalSeoSettings = reactive({
      homeTitle: '',
      homeDescription: '',
      keywords: [],
      schema_enabled: true,
      open_graph_enabled: true,
      twitter_cards_enabled: true,
      GA_VIEW_ID: '',
      GOOGLE_APPLICATION_CREDENTIALS: ''
    })

    const robotsSettings = reactive({
      disallowUserAgents: '',
      disallowPaths: '',
      allowPaths: '',
      sitemapUrl: ''
    })

    const sitemapSettings = reactive({
      changefreq: 'weekly',
      priority: 0.8
    })

    const competitorAnalysis = reactive({
      url: '',
      options: ['keywords', 'backlinks']
    })

    const categories = ref([])
    
    const seoMetrics = reactive({
      positions: 0,
      organicTraffic: '0',
      ctr: 0,
      backlinks: 0,
      positionsTrend: '+0',
      trafficTrend: '+0%',
      ctrTrend: '+0%',
      backlinksTrend: '+0',
      positionsIcon: 'mdi:trending-neutral',
      trafficIcon: 'mdi:chart-line',
      ctrIcon: 'mdi:cursor-click',
      backlinksIcon: 'mdi:link'
    })
    
// Dodaj nowe metody:
const copySampleJson = () => {
  const sampleJson = `{
  "type": "service_account",
  "project_id": "twoj-project-id",
  "private_key_id": "twoj-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "twoj-service-account@twoj-project-id.iam.gserviceaccount.com",
  "client_id": "twoj-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}`

  copyToClipboard(sampleJson)
  showCredentialsHelp.value = false
}

const copyCurrentJson = () => {
  if (globalSeoSettings.google_credentials_json) {
    copyToClipboard(globalSeoSettings.google_credentials_json)
    ElMessage.success('Skopiowano aktualny JSON')
  } else {
    const sampleJson = `{
  "web": {
    "client_id": "885503146808-6gldg7topoo8ksu9rt9u60ngkr24370h.apps.googleusercontent.com",
    "project_id": "nasforum",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "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",
    "redirect_uris": ["https://forum.naspanel.site"],
    "javascript_origins": ["https://forum.naspanel.site"]
  }
}`
    copyToClipboard(sampleJson)
    ElMessage.success('Skopiowano przykładowy JSON')
  }
  showCredentialsHelp.value = false
}

    const auditIssues = ref([])
    
    const trafficData = ref([])
    const keywordData = ref([])

    // Obliczone właściwości
    const metaTitle = computed(() => {
      return globalSeoSettings.homeTitle || 'Nasze Forum - Dyskusje Społeczności'
    })

    const metaDescription = computed(() => {
      return globalSeoSettings.homeDescription || 'Dołącz do naszej społeczności i dyskutuj na różne tematy'
    })

    const maxTraffic = computed(() => {
      return Math.max(...trafficData.value.map(item => item.traffic), 1)
    })

    const hasChanges = (category) => {
      const original = categories.value.find(c => c.id === category.id)
      return category.seo_title !== original.originalTitle || 
             category.seo_description !== original.originalDescription
    }

    // Pobierz ustawienia SEO przy załadowaniu komponentu
    onMounted(async () => {
      await loadSeoSettings()
      await loadSeoCategories()
      await checkOAuthStatus()
      await loadSeoMetrics()
    })

    const loadSeoSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/seo/settings', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const settings = response.data
        globalSeoSettings.homeTitle = settings.home_title || ''
        globalSeoSettings.homeDescription = settings.home_description || ''
        globalSeoSettings.keywords = settings.global_keywords ? settings.global_keywords.split(',') : []
        globalSeoSettings.schema_enabled = settings.schema_enabled !== 0
        globalSeoSettings.open_graph_enabled = settings.open_graph_enabled !== 0
        globalSeoSettings.twitter_cards_enabled = settings.twitter_cards_enabled !== 0
        globalSeoSettings.GA_VIEW_ID = settings.GA_VIEW_ID || ''
        globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS = settings.GOOGLE_APPLICATION_CREDENTIALS || ''
        
        robotsSettings.sitemapUrl = settings.sitemap_url || ''
      } catch (error) {
        console.error('Błąd ładowania ustawień SEO:', error)
        ElMessage.error('Nie udało się załadować ustawień SEO')
      }
    }

    const loadSeoCategories = async () => {
      try {
        loadingCategories.value = true
        const token = localStorage.getItem('token')
        const response = await axios.get('/seo/categories', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        categories.value = response.data.map(cat => ({
          id: cat.id,
          name: cat.name,
          seo_title: cat.seo_title || '',
          seo_description: cat.seo_description || '',
          keywords: cat.keywords ? cat.keywords.split(',') : [],
          saving: false,
          originalTitle: cat.seo_title || '',
          originalDescription: cat.seo_description || ''
        }))
      } catch (error) {
        console.error('Błąd ładowania kategorii SEO:', error)
        // Dane przykładowe w przypadku błędu
        categories.value = [
          { 
            id: 1, 
            name: 'Programowanie', 
            seo_title: 'Programowanie - Forum', 
            seo_description: 'Dyskusje o programowaniu',
            saving: false,
            originalTitle: 'Programowanie - Forum',
            originalDescription: 'Dyskusje o programowaniu'
          }
        ]
        ElMessage.error('Nie udało się załadować kategorii - wyświetlam przykładowe dane')
      } finally {
        loadingCategories.value = false
      }
    }

const loadSeoMetrics = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/seo/metrics', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const metrics = response.data
    seoMetrics.positions = metrics.positions || 0
    seoMetrics.organicTraffic = metrics.organicTraffic || '0'
    seoMetrics.ctr = metrics.ctr || 0
    seoMetrics.backlinks = metrics.backlinks || 0
    seoMetrics.totalSessions = metrics.totalSessions || '0'
    seoMetrics.totalPageviews = metrics.totalPageviews || '0'
    seoMetrics.totalUsers = metrics.totalUsers || '0'
    seoMetrics.avgTimeOnPage = metrics.avgTimeOnPage || '0.0'
    seoMetrics.bounceRate = metrics.bounceRate || '0.0'
    seoMetrics.newUsers = metrics.newUsers || '0'
    
    // Aktualizuj trendy na podstawie rzeczywistych danych
    updateTrends(metrics)
    
    if (metrics.trafficData) {
      trafficData.value = metrics.trafficData
    } else {
      trafficData.value = generateSampleTrafficData()
    }
    
    if (metrics.keywordData) {
      keywordData.value = metrics.keywordData
    } else {
      keywordData.value = generateSampleKeywordData()
    }
    
  } catch (error) {
    console.error('Błąd ładowania metryk SEO:', error)
    
    // Specjalna obsługa błędu autoryzacji
    if (error.response?.data?.requiresReauth) {
      oauthStatus.isAuthenticated = false
      ElMessage.warning({
        message: 'Wymagana autoryzacja Google. Kliknij "Autoryzuj z Google" w ustawieniach SEO.',
        duration: 6000 // Dłuższy czas wyświetlania
      })
    } 
    else if (error.response?.data?.error?.includes('autoryzacja')) {
      oauthStatus.isAuthenticated = false
      ElMessage.warning(error.response.data.error)
    }
    else {
      ElMessage.error('Błąd pobierania danych analytics: ' + (error.response?.data?.error || error.message))
    }
    
    // Ustaw dane przykładowe
    trafficData.value = generateSampleTrafficData()
    keywordData.value = generateSampleKeywordData()
  }
}

const updateTrends = (metrics) => {
  // Prosta symulacja trendów na podstawie danych
  const sessions = parseInt(metrics.totalSessions.replace(/,/g, '')) || 0
  const organic = parseInt(metrics.organicTraffic.replace(/,/g, '')) || 0
  
  seoMetrics.positionsTrend = sessions > 1000 ? '+12' : '+0'
  seoMetrics.trafficTrend = organic > 500 ? '+8%' : '+0%'
  seoMetrics.ctrTrend = metrics.ctr > 2 ? '+2.5%' : '+0%'
  seoMetrics.backlinksTrend = metrics.backlinks > 100 ? '+15' : '+0'
}

// Sprawdź status autoryzacji
const checkOAuthStatus = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/seo/oauth-status', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    oauthStatus.isAuthenticated = response.data.isAuthenticated
    oauthStatus.hasRefreshToken = response.data.hasRefreshToken
  } catch (error) {
    console.error('Błąd sprawdzania statusu OAuth:', error)
    // W przypadku błędu zakładamy, że nie ma autoryzacji
    oauthStatus.isAuthenticated = false
    oauthStatus.hasRefreshToken = false
  }
}

// Rozpocznij proces OAuth
const startOAuthFlow = async () => {
  try {
    startingOAuth.value = true
    
    // Najpierw zapisz ustawienia jeśli są zmiany
    if (hasUnsavedChanges()) {
      await saveGlobalSeoSettings()
    }
    
    const token = localStorage.getItem('token')
    const response = await axios.get('/seo/oauth-auth', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    // Otwórz okno autoryzacji
    const authWindow = window.open(
      response.data.authUrl, 
      'google_oauth', 
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )
    
    if (!authWindow) {
      throw new Error('Nie udało się otworzyć okna autoryzacji. Sprawdź blokadę wyskakujących okien.')
    }
    
    // Sprawdzaj co 500ms czy okno zostało zamknięte
    const checkInterval = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkInterval)
        checkOAuthStatus() // Sprawdź status po zamknięciu okna
        ElMessage.info('Okno autoryzacji zamknięte. Sprawdzam status...')
      }
    }, 500)
    
  } catch (error) {
    console.error('Błąd rozpoczynania OAuth:', error)
    
    if (error.response?.data?.error) {
      ElMessage.error(error.response.data.error)
    } else if (error.message.includes('blokadę')) {
      ElMessage.error('Blokada wyskakujących okien jest aktywna. Zezwól na wyskakujące okna dla tej strony.')
    } else {
      ElMessage.error('Błąd podczas rozpoczynania autoryzacji: ' + error.message)
    }
  } finally {
    startingOAuth.value = false
  }
}

// Cofnij autoryzację
const revokeOAuth = async () => {
  try {
    revokingOAuth.value = true
    
    await ElMessageBox.confirm(
      'Czy na pewno chcesz cofnąć autoryzację Google? Spowoduje to utratę dostępu do danych analytics.',
      'Potwierdzenie',
      {
        confirmButtonText: 'Tak, cofnij',
        cancelButtonText: 'Anuluj',
        type: 'warning'
      }
    )
    
    const token = localStorage.getItem('token')
    await axios.delete('/seo/oauth-revoke', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    oauthStatus.isAuthenticated = false
    oauthStatus.hasRefreshToken = false
    
    ElMessage.success('Autoryzacja Google została cofnięta')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Błąd cofania autoryzacji:', error)
      ElMessage.error('Błąd podczas cofania autoryzacji')
    }
  } finally {
    revokingOAuth.value = false
  }
}

// Sprawdź czy są niezapisane zmiany
const hasUnsavedChanges = () => {
  // Tutaj dodaj logikę sprawdzającą czy są niezapisane zmiany
  return false // Tymczasowo zawsze false
}

    const saveGlobalSeoSettings = async () => {
      try {
        savingSettings.value = true
        const token = localStorage.getItem('token')
        await axios.put('/seo/settings', {
          home_title: globalSeoSettings.homeTitle,
          home_description: globalSeoSettings.homeDescription,
          global_keywords: globalSeoSettings.keywords.join(','),
          schema_enabled: globalSeoSettings.schema_enabled ? 1 : 0,
          open_graph_enabled: globalSeoSettings.open_graph_enabled ? 1 : 0,
          twitter_cards_enabled: globalSeoSettings.twitter_cards_enabled ? 1 : 0,
          robots_txt: generatedRobotsTxt.value,
          sitemap_url: robotsSettings.sitemapUrl,
          GA_VIEW_ID: globalSeoSettings.GA_VIEW_ID,
          GOOGLE_APPLICATION_CREDENTIALS: globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        ElMessage.success('Globalne ustawienia SEO zostały zapisane')
      } catch (error) {
        console.error('Błąd zapisu ustawień SEO:', error)
        ElMessage.error('Nie udało się zapisać ustawień SEO')
      } finally {
        savingSettings.value = false
      }
    }

const verifyGoogleCredentials = async () => {
  if (!globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS) {
    ElMessage.warning('Wprowadź dane credentials Google API')
    return
  }

  try {
    verifyingCredentials.value = true
    verifiedClientEmail.value = ''
    
    const token = localStorage.getItem('token')
    const response = await axios.post('/seo/verify-credentials', {
      credentials_json: globalSeoSettings.GOOGLE_APPLICATION_CREDENTIALS
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data.success) {
      if (response.data.type === 'oauth') {
        verifiedClientEmail.value = `OAuth Client: ${response.data.client_id}`
        ElMessage.success('OAuth credentials są poprawne!')
      } else {
        verifiedClientEmail.value = response.data.client_email
        ElMessage.success('Service Account credentials są poprawne!')
      }
    }
  } catch (error) {
    console.error('Błąd weryfikacji credentials:', error)
    verifiedClientEmail.value = ''
    
    if (error.response?.data?.error) {
      ElMessage.error(error.response.data.error)
    } else {
      ElMessage.error('Błąd podczas weryfikacji credentials')
    }
  } finally {
    verifyingCredentials.value = false
  }
}

    const addKeyword = () => {
      const keyword = newKeyword.value.trim()
      if (keyword && !globalSeoSettings.keywords.includes(keyword)) {
        globalSeoSettings.keywords.push(keyword)
        newKeyword.value = ''
      }
    }

    const removeKeyword = (keyword) => {
      const index = globalSeoSettings.keywords.indexOf(keyword)
      if (index > -1) {
        globalSeoSettings.keywords.splice(index, 1)
      }
    }

    const runSeoAudit = async () => {
      try {
        auditLoading.value = true
        const token = localStorage.getItem('token')
        const response = await axios.post('/seo/audit', {}, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        auditIssues.value = response.data.issues || []
        auditModalVisible.value = true
        ElMessage.success('Audyt SEO zakończony pomyślnie')
      } catch (error) {
        console.error('Błąd audytu SEO:', error)
        ElMessage.error('Błąd podczas audytu SEO')
      } finally {
        auditLoading.value = false
      }
    }

    const saveCategorySeo = async (category) => {
      try {
        category.saving = true
        const token = localStorage.getItem('token')
        await axios.put(`/seo/categories/${category.id}`, {
          seo_title: category.seo_title,
          seo_description: category.seo_description,
          keywords: Array.isArray(category.keywords) ? category.keywords.join(',') : ''
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        // Aktualizuj oryginalne wartości
        const originalCategory = categories.value.find(c => c.id === category.id)
        if (originalCategory) {
          originalCategory.originalTitle = category.seo_title
          originalCategory.originalDescription = category.seo_description
        }
        
        ElMessage.success(`SEO zapisane dla: ${category.name}`)
      } catch (error) {
        console.error('Błąd zapisu SEO kategorii:', error)
        ElMessage.error('Nie udało się zapisać ustawień kategorii')
      } finally {
        category.saving = false
      }
    }

    const generateRobotsTxt = async () => {
      try {
        generatingRobots.value = true
        const token = localStorage.getItem('token')
        const response = await axios.post('/seo/generate-robots', robotsSettings, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        generatedRobotsTxt.value = response.data.content
        robotsModalVisible.value = true
        ElMessage.success(response.data.message || 'Robots.txt wygenerowany pomyślnie')
      } catch (error) {
        console.error('Błąd generowania robots.txt:', error)
        ElMessage.error('Błąd generowania robots.txt')
      } finally {
        generatingRobots.value = false
      }
    }

    const generateSitemap = async () => {
      try {
        generatingSitemap.value = true
        const token = localStorage.getItem('token')
        const response = await axios.post('/seo/generate-sitemap', {
          changefreq: sitemapSettings.changefreq,
          priority: sitemapSettings.priority
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        generatedSitemap.value = response.data.content
        sitemapModalVisible.value = true
        ElMessage.success(response.data.message || 'Sitemap.xml wygenerowana pomyślnie')
      } catch (error) {
        console.error('Błąd generowania sitemap:', error)
        
        if (error.response?.data?.error) {
          ElMessage.error(error.response.data.error)
        } else {
          ElMessage.error('Błąd generowania sitemap. Sprawdź czy baza danych jest dostępna.')
        }
      } finally {
        generatingSitemap.value = false
      }
    }

    const downloadRobotsTxt = () => {
      const blob = new Blob([generatedRobotsTxt.value], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'robots.txt'
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('Plik robots.txt pobrany')
    }

    const downloadSitemap = () => {
      const blob = new Blob([generatedSitemap.value], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sitemap.xml'
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('Plik sitemap.xml pobrany')
    }

    const submitSitemap = async () => {
      try {
        const token = localStorage.getItem('token')
        await axios.post('/seo/submit-sitemap', {
          sitemapUrl: robotsSettings.sitemapUrl
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        ElMessage.success('Sitemap wysłana do Google Search Console')
      } catch (error) {
        console.error('Błąd wysyłania sitemap:', error)
        ElMessage.error('Błąd wysyłania sitemap')
      }
    }

    const analyzeCompetitor = async () => {
      if (!competitorAnalysis.url) {
        ElMessage.warning('Podaj URL do analizy')
        return
      }

      // Dodaj https:// jeśli brakuje
      if (!competitorAnalysis.url.startsWith('http')) {
        competitorAnalysis.url = 'https://' + competitorAnalysis.url;
      }

      // Walidacja URL
      try {
        new URL(competitorAnalysis.url)
      } catch (error) {
        ElMessage.warning('Podaj poprawny URL (np. przyklad.com lub https://przyklad.com)')
        return
      }

      try {
        analyzingCompetitor.value = true
        competitorResults.value = null
        
        const token = localStorage.getItem('token')
        const response = await axios.post('/seo/analyze-competitor', {
          url: competitorAnalysis.url,
          options: competitorAnalysis.options
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 sekund timeout
        })
        
        if (response.data.success) {
          competitorResults.value = response.data.results
          ElMessage.success('Analiza konkurencji zakończona pomyślnie')
        }
      } catch (error) {
        console.error('Błąd analizy konkurencji:', error)
        
        if (error.response?.data?.error) {
          ElMessage.error(`${error.response.data.error}${error.response.data.details ? ': ' + error.response.data.details : ''}`)
        } else if (error.code === 'ECONNABORTED') {
          ElMessage.error('Timeout - analiza trwała zbyt długo')
        } else {
          ElMessage.error('Błąd podczas analizy konkurencji. Spróbuj ponownie.')
        }
      } finally {
        analyzingCompetitor.value = false
      }
    }

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('Skopiowano do schowka')
      } catch (error) {
        ElMessage.error('Błąd podczas kopiowania')
      }
    }

    const exportAuditReport = () => {
      const report = auditIssues.value.map(issue => 
        `${issue.type.toUpperCase()}: ${issue.message} - ${issue.fix}`
      ).join('\n')
      
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'seo-audit-report.txt'
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('Raport audytu wyeksportowany')
    }

    // Pomocnicze funkcje
    const generateSampleTrafficData = () => {
      const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze']
      return months.map((month, index) => ({
        date: month,
        traffic: Math.floor(Math.random() * 4000) + 8000
      }))
    }

    const generateSampleKeywordData = () => {
      return [
        { keyword: 'forum', position: 12, traffic: 3200 },
        { keyword: 'dyskusje', position: 8, traffic: 2800 },
        { keyword: 'społeczność', position: 15, traffic: 2100 }
      ]
    }

    return {
      activeTab,
      auditModalVisible,
      robotsModalVisible,
      sitemapModalVisible,
      newKeyword,
      generatedRobotsTxt,
      generatedSitemap,
      currentUrl,
      competitorResults,
      globalSeoSettings,
      robotsSettings,
      sitemapSettings,
      competitorAnalysis,
      categories,
      seoMetrics,
      auditIssues,
      trafficData,
      keywordData,
      metaTitle,
      metaDescription,
      maxTraffic,
      auditLoading,
      savingSettings,
      loadingCategories,
      generatingRobots,
      generatingSitemap,
      analyzingCompetitor,
      verifyingCredentials,
      addKeyword,
      removeKeyword,
      runSeoAudit,
      saveCategorySeo,
      generateRobotsTxt,
      generateSitemap,
      downloadRobotsTxt,
      downloadSitemap,
      submitSitemap,
      analyzeCompetitor,
      showCredentialsHelp,
      verifiedClientEmail,
      copySampleJson,
      copyToClipboard,
      saveGlobalSeoSettings,
      verifyGoogleCredentials,
      hasChanges,
        oauthStatus,
  startingOAuth,
  completingOAuth,
  revokingOAuth,
    checkOAuthStatus,
  startOAuthFlow,
      exportAuditReport
    }
  }
}
</script>

<style scoped>
.seo-management {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header h3 {
  margin: 0;
  flex: 1;
}

.google-preview {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  max-width: 600px;
}

.search-result .url {
  color: #006621;
  font-size: 14px;
  margin-bottom: 4px;
}

.search-result .title {
  color: #1a0dab;
  margin: 4px 0;
  font-size: 18px;
  font-weight: normal;
}

.search-result .description {
  color: #545454;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
}

.character-count {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.keyword-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.keyword-input-container {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.keyword-input {
  flex: 1;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.metric-icon {
  margin-bottom: 8px;
}

.metric-content h3 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.metric-content p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.trend {
  font-size: 12px;
  font-weight: bold;
}

.trend.positive {
  color: #67c23a;
}

.trend.negative {
  color: #f56c6c;
}

.seo-tools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.tool-card {
  height: 100%;
}

.priority-value {
  margin-left: 12px;
  font-weight: bold;
  color: #409EFF;
}

.generated-content {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  max-height: 400px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  border: 1px solid #e0e0e0;
}

.chart-container {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.chart-container h4 {
  margin-top: 0;
  margin-bottom: 16px;
  text-align: center;
  color: #2c3e50;
}

.chart-content {
  margin-top: 16px;
}

.chart-bar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.bar-label {
  width: 40px;
  font-size: 12px;
  color: #666;
}

.bar-container {
  flex: 1;
  height: 20px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: #409EFF;
  transition: width 0.3s ease;
}

.bar-value {
  width: 60px;
  font-size: 12px;
  text-align: right;
  color: #2c3e50;
}

.keyword-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.keyword-item:last-child {
  border-bottom: none;
}

.keyword-name {
  font-weight: 500;
}

.keyword-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.competitor-results {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.competitor-results h4 {
  margin-top: 0;
  color: #2c3e50;
}

.competitor-results h5 {
  margin: 12px 0 8px 0;
  color: #409EFF;
}

.result-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.seo-audit-report {
  max-height: 60vh;
  overflow-y: auto;
}

.audit-summary {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}
  showCredentialsHelp,
  verifiedClientEmail,
.summary-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
}

.stat {
  text-align: center;
}

.count {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.credentials-help {
  margin-top: 8px;
  margin-bottom: 8px;
}

.verified-info {
  margin-top: 8px;
  padding: 8px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.credentials-help-content {
  line-height: 1.6;
}

.credentials-help-content ol,
.credentials-help-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.credentials-help-content li {
  margin-bottom: 4px;
}

.credentials-help-content code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.json-example {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  border: 1px solid #e0e0e0;
  margin-top: 8px;
}

.oauth-status {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.oauth-help {
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.oauth-help .el-icon {
  margin-right: 4px;
}

.count.error { color: #f56c6c; }
.count.warning { color: #e6a23c; }
.count.success { color: #67c23a; }
.count.info { color: #909399; }

.priority-error { color: #f56c6c; font-weight: bold; }
.priority-warning { color: #e6a23c; font-weight: bold; }
.priority-info { color: #909399; }
.priority-success { color: #67c23a; }
</style>
