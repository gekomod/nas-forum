<template>
  <el-dialog v-model="visible" :title="isLogin ? 'Logowanie' : 'Rejestracja'" width="700px">
    <el-form :model="form" :rules="rules" ref="authForm" label-width="200px">
      <el-form-item label="Nazwa użytkownika" prop="username" v-if="!isLogin">
        <el-input v-model="form.username" placeholder="Wpisz nazwę użytkownika"></el-input>
      </el-form-item>
      
      <el-form-item label="Email" prop="email" v-if="!isLogin">
        <el-input v-model="form.email" placeholder="Wpisz email"></el-input>
      </el-form-item>
      
      <el-form-item :label="isLogin ? 'Nazwa użytkownika' : 'Nazwa użytkownika/Email'" prop="login">
        <el-input v-model="form.login" :placeholder="isLogin ? 'Wpisz nazwę użytkownika' : 'Wpisz nazwę użytkownika lub email'"></el-input>
      </el-form-item>
      
      <el-form-item label="Hasło" prop="password">
        <el-input v-model="form.password" type="password" placeholder="Wpisz hasło"></el-input>
      </el-form-item>
      
      <el-form-item label="Powtórz hasło" prop="confirmPassword" v-if="!isLogin">
        <el-input v-model="form.confirmPassword" type="password" placeholder="Powtórz hasło"></el-input>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="auth-footer">
        <el-button @click="switchMode">
          {{ isLogin ? 'Utwórz konto' : 'Mam już konto' }}
        </el-button>
        <el-button type="primary" @click="submitForm">
          {{ isLogin ? 'Zaloguj' : 'Zarejestruj' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { Icon } from "@iconify/vue";
import axios from "axios";

export default {
  name: 'AuthModal',
  components: { Icon },
  props: {
    show: Boolean,
    isLogin: {
      type: Boolean,
      default: true
    }
  },
  data() {
    const validatePassword = (rule, value, callback) => {
      if (value !== this.form.password) {
        callback(new Error('Hasła nie są identyczne'));
      } else {
        callback();
      }
    };
    
    return {
      visible: this.show,
      form: {
        username: '',
        email: '',
        login: '',
        password: '',
        confirmPassword: ''
      },
      rules: {
        username: [
          { required: true, message: 'Nazwa użytkownika jest wymagana', trigger: 'blur' },
          { min: 3, message: 'Nazwa użytkownika musi mieć co najmniej 3 znaki', trigger: 'blur' }
        ],
        email: [
          { required: true, message: 'Email jest wymagany', trigger: 'blur' },
          { type: 'email', message: 'Podaj poprawny adres email', trigger: 'blur' }
        ],
        login: [
          { required: true, message: 'To pole jest wymagane', trigger: 'blur' }
        ],
        password: [
          { required: true, message: 'Hasło jest wymagane', trigger: 'blur' },
          { min: 6, message: 'Hasło musi mieć co najmniej 6 znaków', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: 'Proszę powtórzyć hasło', trigger: 'blur' },
          { validator: validatePassword, trigger: 'blur' }
        ]
      }
    };
  },
  watch: {
    show(newVal) {
      this.visible = newVal;
      if (!newVal) {
        this.$refs.authForm.resetFields();
      }
    }
  },
  methods: {
    switchMode() {
      this.$emit('switch-mode');
      this.$refs.authForm.resetFields();
    },
async submitForm() {
  this.$refs.authForm.validate(async (valid) => {
    if (valid) {
      try {
        const endpoint = this.isLogin ? '/login' : '/register';
        const data = this.isLogin 
          ? { username: this.form.login, password: this.form.password }
          : { username: this.form.username, email: this.form.email, password: this.form.password };
        
        const response = await axios.post(endpoint, data);
        
        if (this.isLogin) {
          const token = response.data.token;
          const userData = response.data.user;
          
          // Zapisz token i dane użytkownika
          localStorage.setItem('authToken', token);
          localStorage.setItem('userData', JSON.stringify(userData));
          
          // UPEWNIJ SIĘ ŻE AXIOS MA TOKEN
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Pobierz pełne dane użytkownika
          try {
            const profileResponse = await axios.get('/profile');
            this.$emit('login-success', profileResponse.data);
            
            // DODAJ: Wyzwól aktualizację osiągnięć po udanym logowaniu
            try {
              await axios.post('/user-activity', {
                activity_type: 'user_login',
                target_id: profileResponse.data.id,
                target_type: 'user'
              });
            } catch (activityError) {
              console.error('Error logging login activity:', activityError);
              // Nie przerywamy procesu logowania nawet jeśli logowanie aktywności się nie uda
            }
            
          } catch (profileError) {
            console.error('Błąd pobierania profilu:', profileError);
            this.$emit('login-success', userData);
            
            // DODAJ: Wyzwól aktualizację osiągnięć nawet jeśli pobieranie profilu się nie udało
            try {
              await axios.post('/user-activity', {
                activity_type: 'user_login',
                target_id: userData.id,
                target_type: 'user'
              });
            } catch (activityError) {
              console.error('Error logging login activity:', activityError);
            }
          }
          
          this.$message.success('Zalogowano pomyślnie');
        } else {
          // DODAJ: Dla rejestracji też możemy zalogować aktywność
          try {
            await axios.post('/user-activity', {
              activity_type: 'user_registered',
              target_id: response.data.user_id || null,
              target_type: 'user'
            });
          } catch (activityError) {
            console.error('Error logging registration activity:', activityError);
          }
          
          this.$message.success('Konto zostało utworzone. Możesz się teraz zalogować.');
          this.$emit('switch-mode');
        }
        
        this.visible = false;
        this.$emit('update:show', false);
      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Wystąpił błąd';
        this.$message.error(errorMessage);
        console.error('Błąd autoryzacji:', error);
      }
    }
  });
}
  }
}
</script>

<style scoped>
.auth-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style>
