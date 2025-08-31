<template>
  <div class="backup-management">
    <div class="backup-header">
      <h2><Icon icon="mdi:database-export" /> Zarządzanie Backupem i Eksportem</h2>
      <p>Twórz kopie zapasowe i eksportuj dane forum</p>
    </div>

    <div class="backup-content">
      <!-- Sekcja szybkich akcji -->
      <el-row :gutter="20" class="backup-actions">
        <el-col :span="8">
          <el-card shadow="hover" class="action-card">
            <div class="action-content">
              <Icon icon="mdi:database-plus" class="action-icon" />
              <h3>Utwórz Backup</h3>
              <p>Ręczne utworzenie pełnej kopii zapasowej</p>
              <el-button 
                type="primary" 
                @click="createBackup"
                :loading="creatingBackup"
              >
               <Icon icon="mdi:database-plus" /> Utwórz teraz
              </el-button>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="hover" class="action-card">
            <div class="action-content">
              <Icon icon="mdi:database-export" class="action-icon" />
              <h3>Eksport danych</h3>
              <p>Eksportuj wybrane dane w różnych formatach</p>
              <el-button 
                type="success" 
                @click="exportDialogVisible = true"
              >
               <Icon icon="mdi:database-export" /> Eksportuj
              </el-button>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="hover" class="action-card">
            <div class="action-content">
              <Icon icon="ix:restore-backup" class="action-icon" />
              <h3>Przywracanie</h3>
              <p>Przywróć forum z wybranej kopii zapasowej</p>
              <el-button 
                type="warning" 
                @click="restoreDialogVisible = true"
              >
               <Icon icon="ix:restore-backup" /> Przywróć
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Sekcja harmonogramu -->
      <el-card class="schedule-section" shadow="never">
        <template #header>
          <div class="card-header">
            <span><Icon icon="mdi:calendar-clock" /> Harmonogram Backupów</span>
            <el-button 
              type="primary" 
              @click="scheduleDialogVisible = true"
            >
             <Icon icon="mdi:plus" /> Dodaj harmonogram
            </el-button>
          </div>
        </template>
        
        <el-table :data="schedules" style="max-width: 1400px; width: 100% !important;">
          <el-table-column prop="name" label="Nazwa" width="180" />
          <el-table-column prop="type" label="Typ" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'full' ? 'primary' : 'success'">
                {{ scope.row.type === 'full' ? 'Pełny' : 'Przyrostowy' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="frequency" label="Częstotliwość" width="120">
            <template #default="scope">
              {{ formatFrequency(scope.row.frequency) }}
            </template>
          </el-table-column>
          <el-table-column prop="nextRun" label="Następne wykonanie" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.nextRun) }}
            </template>
          </el-table-column>
          <el-table-column prop="retention" label="Retencja" width="100">
            <template #default="scope">
              {{ scope.row.retention }} dni
            </template>
          </el-table-column>
          <el-table-column prop="enabled" label="Status" width="100">
            <template #default="scope">
              <el-switch
                v-model="scope.row.enabled"
                @change="toggleSchedule(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="Operacje" width="120">
            <template #default="scope">
              <el-button 
                size="small" 
                @click="editSchedule(scope.row)"
              >
               <Icon icon="fluent-emoji-flat:pencil" /> Edytuj
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="deleteSchedule(scope.row.id)"
              >
               <Icon icon="mdi:delete" /> Usuń
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Lista istniejących backupów -->
      <el-card class="backups-list" shadow="never">
        <template #header>
          <div class="card-header">
            <span><Icon icon="mdi:database" /> Dostępne Backupy</span>
            <div>
              <el-input
                v-model="searchQuery"
                placeholder="Szukaj backupów..."
                prefix-icon="Search"
                style="width: 240px; margin-right: 10px;"
              />
              <el-button 
                @click="refreshBackups"
                icon="mdi:refresh"
              >
                Odśwież
              </el-button>
            </div>
          </div>
        </template>
        
        <el-table :data="filteredBackups" style="width: 100%">
          <el-table-column prop="name" label="Nazwa" width="200" sortable />
          <el-table-column prop="createdAt" label="Data utworzenia" width="180" sortable>
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="size" label="Rozmiar" width="120" sortable>
            <template #default="scope">
              {{ formatFileSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column prop="type" label="Typ" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'full' ? 'primary' : 'success'">
                {{ scope.row.type === 'full' ? 'Pełny' : 'Przyrostowy' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Akcje" width="250">
            <template #default="scope">
              <el-button-group>
                <el-button 
                  size="small" 
                  @click="downloadBackup(scope.row)"
                >
                 <Icon icon="mdi:download" /> Pobierz
                </el-button>
                <el-button 
                  size="small" 
                  type="warning" 
                  @click="restoreBackup(scope.row)"
                >
                 <Icon icon="ix:restore-backup" /> Przywróć
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteBackup(scope.row.id)"
                >
                 <Icon icon="mdi:delete" /> Usuń
                </el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="backups.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </el-card>
    </div>

    <!-- Dialog tworzenia harmonogramu -->
    <el-dialog
      v-model="scheduleDialogVisible"
      :title="editingSchedule ? 'Edytuj harmonogram' : 'Dodaj harmonogram'"
      width="600px"
    >
      <el-form :model="scheduleForm" label-width="160px">
        <el-form-item label="Nazwa harmonogramu">
          <el-input v-model="scheduleForm.name" placeholder="Nazwa harmonogramu" />
        </el-form-item>
        <el-form-item label="Typ backupu">
          <el-radio-group v-model="scheduleForm.type">
            <el-radio label="full">Pełny backup</el-radio>
            <el-radio label="incremental">Backup przyrostowy</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Częstotliwość">
          <el-select v-model="scheduleForm.frequency" placeholder="Wybierz częstotliwość">
            <el-option label="Codziennie" value="daily" />
            <el-option label="Co tydzień" value="weekly" />
            <el-option label="Co miesiąc" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="Godzina wykonania">
          <el-time-picker
            v-model="scheduleForm.time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="Wybierz godzinę"
          />
        </el-form-item>
        <el-form-item label="Retencja (dni)">
          <el-input-number v-model="scheduleForm.retention" :min="1" :max="365" />
        </el-form-item>
        <el-form-item label="Aktywny">
          <el-switch v-model="scheduleForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="scheduleDialogVisible = false">Anuluj</el-button>
          <el-button type="primary" @click="saveSchedule">
            {{ editingSchedule ? 'Zaktualizuj' : 'Utwórz' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Dialog eksportu danych -->
    <el-dialog
      v-model="exportDialogVisible"
      title="Eksport danych"
      width="700px"
    >
      <el-form :model="exportForm" label-width="160px">
        <el-form-item label="Typ danych">
          <el-checkbox-group v-model="exportForm.dataTypes">
            <el-checkbox label="users">Użytkownicy</el-checkbox>
            <el-checkbox label="categories">Kategorie</el-checkbox>
            <el-checkbox label="threads">Tematy</el-checkbox>
            <el-checkbox label="posts">Posty</el-checkbox>
            <el-checkbox label="settings">Ustawienia</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Format eksportu">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="json">JSON</el-radio>
            <el-radio label="csv">CSV</el-radio>
            <el-radio label="xml">XML</el-radio>
            <el-radio label="sql">SQL</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Kompresja">
          <el-switch v-model="exportForm.compression" />
          <span class="form-help">Zapisz jako skompresowany plik ZIP</span>
        </el-form-item>
        <el-form-item v-if="exportForm.format === 'sql'" label="Struktura bazy">
          <el-radio-group v-model="exportForm.sqlStructure">
            <el-radio label="data">Tylko dane</el-radio>
            <el-radio label="structure">Tylko struktura</el-radio>
            <el-radio label="both">Dane i struktura</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">Anuluj</el-button>
          <el-button type="primary" @click="exportData" :loading="exporting">
            Eksportuj
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Dialog przywracania backupu -->
    <el-dialog
      v-model="restoreDialogVisible"
      title="Przywracanie backupu"
      width="600px"
    >
      <el-alert
        title="Ostrzeżenie"
        type="warning"
        description="Przywrócenie backupu spowoduje nadpisanie wszystkich obecnych danych. Ta operacja nie może zostać cofnięta."
        show-icon
        :closable="false"
        style="margin-bottom: 20px;"
      />
      <el-form :model="restoreForm" label-width="160px">
        <el-form-item label="Wybierz backup">
          <el-select v-model="restoreForm.backupId" placeholder="Wybierz backup do przywrócenia">
            <el-option
              v-for="backup in backups"
              :key="backup.id"
              :label="`${backup.name} (${formatDate(backup.createdAt)})`"
              :value="backup.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Tryb przywracania">
          <el-radio-group v-model="restoreForm.mode">
            <el-radio label="full">Pełne przywrócenie</el-radio>
            <el-radio label="partial">Częściowe przywrócenie</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="restoreForm.mode === 'partial'" label="Elementy do przywrócenia">
          <el-checkbox-group v-model="restoreForm.restoreItems">
            <el-checkbox label="users">Użytkownicy</el-checkbox>
            <el-checkbox label="categories">Kategorie</el-checkbox>
            <el-checkbox label="threads">Tematy</el-checkbox>
            <el-checkbox label="posts">Posty</el-checkbox>
            <el-checkbox label="settings">Ustawienia</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="restoreDialogVisible = false">Anuluj</el-button>
          <el-button 
            type="warning" 
            @click="confirmRestore" 
            :disabled="!restoreForm.backupId"
            :loading="restoring"
          >
            Przywróć backup
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from 'axios';

export default {
  name: 'BackupManagement',
  components: {
    Icon
  },
  data() {
    return {
      creatingBackup: false,
      exporting: false,
      restoring: false,
      scheduleDialogVisible: false,
      exportDialogVisible: false,
      restoreDialogVisible: false,
      editingSchedule: null,
      searchQuery: '',
      currentPage: 1,
      pageSize: 10,
      
      // Dane przykładowe - w rzeczywistości pobierane z API
      backups: [
        {
          id: 1,
          name: 'backup_20231015_full',
          createdAt: '2023-10-15T23:45:00',
          size: 5242880,
          type: 'full'
        }
      ],
      
      schedules: [
        {
          id: 1,
          name: 'Codzienny backup pełny',
          type: 'full',
          frequency: 'daily',
          time: '23:00',
          nextRun: '2023-10-17T23:00:00',
          retention: 7,
          enabled: true
        },
        {
          id: 2,
          name: 'Tygodniowy backup przyrostowy',
          type: 'incremental',
          frequency: 'weekly',
          time: '02:00',
          nextRun: '2023-10-22T02:00:00',
          retention: 30,
          enabled: true
        }
      ],
      
      scheduleForm: {
        name: '',
        type: 'full',
        frequency: 'daily',
        time: '02:00',
        retention: 7,
        enabled: true
      },
      
      exportForm: {
        dataTypes: ['users', 'categories', 'threads', 'posts'],
        format: 'json',
        compression: true,
        sqlStructure: 'both'
      },
      
      restoreForm: {
        backupId: null,
        mode: 'full',
        restoreItems: ['users', 'categories', 'threads', 'posts', 'settings']
      }
    };
  },
  computed: {
    filteredBackups() {
      if (!this.searchQuery) {
        return this.backups;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.backups.filter(backup => 
        backup.name.toLowerCase().includes(query) || 
        backup.type.toLowerCase().includes(query)
      );
    }
  },
  methods: {
    async createBackup() {
      this.creatingBackup = true;
      try {
        const response = await axios.post('/admin/backup/create');
        this.$message.success('Backup został utworzony pomyślnie');
        await this.loadBackups();
      } catch (error) {
        console.error('Błąd podczas tworzenia backupu:', error);
        this.$message.error('Wystąpił błąd podczas tworzenia backupu');
      } finally {
        this.creatingBackup = false;
      }
    },
    
    async loadBackups() {
      try {
        const response = await axios.get('/admin/backups');
        this.backups = response.data;
      } catch (error) {
        console.error('Błąd podczas ładowania backupów:', error);
      }
    },
    
    async loadSchedules() {
      try {
        const response = await axios.get('/admin/backup/schedules');
        this.schedules = response.data;
      } catch (error) {
        console.error('Błąd podczas ładowania harmonogramów:', error);
      }
    },
    
    async exportData() {
      this.exporting = true;
      try {
        const response = await axios.post('/admin/export', this.exportForm, {
          responseType: 'blob'
        });
        
        // Tworzenie linku do pobrania pliku
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Określenie nazwy pliku
        const timestamp = new Date().toISOString().slice(0, 10);
        const extension = this.exportForm.compression ? 'zip' : this.exportForm.format;
        link.setAttribute('download', `forum_export_${timestamp}.${extension}`);
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        this.$message.success('Dane zostały wyeksportowane pomyślnie');
        this.exportDialogVisible = false;
      } catch (error) {
        console.error('Błąd podczas eksportu danych:', error);
        this.$message.error('Wystąpił błąd podczas eksportu danych');
      } finally {
        this.exporting = false;
      }
    },
    
    async downloadBackup(backup) {
      try {
        const response = await axios.get(`/admin/backup/download/${backup.id}`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', backup.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Błąd podczas pobierania backupu:', error);
        this.$message.error('Wystąpił błąd podczas pobierania backupu');
      }
    },
    
    async deleteBackup(backupId) {
      try {
        await this.$confirm('Czy na pewno chcesz usunąć ten backup?', 'Potwierdzenie', {
          confirmButtonText: 'Tak',
          cancelButtonText: 'Anuluj',
          type: 'warning'
        });
        
        await axios.delete(`/admin/backup/${backupId}`);
        this.$message.success('Backup został usunięty');
        await this.loadBackups();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Błąd podczas usuwania backupu:', error);
          this.$message.error('Wystąpił błąd podczas usuwania backupu');
        }
      }
    },
    
    restoreBackup(backup) {
      this.restoreForm.backupId = backup.id;
      this.restoreDialogVisible = true;
    },
    
    async confirmRestore() {
      try {
        await this.$confirm(
          'Czy na pewno chcesz przywrócić ten backup? Ta operacja nadpisze wszystkie obecne dane i nie może zostać cofnięta.', 
          'Ostrzeżenie', 
          {
            confirmButtonText: 'Tak, przywróć',
            cancelButtonText: 'Anuluj',
            type: 'warning'
          }
        );
        
        this.restoring = true;
        await axios.post(`/admin/backup/restore/${this.restoreForm.backupId}`, {
          mode: this.restoreForm.mode,
          items: this.restoreForm.restoreItems
        });
        
        this.$message.success('Backup został przywrócony pomyślnie');
        this.restoreDialogVisible = false;
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Błąd podczas przywracania backupu:', error);
          this.$message.error('Wystąpił błąd podczas przywracania backupu');
        }
      } finally {
        this.restoring = false;
      }
    },
    
    saveSchedule() {
      if (this.editingSchedule) {
        // Aktualizuj istniejący harmonogram
        const index = this.schedules.findIndex(s => s.id === this.editingSchedule.id);
        if (index !== -1) {
          this.schedules.splice(index, 1, { ...this.scheduleForm, id: this.editingSchedule.id });
        }
      } else {
        // Dodaj nowy harmonogram
        const newId = Math.max(...this.schedules.map(s => s.id), 0) + 1;
        this.schedules.push({ ...this.scheduleForm, id: newId });
      }
      
      this.scheduleDialogVisible = false;
      this.resetScheduleForm();
    },
    
    editSchedule(schedule) {
      this.editingSchedule = schedule;
      this.scheduleForm = { ...schedule };
      this.scheduleDialogVisible = true;
    },
    
    deleteSchedule(scheduleId) {
      this.$confirm('Czy na pewno chcesz usunąć ten harmonogram?', 'Potwierdzenie', {
        confirmButtonText: 'Tak',
        cancelButtonText: 'Anuluj',
        type: 'warning'
      }).then(() => {
        this.schedules = this.schedules.filter(s => s.id !== scheduleId);
        this.$message.success('Harmonogram został usunięty');
      }).catch(() => {
        // Anulowano usuwanie
      });
    },
    
    toggleSchedule(schedule) {
      this.$message.success(`Harmonogram ${schedule.enabled ? 'włączony' : 'wyłączony'}`);
    },
    
    resetScheduleForm() {
      this.scheduleForm = {
        name: '',
        type: 'full',
        frequency: 'daily',
        time: '02:00',
        retention: 7,
        enabled: true
      };
      this.editingSchedule = null;
    },
    
    refreshBackups() {
      this.loadBackups();
      this.$message.success('Lista backupów odświeżona');
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleString('pl-PL');
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    formatFrequency(freq) {
      const frequencies = {
        daily: 'Codziennie',
        weekly: 'Co tydzień',
        monthly: 'Co miesiąc'
      };
      return frequencies[freq] || freq;
    }
  },
  mounted() {
    this.loadBackups();
    this.loadSchedules();
  }
};
</script>

<style scoped>
.backup-management {
  padding: 20px;
}

.backup-header {
  text-align: center;
  margin-bottom: 24px;
}

.backup-header h2 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 600;
}

.backup-header p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 16px;
}

.backup-actions {
  margin-bottom: 24px;
}

.action-card {
  height: 100%;
  text-align: center;
}

.action-content {
  padding: 20px 0;
}

.action-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--el-color-primary);
}

.action-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.action-content p {
  margin: 0 0 16px 0;
  color: var(--text-secondary);
}

.schedule-section, .backups-list {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.form-help {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
