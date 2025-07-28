<script>
import { getUserNetwork, respondToRelationshipInvitation, removeRelationship, sendRelationshipInvitation, cancelRelationshipInvitation } from '../api.js';
import { useRouter } from 'vue-router';
import sseService from '../services/sseService.js';

export default {
  name: 'ManageRelationships',
  setup() {
    const router = useRouter();
    return { router };
  },
  data() {
    return {
      relationships: [],
      receivedInvitations: [],
      sentInvitations: [],
      loading: true,
      showInviteModal: false,
      inviteForm: {
        to_email: '',
        relationship_type: 'friend',
        message: ''
      },
      relationshipTypes: [
        { value: 'family', label: 'Family' },
        { value: 'friend', label: 'Friend' },
        { value: 'significant_other', label: 'Significant Other' },
        { value: 'colleague', label: 'Colleague' },
        { value: 'other', label: 'Other' }
      ]
    };
  },
  computed: {
    pendingSentInvitations() {
      return this.sentInvitations.filter(invitation => invitation.status === 'pending');
    },
    nonPendingSentInvitations() {
      return this.sentInvitations.filter(invitation => invitation.status !== 'pending');
    }
  },
  methods: {
    async fetchNetworkData() {
      try {
        this.loading = true;
        const data = await getUserNetwork();
        this.relationships = data.relationships || [];
        this.receivedInvitations = data.received_invitations || [];
        this.sentInvitations = data.sent_invitations || [];
      } catch (error) {
        console.error('Failed to fetch network data:', error);
        alert('Failed to load relationships. Please try again.');
      } finally {
        this.loading = false;
      }
    },
    async acceptInvitation(invitation) {
      try {
        await respondToRelationshipInvitation(invitation.invitation_uuid, 'accept');
        await this.fetchNetworkData(); // Refresh data
        alert('Invitation accepted successfully!');
      } catch (error) {
        console.error('Failed to accept invitation:', error);
        alert(error.message || 'Failed to accept invitation');
      }
    },
    async rejectInvitation(invitation) {
      try {
        await respondToRelationshipInvitation(invitation.invitation_uuid, 'reject');
        await this.fetchNetworkData(); // Refresh data
        alert('Invitation rejected');
      } catch (error) {
        console.error('Failed to reject invitation:', error);
        alert(error.message || 'Failed to reject invitation');
      }
    },
    async removeRelationshipConfirm(relationship) {
      if (confirm(`Are you sure you want to remove ${relationship.to_user} from your network?`)) {
        try {
          await removeRelationship(relationship.id);
          await this.fetchNetworkData(); // Refresh data
          alert('Relationship removed successfully');
        } catch (error) {
          console.error('Failed to remove relationship:', error);
          alert(error.message || 'Failed to remove relationship');
        }
      }
    },
    async sendInvitation() {
      try {
        await sendRelationshipInvitation(this.inviteForm);
        this.showInviteModal = false;
        this.inviteForm = { to_email: '', relationship_type: 'friend', message: '' };
        await this.fetchNetworkData(); // refresh data
        alert('Invitation sent successfully!');
      } catch (error) {
        console.error('Failed to send invitation:', error);
        alert(error.message || 'Failed to send invitation');
      }
    },
    editRelationship(relationship) {
      this.router.push({ 
        name: 'relationship-details', 
        params: { relationshipId: relationship.id } 
      });
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },
    goBack() {
      this.router.go(-1);
    },
    async cancelInvitation(invitation) {
      if (confirm(`Are you sure you want to cancel the invitation to ${invitation.to_email}?`)) {
        try {
          await cancelRelationshipInvitation(invitation.invitation_uuid);
          await this.fetchNetworkData(); // Refresh data
          alert('Invitation cancelled successfully');
        } catch (error) {
          console.error('Failed to cancel invitation:', error);
          alert(error.message || 'Failed to cancel invitation');
        }
      }
    },
    
    setupSSEListeners() {
      // Listen for relationship invitation responses
      sseService.on('relationship_invitation', this.handleRelationshipInvitation);
    },
    
    removeSSEListeners() {
      // Remove SSE listeners
      sseService.off('relationship_invitation', this.handleRelationshipInvitation);
    },
    
    handleRelationshipInvitation(data) {
      // Refresh data when new invitation is received
      this.fetchNetworkData();
    }
  },
  async mounted() {
    await this.fetchNetworkData();
    
    // Set up SSE listeners
    this.setupSSEListeners();
  },
  
  beforeUnmount() {
    // Clean up SSE listeners
    this.removeSSEListeners();
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button @click="goBack" class="p-2 hover:bg-gray-200 hover:scale-105 rounded-full transition-all duration-200 cursor-pointer group">
              <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 class="text-xl font-semibold text-gray-900">Manage Relationships</h1>
          </div>
          <button
            @click="showInviteModal = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Invite Someone
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="animate-pulse">
          <div class="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div class="space-y-3">
            <div v-for="i in 3" :key="i" class="flex items-center space-x-3 p-4 bg-white rounded-lg">
              <div class="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="space-y-8">
        <!-- Existing Relationships -->
        <div>
          <h2 class="text-lg font-medium text-gray-900 mb-4">Your existing relationships</h2>
          
          <div v-if="relationships.length === 0" class="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p class="text-gray-500">No relationships yet</p>
            <p class="text-sm text-gray-400 mt-1">Send an invitation to start building your network</p>
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="relationship in relationships" 
              :key="relationship.id"
              @click="editRelationship(relationship)"
              class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div class="flex items-center space-x-3 flex-1">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {{ getInitials(relationship.to_user) }}
                </div>
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900">{{ relationship.to_user }}</h3>
                  <p class="text-sm text-gray-500">{{ relationship.relationship_type_display }}</p>
                  <p v-if="relationship.context" class="text-xs text-gray-400 mt-1">{{ relationship.context.substring(0, 80) }}{{ relationship.context.length > 80 ? '...' : '' }}</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <button
                  @click.stop="removeRelationshipConfirm(relationship)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                  title="Remove relationship"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Relationship Requests -->
        <div v-if="receivedInvitations.length > 0">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Relationship Requests</h2>
          
          <div class="space-y-3">
            <div 
              v-for="invitation in receivedInvitations" 
              :key="invitation.invitation_uuid"
              class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-medium">
                  {{ getInitials(invitation.from_user) }}
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">{{ invitation.from_user }}</h3>
                  <p class="text-sm text-gray-500">Relationship type: {{ invitation.relationship_type_display }}</p>
                  <p v-if="invitation.message" class="text-sm text-gray-600 mt-1 italic">"{{ invitation.message }}"</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <button
                  @click="acceptInvitation(invitation)"
                  class="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors cursor-pointer"
                  title="Accept invitation"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
                <button
                  @click="rejectInvitation(invitation)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                  title="Reject invitation"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Sent Invitations -->
        <div v-if="pendingSentInvitations.length > 0">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Pending Invitations</h2>
          
          <div class="space-y-3">
            <div 
              v-for="invitation in pendingSentInvitations" 
              :key="invitation.invitation_uuid"
              class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-medium">
                  {{ getInitials(invitation.to_email.split('@')[0]) }}
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">{{ invitation.to_email }}</h3>
                  <p class="text-sm text-gray-500">{{ invitation.relationship_type_display }}</p>
                  <span class="inline-flex px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    {{ invitation.status_display }}
                  </span>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <button
                  @click="cancelInvitation(invitation)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                  title="Cancel invitation"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Completed Sent Invitations -->
        <div v-if="nonPendingSentInvitations.length > 0">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Invitation History</h2>
          
          <div class="space-y-3">
            <div 
              v-for="invitation in nonPendingSentInvitations" 
              :key="invitation.invitation_uuid"
              class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 opacity-75"
            >
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                  {{ getInitials(invitation.to_email.split('@')[0]) }}
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">{{ invitation.to_email }}</h3>
                  <p class="text-sm text-gray-500">{{ invitation.relationship_type_display }}</p>
                  <span class="inline-flex px-2 py-1 text-xs rounded-full" 
                        :class="{
                          'bg-green-100 text-green-800': invitation.status === 'accepted',
                          'bg-red-100 text-red-800': invitation.status === 'rejected',
                          'bg-gray-100 text-gray-800': invitation.status === 'expired'
                        }">
                    {{ invitation.status_display }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Send Invitation</h3>
          <button @click="showInviteModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <form @submit.prevent="sendInvitation" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              v-model="inviteForm.to_email"
              type="email" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="friend@example.com"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
            <select 
              v-model="inviteForm.relationship_type"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option v-for="type in relationshipTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Personal Message (Optional)</label>
            <textarea 
              v-model="inviteForm.message"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Would you like to connect for potential counselling sessions?"
            ></textarea>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              @click="showInviteModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any custom styles if needed */
</style> 