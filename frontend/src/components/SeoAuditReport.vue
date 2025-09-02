<template>
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
      <el-table-column label="Akcje" width="120">
        <template #default="{ row }">
          <el-button size="small" @click="fixIssue(row)">
            Napraw
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
