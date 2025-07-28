<script>
import { useAuthStore } from '../authentication/auth.js';
import { useRouter } from 'vue-router';
import { getUserSessionInvitations, respondToSessionInvitation } from '../api.js';

export default {
  name: 'SessionInvitation',
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
      invitation: null,
      loading: true,
      processing: false,
    };
  },
  props: {
    invitation_uuid: {
      type: String,
      required: true,
    }
  },
  methods: {
    async fetchInvitation() {
      try {
        this.loading = true;
        const data = await getUserSessionInvitations();
        const invitations = data.received_invitations || [];
        
        this.invitation = invitations.find(inv => inv.invitation_uuid === this.invitation_uuid);
        
        if (!this.invitation) {
          throw new Error('Invitation not found');
        }
      } catch (error) {
        console.error('Failed to fetch invitation:', error);
        alert('Failed to load invitation. It may have expired or been removed.');
        this.$router.push({ name: 'home' });
      } finally {
        this.loading = false;
      }
    },
    async handleResponse(action) {
      try {
        this.processing = true;
        const response = await respondToSessionInvitation(this.invitation_uuid, action);
        
        if (action === 'accept') {
          this.$router.push({
            name: 'reflection',
            params: { session_uuid: response.session_uuid }
          });
        } else {
          alert('Session invitation rejected.');
          this.$router.push({ name: 'home' });
        }
      } catch (error) {
        console.error(`Failed to ${action} invitation:`, error);
        alert(`Failed to ${action} invitation. Please try again.`);
      } finally {
        this.processing = false;
      }
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },
    goBack() {
      this.$router.go(-1);
    }
  },
  async mounted() {
    if (this.authStore.isAuthenticated) {
      await this.fetchInvitation();
    }
  },
};
</script>

<template>
  <div v-if="authStore.isAuthenticated" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="p-2 hover:bg-gray-200 hover:scale-105 rounded-full transition-all duration-200 cursor-pointer group">
            <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-xl font-semibold text-gray-900">Session Invitation</h1>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-2xl mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="animate-pulse">
          <div class="flex items-center mb-6">
            <div class="w-16 h-16 bg-gray-200 rounded-full mr-4"></div>
            <div class="flex-1">
              <div class="h-6 bg-gray-200 rounded mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
          <div class="space-y-4">
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
            <div class="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invitation Details -->
    <div v-else-if="invitation" class="max-w-2xl mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <!-- Header -->
        <div class="flex items-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xl mr-4">
            {{ getInitials(invitation.from_user) }}
          </div>
          <div class="flex-1">
            <h2 class="text-2xl font-semibold text-gray-900 mb-1">
              Session Invitation
            </h2>
            <p class="text-gray-600">
              From <strong>{{ invitation.from_user }}</strong>
            </p>
          </div>
        </div>

        <!-- Session Details -->
        <div class="space-y-4 mb-8">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Session Topics</h3>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="topic in invitation.session_categories" 
                :key="topic"
                class="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {{ topic }}
              </span>
            </div>
          </div>

          <div v-if="invitation.session_context">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Context</h3>
            <p class="text-gray-700 bg-gray-50 p-4 rounded-lg">
              {{ invitation.session_context }}
            </p>
          </div>

          <div v-if="invitation.message">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Personal Message</h3>
            <p class="text-gray-700 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              "{{ invitation.message }}"
            </p>
          </div>

          <div class="text-sm text-gray-500">
            <p>Invited {{ formatDate(invitation.created_at) }}</p>
            <p>Expires {{ formatDate(invitation.expires_at) }}</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-4">
          <button
            @click="handleResponse('accept')"
            :disabled="processing"
            class="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            <span v-if="processing">Processing...</span>
            <span v-else>Accept Invitation</span>
          </button>

          <button
            @click="handleResponse('reject')"
            :disabled="processing"
            class="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            <span v-if="processing">Processing...</span>
            <span v-else>Reject Invitation</span>
          </button>
        </div>

        <!-- Information -->
        <div class="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="text-sm text-yellow-800">
              <p class="font-medium mb-1">What happens next?</p>
              <p>If you accept, you'll be taken to a private reflection page where you'll share your feelings and hopes for the session. Once both participants complete their reflections, the counseling session will begin.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="max-w-2xl mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-sm p-6 text-center">
        <div class="text-gray-400 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Invitation Not Found</h2>
        <p class="text-gray-600 mb-4">This invitation may have expired or been removed.</p>
        <button 
          @click="goBack"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>

  <!-- Login Required -->
  <div v-else class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
      <p class="text-gray-600 mb-4">You need to be logged in to view this invitation.</p>
      <div class="space-y-3">
        <router-link 
          to="/login"
          class="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
        >
          Login
        </router-link>
        <router-link 
          to="/register"
          class="block w-full px-4 py-2 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-50 transition-colors"
        >
          Register
        </router-link>
      </div>
    </div>
  </div>
</template> 