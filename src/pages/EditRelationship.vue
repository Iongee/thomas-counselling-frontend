<script>
import { getRelationshipDetails, updateRelationship } from '../api.js';
import { useRouter, useRoute } from 'vue-router';

export default {
  name: 'EditRelationship',
  setup() {
    const router = useRouter();
    const route = useRoute();
    return { router, route };
  },
  data() {
    return {
      relationship: null,
      loading: true,
      saving: false,
      editForm: {
        relationship_type: '',
        context: '',
        notes: ''
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
  methods: {
    async fetchRelationshipDetails() {
      try {
        this.loading = true;
        const relationshipId = this.route.params.relationshipId;
        const data = await getRelationshipDetails(relationshipId);
        this.relationship = data;
        
        // Populate the form with current values
        this.editForm = {
          relationship_type: data.relationship_type,
          context: data.context || '',
          notes: data.notes || ''
        };
      } catch (error) {
        console.error('Failed to fetch relationship details:', error);
        alert('Failed to load relationship details. Please try again.');
        this.goBack();
      } finally {
        this.loading = false;
      }
    },
    async saveChanges() {
      try {
        this.saving = true;
        const relationshipId = this.route.params.relationshipId;
        await updateRelationship(relationshipId, this.editForm);
        alert('Relationship updated successfully!');
        this.goBack();
      } catch (error) {
        console.error('Failed to update relationship:', error);
        alert(error.message || 'Failed to update relationship');
      } finally {
        this.saving = false;
      }
    },
    getInitials(name) {
      if (!name) return '';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },
    goBack() {
      this.router.go(-1);
    }
  },
  async mounted() {
    await this.fetchRelationshipDetails();
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-2xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button @click="goBack" class="p-2 hover:bg-gray-200 hover:scale-105 rounded-full transition-all duration-200 cursor-pointer group">
              <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 class="text-xl font-semibold text-gray-900">Edit Relationship</h1>
          </div>
          <button
            @click="saveChanges"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-2xl mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="animate-pulse">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div>
              <div class="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div class="space-y-4">
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="h-10 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-else-if="relationship" class="space-y-6">
        <!-- User Profile Section -->
        <div class="bg-white rounded-lg p-6 text-center">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-medium mx-auto mb-4">
            {{ getInitials(relationship.to_user) }}
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ relationship.to_user }}</h2>
          <p class="text-gray-500">{{ relationship.to_user_email }}</p>
        </div>

        <!-- Edit Form -->
        <form @submit.prevent="saveChanges" class="bg-white rounded-lg p-6 space-y-6">
          <!-- Relationship Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Relationship Type</label>
            <select 
              v-model="editForm.relationship_type"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option v-for="type in relationshipTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>

          <!-- Context -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Relationship Context</label>
            <textarea 
              v-model="editForm.context"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your relationship with this person..."
            ></textarea>
            <p class="text-sm text-gray-500 mt-1">Provide some context about your relationship</p>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Other Notes</label>
            <textarea 
              v-model="editForm.notes"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes here..."
            ></textarea>
            <p class="text-sm text-gray-500 mt-1">Any other important information about this relationship</p>
          </div>

          <!-- Form Actions -->
          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              @click="goBack"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>

        <!-- Relationship Info -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Relationship Information</h3>
          <div class="text-sm text-gray-600 space-y-1">
            <p><span class="font-medium">Connected since:</span> {{ new Date(relationship.created_at).toLocaleDateString() }}</p>
            <p v-if="relationship.updated_at !== relationship.created_at">
              <span class="font-medium">Last updated:</span> {{ new Date(relationship.updated_at).toLocaleDateString() }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any custom styles if needed */
</style> 