<template>
    <nav class="bg-amber-50">  <!-- Change navbar color -->
      <div class="px-2 sm:px-4 lg:px-6">
        <div class="flex items-center justify-between h-16">
          <!-- Left: Site Title / Logo -->
          <router-link to="/" class="text-3xl font-serif text-gray-900">
            Let's Talk
          </router-link>
  
          <!-- Right: Nav Links -->
          <div class="flex space-x-8">
            <!-- <router-link
              to="/how-it-works"
              class="text-sm font-medium text-gray-800 hover:text-gray-900"
            >
              How it works
            </router-link> -->
  
            <!-- <router-link
              to="/about"
              class="text-sm font-medium text-gray-800 hover:text-gray-900"
            >
              About Us
            </router-link>
   -->
            <!-- Conditional rendering based on authentication status -->
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/login"
              class="text-sm font-medium text-gray-800 hover:text-gray-900"
            >
              Login / Sign up
            </router-link>
            
            <button
              v-else
              @click="handleLogout"
              class="px-4 py-2 text-base font-medium text-gray-900 bg-orange-200 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  </template>
  
  <script>
  import { useAuthStore } from '../authentication/auth.js';
  import { useRouter } from 'vue-router';
  
  export default {
    name: "Navbar",
    setup() {
      const authStore = useAuthStore();
      const router = useRouter();
      
      return {
        authStore,
        router,
      };
    },
    methods: {
      async handleLogout() {
        try {
          await this.authStore.logout(this.router);
        } catch (error) {
          console.error('Logout failed:', error);
        }
      }
    },
  };
  </script>
  
  <style scoped>
  /* If you want an even more exact peach‐colored background, you can override here.
     For example, the screenshot looks like a very pale peach (#FDEBD0 or similar). 
     If bg-amber-50 isn't quite right, you could do something like: 
  
  .navbar {
    background-color: #FDEBD0;
  }
  */
  </style>
  