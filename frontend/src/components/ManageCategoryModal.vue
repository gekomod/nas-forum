<template>
  <el-dialog v-model="visible" :title="isEdit ? 'Edytuj kategorię' : 'Nowa kategoria'" width="500px">
    <el-form :model="form" :rules="rules" ref="categoryForm" label-width="120px">
      <el-form-item label="Nazwa kategorii" prop="name">
        <el-input v-model="form.name" placeholder="Wpisz nazwę kategorii"></el-input>
      </el-form-item>
      
      <el-form-item label="Ikona" prop="icon">
        <el-input v-model="form.icon" placeholder="np. mdi:forum">
          <template #append>
            <el-button @click="showIconPicker = true">Wybierz</el-button>
          </template>
        </el-input>
      </el-form-item>
      
      <el-form-item label="Opis" prop="description">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="3" 
          placeholder="Krótki opis kategorii">
        </el-input>
      </el-form-item>
    </el-form>
    
    <el-dialog v-model="showIconPicker" title="Wybierz ikonę" width="600px" append-to-body>
      <div class="icon-picker">
        <div class="icon-grid">
          <div 
            v-for="icon in popularIcons" 
            :key="icon" 
            class="icon-item"
            :class="{ selected: form.icon === icon }"
            @click="selectIcon(icon)"
          >
            <Icon :icon="icon" />
            <span class="icon-name">{{ icon }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <template #footer>
      <el-button @click="visible = false">Anuluj</el-button>
      <el-button type="primary" @click="submitForm">
        {{ isEdit ? 'Zapisz' : 'Utwórz' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'ManageCategoryModal',
  components: { Icon },
  props: {
    show: Boolean,
    category: Object
  },
  data() {
    return {
      visible: this.show,
      isEdit: false,
      showIconPicker: false,
      form: {
        name: '',
        icon: '',
        description: ''
      },
      rules: {
        name: [
          { required: true, message: 'Nazwa kategorii jest wymagana', trigger: 'blur' }
        ],
        icon: [
          { required: true, message: 'Ikona jest wymagana', trigger: 'blur' }
        ]
      },
      popularIcons: [
        'mdi:forum',
        'mdi:bullhorn',
        'mdi:tools',
        'mdi:lightbulb',
        'mdi:chat',
        'mdi:help',
        'mdi:book',
        'mdi:code-tags',
        'mdi:gamepad',
        'mdi:music',
        'mdi:movie',
        'mdi:image',
        'mdi:download',
        'mdi:cloud',
        'mdi:server',
        'mdi:lock',
        'mdi:shield',
        'mdi:star',
        'mdi:heart',
        'mdi:alert'
      ]
    };
  },
  watch: {
    show(newVal) {
      this.visible = newVal;
      if (newVal && this.category) {
        this.isEdit = true;
        this.form = { ...this.category };
      } else if (newVal) {
        this.isEdit = false;
        this.form = { name: '', icon: '', description: '' };
      }
    }
  },
  methods: {
    selectIcon(icon) {
      this.form.icon = icon;
      this.showIconPicker = false;
    },
    submitForm() {
      this.$refs.categoryForm.validate(async (valid) => {
        if (valid) {
          try {
            const endpoint = this.isEdit 
              ? `/categories/${this.category.id}` 
              : '/categories';
            const method = this.isEdit ? 'put' : 'post';
            
            await axios[method](endpoint, this.form);
            
            this.$message.success(
              this.isEdit 
                ? 'Kategoria została zaktualizowana' 
                : 'Kategoria została utworzona'
            );
            
            this.visible = false;
            this.$emit('update:show', false);
            this.$emit('category-saved');
          } catch (error) {
            this.$message.error(error.response?.data?.error || 'Wystąpił błąd');
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.icon-picker {
  max-height: 400px;
  overflow-y: auto;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.icon-item:hover {
  background-color: #f5f7fa;
}

.icon-item.selected {
  border-color: #409EFF;
  background-color: #ecf5ff;
}

.icon-name {
  font-size: 12px;
  margin-top: 5px;
  text-align: center;
  word-break: break-all;
}
</style>
