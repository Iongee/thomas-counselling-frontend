<script>
import { useAuthStore } from '../authentication/auth.js';
import { useRouter } from 'vue-router';
import { deleteUserAccount } from '../api.js';

export default {
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    return {
      authStore,
      router,
    };
  },
  data() {
    return {
      // Account settings
      account: {
        username: '',
        email: '',
      },
      // UI state
      isLoading: false,
      saveMessage: '',
      showDeleteConfirm: false,
      deleteConfirmText: '',
    };
  },
  mounted() {
    // Initialize account data from auth store
    if (this.authStore.user) {
      this.account.username = this.authStore.user.displayName || '';
      this.account.email = this.authStore.user.email || '';
    }
  },
  methods: {
    async updateUsername() {
      if (!this.account.username.trim()) {
        this.saveMessage = 'Username cannot be empty';
        return;
      }

      this.isLoading = true;
      this.saveMessage = '';

      try {
        await this.authStore.updateDisplayName(this.account.username.trim());

        this.saveMessage = 'Username updated successfully!';
        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
      } catch (error) {
        console.error('Error updating username:', error);
        if (error.code === 'auth/requires-recent-login') {
          this.saveMessage = 'Please log out and log back in, then try updating your username again.';
        } else {
          this.saveMessage = 'Error updating username. Please try again.';
        }
      } finally {
        this.isLoading = false;
      }
    },





    async deleteAccount() {
      if (this.deleteConfirmText !== 'DELETE') {
        this.saveMessage = 'Please type "DELETE" to confirm account deletion';
        return;
      }

      this.isLoading = true;
      this.saveMessage = '';

      try {
        // Option A: Frontend-First Approach
        // Step 1: Delete user data from Django database
        await deleteUserAccount();

        // Step 2: Delete Firebase user (handles re-authentication automatically)
        await this.authStore.deleteAccount();

        // Step 3: Redirect to home page
        this.router.push('/');

      } catch (error) {
        console.error('Error deleting account:', error);

        // Handle specific error cases
        if (error.message === 'EMAIL_REAUTH_REQUIRED') {
          this.saveMessage = 'For security, please log out and log back in, then try deleting your account again.';
        } else if (error.code === 'auth/popup-closed-by-user') {
          this.saveMessage = 'Account deletion cancelled. Please try again if you want to delete your account.';
        } else if (error.code === 'auth/popup-blocked') {
          this.saveMessage = 'Popup was blocked. Please allow popups for this site and try again.';
        } else {
          this.saveMessage = 'Error deleting account. Please try again.';
        }

        this.isLoading = false;
      }
    },

    goBack() {
      this.router.go(-1);
    },
  },
};
</script>

<template>
  <div v-if="authStore.isAuthenticated" class="min-h-screen bg-gray-50">
    <!-- Header with Back Button -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-6 py-4">
        <div class="flex items-center">
          <button @click="goBack" class="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 hover:scale-105 rounded-lg transition-all duration-200 cursor-pointer group">
            <svg class="w-5 h-5 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p class="text-gray-600">Manage your account information and security</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto p-6">
      <!-- Save Message -->
      <div v-if="saveMessage" class="mb-6 p-4 rounded-lg"
           :class="saveMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
        {{ saveMessage }}
      </div>

      <!-- Settings Sections -->
      <div class="space-y-6">

        <!-- Username Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Username</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
              <div class="flex space-x-3">
                <input
                  v-model="account.username"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                />
                <button
                  @click="updateUsername"
                  :disabled="isLoading"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Email Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Email Address</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                v-model="account.email"
                type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                readonly
              />
            </div>
          </div>
        </div>



        <!-- Delete Account Section -->
        <div class="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h2 class="text-xl font-semibold text-red-900 mb-4">Delete Account</h2>
          <div class="space-y-4">
            <div class="bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <div>
                  <h3 class="text-sm font-medium text-red-800">Warning</h3>
                  <p class="text-sm text-red-700 mt-1">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                </div>
              </div>
            </div>

            <div v-if="!showDeleteConfirm">
              <button
                @click="showDeleteConfirm = true"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>

            <div v-else class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Type "DELETE" to confirm account deletion
                </label>
                <input
                  v-model="deleteConfirmText"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Type DELETE to confirm"
                />
              </div>
              <div class="flex space-x-3">
                <button
                  @click="deleteAccount"
                  :disabled="isLoading || deleteConfirmText !== 'DELETE'"
                  class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span v-if="isLoading">Deleting...</span>
                  <span v-else>Confirm Delete</span>
                </button>
                <button
                  @click="showDeleteConfirm = false; deleteConfirmText = ''"
                  class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Not authenticated state -->
  <div v-else class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
      <p class="text-gray-600 mb-6">You need to be logged in to access settings.</p>
      <router-link 
        to="/login" 
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Go to Login
      </router-link>
    </div>
  </div>
</template>
