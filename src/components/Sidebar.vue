<script>
import { useAuthStore } from '../authentication/auth.js';
import { useRouter } from 'vue-router';
import { getUserSessions, getUserNetwork, getUserSessionInvitations, deleteSession } from '../api.js';
import sseService from '../services/sseService.js';

export default {
  name: 'Sidebar',
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
      sessions: [],
      sessionInvitations: [],
      loading: true,
      pendingInvitationsCount: 0,
    };
  },
  methods: {
    async fetchUserSessions() {
      try {
        this.loading = true;
        const data = await getUserSessions();
        this.sessions = data.sessions || [];
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        this.sessions = [];
      } finally {
        this.loading = false;
        console.log('Sessions fetched:', this.sessions);
      }
    },
    
    setupSSEListeners() {
      // Listen for session updates
      sseService.on('session_update', this.handleSessionUpdate);
      sseService.on('session_invitation_accepted', this.handleSessionUpdate);
      sseService.on('session_invitation_rejected', this.handleSessionInvitationRejected);
      sseService.on('session_status_change', this.handleSessionUpdate);
      sseService.on('session_deleted', this.handleSessionDeleted);
      sseService.on('session_invitation', this.handleSessionInvitation);
      sseService.on('relationship_invitation', this.handleRelationshipUpdate);
    },
    
    removeSSEListeners() {
      // Remove SSE listeners
      sseService.off('session_update', this.handleSessionUpdate);
      sseService.off('session_invitation_accepted', this.handleSessionUpdate);
      sseService.off('session_invitation_rejected', this.handleSessionInvitationRejected);
      sseService.off('session_status_change', this.handleSessionUpdate);
      sseService.off('session_deleted', this.handleSessionDeleted);
      sseService.off('session_invitation', this.handleSessionInvitation);
      sseService.off('relationship_invitation', this.handleRelationshipUpdate);
    },
    
    handleSessionUpdate(data) {
      // Update or add session in real-time
      const sessionIndex = this.sessions.findIndex(s => s.session_uuid === data.session.session_uuid);
      if (sessionIndex !== -1) {
        // Update existing session
        this.sessions[sessionIndex] = { ...this.sessions[sessionIndex], ...data.session };
      } else {
        // Add new session (if it's relevant to this user)
        this.fetchUserSessions(); // Refresh to get complete data
      }
    },
    
    handleSessionDeleted(data) {
      // Remove deleted session from list
      const sessionIndex = this.sessions.findIndex(s => s.session_uuid === data.session_uuid);
      if (sessionIndex !== -1) {
        this.sessions.splice(sessionIndex, 1);
      }
    },
    
    handleSessionInvitation(data) {
      // Refresh invitations when new invitation is received
      console.log('Handling session invitation in Sidebar:', data);
      this.fetchSessionInvitations();
    },

    handleSessionInvitationRejected(data) {
      // Handle session invitation rejection
      console.log('Handling session invitation rejected in Sidebar:', data);

      // Update the session status in the sessions list
      const sessionIndex = this.sessions.findIndex(s => s.session_uuid === data.session.session_uuid);
      if (sessionIndex !== -1) {
        // Update session status to rejected
        this.sessions[sessionIndex] = {
          ...this.sessions[sessionIndex],
          status: 'rejected'
        };
      }

      // Also refresh session invitations in case there are any pending ones
      this.fetchSessionInvitations();
    },
    async fetchSessionInvitations() {
      try {
        const data = await getUserSessionInvitations();
        this.sessionInvitations = data.received_invitations || [];
      } catch (error) {
        console.error('Failed to fetch session invitations:', error);
        this.sessionInvitations = [];
      }
    },

    handleRelationshipUpdate() {
      // This function is triggered by an SSE event.
      this.fetchPendingInvitations();
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
      }
    },
    getConversationPartner(session) {
      console.log("qewrewrewrwe");
      console.log(session);
      if (session.other_participants && session.other_participants.length > 0) {
        return session.other_participants[0].display_name;
      }
      if (session.status === 'rejected') {
        return 'Session Rejected';
      }
      return session.is_creator ? 'Waiting for partner' : session.creator;
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },
    openChat(session) {
      console.log(session);
      if (session.status === 'active') {
        this.router.push({ name: 'chat', params: { session_uuid: session.session_uuid } });
      } else if (session.status === 'pending') {
        this.router.push({ name: 'reflection', params: { session_uuid: session.session_uuid } });
      } else if (session.status === 'completed') {
        this.router.push({ name: 'chat', params: { session_uuid: session.session_uuid } });
      } else if (session.status === 'rejected') {
        this.router.push({ name: 'chat', params: { session_uuid: session.session_uuid } });
      }
    },
    openSessionInvitation(invitation) {
      // Navigate to a session invitation page or show modal
      this.router.push({ 
        name: 'session-invitation', 
        params: { invitation_uuid: invitation.invitation_uuid } 
      });
    },
    newConversation() {
      this.router.push({ name: "startsession" });
    },
    manageRelationships() {
      this.router.push({ name: "manage-relationships" });
    },
    goToSettings() {
      this.router.push({ name: "settings" });
    },
    async fetchPendingInvitations() {
      try {
        const data = await getUserNetwork();
        this.pendingInvitationsCount = (data.received_invitations || []).length;
      } catch (error) {
        console.error('Failed to fetch pending invitations:', error);
        this.pendingInvitationsCount = 0;
      }
    },
    async deleteSessionConfirm(session) {
      const partnerName = this.getConversationPartner(session);
      if (confirm(`Are you sure you want to remove this conversation with ${partnerName}?`)) {
        try {
          await deleteSession(session.session_uuid);
          await this.fetchUserSessions(); // Refresh the list
        } catch (error) {
          console.error('Failed to remove session:', error);
          alert('Failed to remove session. Please try again.');
        }
      }
    }
  },
  async mounted() {
    if (this.authStore.isAuthenticated) {
      await Promise.all([
        this.fetchUserSessions(),
        this.fetchPendingInvitations(),
        this.fetchSessionInvitations()
      ]);
      
      // Set up SSE listeners
      this.setupSSEListeners();
    }
  },
  
  beforeUnmount() {
    // Clean up SSE listeners
    this.removeSSEListeners();
  },
};
</script>

