<!-- TODO:
1. Add Other Button - customizable
-->

<script>
import { useAuthStore } from '../authentication/auth.js';
import { useRouter } from 'vue-router';
import { generateObjectives, refineObjectives, createSessionWithObjectives, getUserRelationshipsForSession } from '../api.js';
import Sidebar from '../components/Sidebar.vue';

export default {
  components: {
    Sidebar,
  },
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
      // Multi-step flow states
      currentStep: 'form', // 'form', 'objectives', 'refining'
      
      // Loading state
      isCheckingAuth: true,
      
      // Form data
      categories: [
        { category: 'Communication', isClicked: false },
        { category: 'Jealousy / Trust', isClicked: false },
        { category: 'Conflict', isClicked: false },
        { category: 'Sex / Intimacy', isClicked: false },
        { category: 'Money', isClicked: false },
        { category: 'Feeling Unseen', isClicked: false },
        { category: 'Family', isClicked: false },
        { category: 'Chores / Responsibility', isClicked: false },
        { category: 'Decision Making', isClicked: false },
      ],
      selected: new Set([]),
      message: '',
      selectedPartner: null,
      partnerMessage: '',
      relationships: [],
      loadingRelationships: false,
      
      // Objectives flow data
      objectives: [],
      refinementFeedback: '',
      generatingObjectives: false,
      refiningObjectives: false,
      creatingSession: false,
      
      // Final session data
      cousellingId: ''
    };
  },
  methods: {
    async fetchRelationships() {
      try {
        this.loadingRelationships = true;
        const response = await getUserRelationshipsForSession();
        this.relationships = response.contacts || [];
      } catch (error) {
        console.error('Failed to fetch relationships:', error);
        this.relationships = [];
      } finally {
        this.loadingRelationships = false;
      }
    },
    async generateSessionObjectives() {
      // Validation
      if (this.selected.size == 0) {
        alert('Choose a category');
        return;
      }
      
      if (!this.selectedPartner) {
        alert('Please select a partner to invite');
        return;
      }

      if (!this.message.trim()) {
        alert('Please tell us more about your situation');
        return;
      }
      
      try {
        this.generatingObjectives = true;
        
        let selectedCategories = Array.from(this.selected).map((selectedIndex) => 
          this.categories[selectedIndex].category
        );
        
        // Generate objectives using LLM
        const response = await generateObjectives(
          selectedCategories, 
          this.message, 
          this.selectedPartner.username,
          this.selectedPartner.relationship_type
        );
        
        this.objectives = response.objectives;
        this.currentStep = 'objectives';
        
      } catch (error) {
        console.error('Error generating objectives:', error);
        alert('Failed to generate objectives. Please try again.');
      } finally {
        this.generatingObjectives = false;
      }
    },
    async refineSessionObjectives() {
      if (!this.refinementFeedback.trim()) {
        alert('Please provide feedback about the objectives');
        return;
      }
      
      try {
        this.refiningObjectives = true;
        
        const response = await refineObjectives(this.objectives, this.refinementFeedback);
        this.objectives = response.objectives;
        this.refinementFeedback = ''; // Clear feedback after refining
        
      } catch (error) {
        console.error('Error refining objectives:', error);
        alert('Failed to refine objectives. Please try again.');
      } finally {
        this.refiningObjectives = false;
      }
    },
    async createSessionWithFinalizedObjectives() {
      try {
        this.creatingSession = true;
        
        let selectedCategories = Array.from(this.selected).map((selectedIndex) => 
          this.categories[selectedIndex].category
        );
        
        // Create session with finalized objectives
        const response = await createSessionWithObjectives(
          selectedCategories, 
          this.message, 
          this.objectives,
          this.selectedPartner.user_id, 
          this.partnerMessage
        );
        
        this.cousellingId = response.session_uuid;
        
        // Redirect to reflection page for the creator
        this.$router.push({ name: 'reflection', params: { session_uuid: this.cousellingId } });
        
      } catch (error) {
        console.error('Error creating session:', error);
        alert('Failed to create session. Please try again.');
      } finally {
        this.creatingSession = false;
      }
    },
    acceptObjectives() {
      this.createSessionWithFinalizedObjectives();
    },
    goBackToForm() {
      this.currentStep = 'form';
      this.objectives = [];
      this.refinementFeedback = '';
    },
    toggleClick(index) {
      this.categories[index].isClicked = !this.categories[index].isClicked;
      if (this.categories[index].isClicked) {
        this.selected.add(index);
      } else {
        this.selected.delete(index)
      }
    },
  },
  async mounted() {
    await this.fetchRelationships();
    // Set loading to false once component is ready
    this.$nextTick(() => {
      this.isCheckingAuth = false;
    });
  },
};
</script>

