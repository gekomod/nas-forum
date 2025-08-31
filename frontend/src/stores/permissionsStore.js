// stores/permissionsStore.js
import { ref, computed } from 'vue'
import axios from 'axios'

export const usePermissionsStore = () => {
  const userPermissions = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const loadPermissions = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        userPermissions.value = []
        return
      }

      const response = await axios.get('/profile')
      const userData = response.data
      
      // Jeśli backend zwraca bezpośrednio permissions
      if (userData.permissions && Array.isArray(userData.permissions)) {
        userPermissions.value = userData.permissions
        return
      }
      
      // Jeśli backend zwraca role_ids - pobierz uprawnienia z API
      if (userData.role_ids) {
        const roleIds = typeof userData.role_ids === 'string' 
          ? userData.role_ids.split(',').map(id => parseInt(id.trim()))
          : Array.isArray(userData.role_ids) ? userData.role_ids : [userData.role_ids]
        
        const permissionsResponse = await axios.get('/user-permissions', {
          params: { role_ids: roleIds.join(',') }
        })
        userPermissions.value = permissionsResponse.data.permissions || []
        return
      }
      
      // Jeśli backend zwraca obiekt roles
      if (userData.roles && Array.isArray(userData.roles)) {
        const roleIds = userData.roles.map(role => role.id)
        const permissionsResponse = await axios.get('/user-permissions', {
          params: { role_ids: roleIds.join(',') }
        })
        userPermissions.value = permissionsResponse.data.permissions || []
        return
      }
      
      userPermissions.value = []
      
    } catch (err) {
      console.error('Error loading permissions:', err)
      error.value = err.response?.data?.error || 'Błąd ładowania uprawnień'
      userPermissions.value = []
    } finally {
      isLoading.value = false
    }
  }

  const hasPermission = (permissionName) => {
    return userPermissions.value.includes(permissionName)
  }

  const hasAnyPermission = (permissionNames) => {
    return permissionNames.some(perm => userPermissions.value.includes(perm))
  }

  const clearPermissions = () => {
    userPermissions.value = []
  }

  return {
    userPermissions: computed(() => userPermissions.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    loadPermissions,
    hasPermission,
    hasAnyPermission,
    clearPermissions
  }
}