<template>
  <!-- Left Sidebar -->
  <div class="w-80 bg-white border-r border-gray-200 flex flex-col">


    <!-- New Conversation Button -->
    <div class="p-4">
      <button
        @click="newConversation"
        class="w-full flex items-center justify-center px-4 py-3 text-base bg-gray-100 hover:bg-gray-200 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 rounded-lg border-2 border-dashed border-gray-300 transition-all duration-200 cursor-pointer group"
      >
        <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        <span class="text-gray-700 font-medium">New Conversation</span>
      </button>
    </div>

    <!-- Sessions List -->
    <div class="flex-1 overflow-y-auto">
      <!-- Session Invitations Section -->
      <div v-if="sessionInvitations.length > 0" class="p-4">
        <h2 class="text-sm font-medium text-gray-900 mb-3">Session Invitations</h2>
        <div class="space-y-2">
          <div 
            v-for="invitation in sessionInvitations" 
            :key="invitation.invitation_uuid"
            @click="openSessionInvitation(invitation)"
            class="flex items-center p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition-colors"
          >
            <div class="flex-shrink-0 mr-3">
              <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-medium">
                {{ getInitials(invitation.from_user) }}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ invitation.from_user }}
              </p>
              <p class="text-sm text-gray-600 truncate">
                {{ invitation.session_categories.join(', ') }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatTimestamp(invitation.created_at) }}
              </p>
            </div>
            <div class="flex-shrink-0">
              <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Conversations -->
      <div class="p-4">
        <h2 class="text-sm font-medium text-gray-900 mb-3">Recent Conversations</h2>
        
        <div v-if="loading" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="flex items-center p-3 rounded-lg">
              <div class="w-12 h-12 bg-gray-200 rounded-full mr-3"></div>
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="sessions.length === 0" class="text-center py-8">
          <div class="text-gray-400 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.436L3 21l1.436-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-500">No conversations yet</p>
          <p class="text-xs text-gray-400 mt-1">Start your first session above</p>
        </div>

        <div v-else class="space-y-2">
          <div 
            v-for="session in sessions" 
            :key="session.session_uuid"
            class="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div class="flex-shrink-0 mr-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                {{ getInitials(getConversationPartner(session)) }}
              </div>
            </div>
            <div class="flex-1 min-w-0" @click="openChat(session)">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ getConversationPartner(session) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatTimestamp(session.latest_activity) }}
                </p>
              </div>
              <p class="text-sm text-gray-600 truncate">
                Topic: {{ Array.isArray(session.topic) ? session.topic.join(', ') : session.topic }}
              </p>
              <div class="flex items-center justify-between mt-1">
                <span class="inline-flex px-2 py-1 text-xs rounded-full"
                      :class="{
                        'bg-yellow-100 text-yellow-800': session.status === 'pending',
                        'bg-green-100 text-green-800': session.status === 'active',
                        'bg-blue-100 text-blue-800': session.status === 'completed',
                        'bg-red-100 text-red-800': session.status === 'rejected',
                      }">
                  {{ session.status }}
                </span>
                <span v-if="session.message_count > 0" class="text-xs text-gray-500">
                  {{ session.message_count }} messages
                </span>
              </div>
            </div>
            <div class="flex-shrink-0 ml-2">
              <button
                @click.stop="deleteSessionConfirm(session)"
                class="p-2 text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                title="Remove Session"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <div class="border-t border-gray-200 p-4">
      <div class="space-y-2">
        <button
          @click="manageRelationships"
          class="w-full flex items-center px-4 py-3 text-base text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 rounded-lg transition-all duration-200 cursor-pointer border border-gray-100 group"
        >
          <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
          </svg>
          <span class="font-medium">Manage Relationships</span>
          <span v-if="pendingInvitationsCount > 0" class="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 font-semibold">
            {{ pendingInvitationsCount }}
          </span>
          <svg v-else class="w-5 h-5 ml-auto text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <button @click="goToSettings" class="w-full flex items-center px-4 py-3 text-base text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 rounded-lg transition-all duration-200 cursor-pointer border border-gray-100 group">
          <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 616 0z"/>
          </svg>
          <span class="font-medium">Settings</span>
          <svg class="w-5 h-5 ml-auto text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template> 