<template>
  <!-- Loading State -->
  <div v-if="isCheckingAuth" class="flex h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center">
    <div class="text-center">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </div>
      <h2 class="text-lg font-medium text-gray-900 mb-2">Loading...</h2>
      <p class="text-sm text-gray-600">Setting up session creation</p>
    </div>
  </div>

  <!-- Dashboard Layout for Authenticated Users -->
  <div v-else-if="authStore.isAuthenticated" class="flex h-[calc(100vh-4rem)] bg-gray-50">
    <!-- Sidebar Component -->
    <Sidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-8 py-6">
        <div class="flex items-center justify-center">
          <h1 class="text-2xl font-semibold text-gray-900">
            <span v-if="currentStep === 'form'">Room Creation</span>
            <span v-else-if="currentStep === 'objectives'">Session Objectives</span>
            <span v-else>Refining Objectives</span>
          </h1>
        </div>
      </div>

      <!-- Main Content Body -->
      <div class="flex-1 overflow-y-auto px-8 py-6">
        <div class="max-w-2xl mx-auto">
          
          <!-- STEP 1: Session Creation Form -->
          <div v-if="currentStep === 'form'">
            <!-- Welcome Message -->
            <div class="mb-8">
              <p class="text-lg text-gray-700 mb-4">Hi there {{ authStore.user?.username }}!</p>
            </div>

            <!-- Session Creation Form -->
            <form id="createRoomForm" class="space-y-6">
              <!-- Partner Selection -->
              <div>
                <label class="block text-lg font-semibold text-gray-900 mb-4">
                  Session Partner
                </label>
                <div v-if="loadingRelationships" class="text-gray-500">
                  Loading your contacts...
                </div>
                <div v-else-if="relationships.length === 0" class="text-gray-500">
                  <p>You don't have any relationships yet.</p>
                  <router-link 
                    to="/manage-relationships" 
                    class="text-blue-600 hover:text-blue-800 underline"
                  >
                    Add relationships first
                  </router-link>
                </div>
                <div v-else class="relative">
                  <select 
                    v-model="selectedPartner" 
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    required
                  >
                    <option :value="null">Select a partner to invite</option>
                    <option 
                      v-for="contact in relationships" 
                      :key="contact.user_id" 
                      :value="contact"
                    >
                      {{ contact.display_name }} ({{ contact.relationship_type }})
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Topics Selection -->
              <div class="topic-selection">
                <label class="block text-lg font-semibold text-gray-900 mb-4">
                  What's the issue you'd like to talk about?
                </label>
                <div class="bubble-grid" id="topicBubbles">
                  <div
                    class="bubble"
                    :class="{ selected: category.isClicked }"
                    v-for="(category, index) in categories"
                    :key="index"
                    @click="toggleClick(index)"
                  >
                    {{ category.category }}
                  </div>
                </div>
              </div>

              <!-- Context Message -->
              <div>
                <label class="block text-lg font-semibold text-gray-900 mb-2">
                  Tell me more
                </label>
                <textarea
                  v-model="message"
                  placeholder="Add any context or story here..."
                  rows="4"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                ></textarea>
              </div>

              <!-- Partner Message -->
              <div>
                <label class="block text-lg font-semibold text-gray-900 mb-2">
                  Message for your partner
                  <span class="font-normal text-gray-600">(Optional)</span>
                </label>
                <textarea
                  v-model="partnerMessage"
                  placeholder="Add a personal message for your partner..."
                  rows="3"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                @click.prevent="generateSessionObjectives"
                :disabled="!selectedPartner || selected.size === 0 || generatingObjectives"
                class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                <span v-if="generatingObjectives">Generating Objectives...</span>
                <span v-else>Generate Session Objectives</span>
              </button>
            </form>
          </div>

          <!-- STEP 2: Objectives Confirmation -->
          <div v-if="currentStep === 'objectives'">
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Proposed Session Objectives</h2>
              <p class="text-gray-600">Based on your input, here are the suggested objectives for your session:</p>
            </div>

            <!-- Objectives List -->
            <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <ol class="space-y-3">
                <li 
                  v-for="(objective, index) in objectives" 
                  :key="index"
                  class="flex items-start space-x-3"
                >
                  <span class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {{ index + 1 }}
                  </span>
                  <span class="text-gray-700">{{ objective }}</span>
                </li>
              </ol>
            </div>

            <!-- Refinement Section -->
            <div class="bg-gray-50 rounded-lg p-6 mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Want to modify these objectives? (Optional)
              </label>
              <textarea
                v-model="refinementFeedback"
                placeholder="Let me know what you'd like to change about these objectives..."
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              ></textarea>
              <button
                @click="refineSessionObjectives"
                :disabled="!refinementFeedback.trim() || refiningObjectives"
                class="mt-3 px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span v-if="refiningObjectives">Refining...</span>
                <span v-else>Refine Objectives</span>
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="flex space-x-4">
              <button
                @click="goBackToForm"
                class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ← Back to Form
              </button>
              <button
                @click="acceptObjectives"
                :disabled="creatingSession"
                class="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                <span v-if="creatingSession">Creating Session...</span>
                <span v-else>Create Room & Send Invitation</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- Login Prompt for Non-Authenticated Users -->
  <div v-else class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
      <p class="text-gray-600 mb-4">You need to be logged in to start a session.</p>
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
