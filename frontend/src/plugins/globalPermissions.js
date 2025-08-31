import { usePermissionsStore } from '@/stores/permissionsStore'

export const GlobalPermissionsPlugin = {
  install: (app) => {
    const permissionsStore = usePermissionsStore()
    
    // Dodaj globalne metody
    app.config.globalProperties.$hasPermission = (permissionName) => {
      return permissionsStore.hasPermission(permissionName)
    }
    
    app.config.globalProperties.$hasAnyPermission = (permissionNames) => {
      return permissionsStore.hasAnyPermission(permissionNames)
    }
    
    app.config.globalProperties.$loadPermissions = () => {
      return permissionsStore.loadPermissions()
    }
    
    // Dodaj store do globalnych właściwości
    app.config.globalProperties.$permissions = permissionsStore
  }
}
