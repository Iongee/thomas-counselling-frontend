<script>
import { getRelationshipDetails } from '../api.js';
import { useRouter, useRoute } from 'vue-router';

export default {
  name: 'RelationshipDetails',
  setup() {
    const router = useRouter();
    const route = useRoute();
    return { router, route };
  },
  data() {
    return {
      relationship: null,
      loading: true
    };
  },
  methods: {
    async fetchRelationshipDetails() {
      try {
        this.loading = true;
        const relationshipId = this.route.params.relationshipId;
        const data = await getRelationshipDetails(relationshipId);
        this.relationship = data;
      } catch (error) {
        console.error('Failed to fetch relationship details:', error);
        alert('Failed to load relationship details. Please try again.');
        this.goBack();
      } finally {
        this.loading = false;
      }
    },
    editRelationship() {
      this.router.push({ 
        name: 'edit-relationship', 
        params: { relationshipId: this.route.params.relationshipId } 
      });
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
          </div>
          <button
            @click="editRelationship"
            class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-2xl mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="animate-pulse text-center">
          <div class="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div class="h-8 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-24 mx-auto mb-8"></div>
          <div class="space-y-4">
            <div class="h-6 bg-gray-200 rounded w-1/3"></div>
            <div class="h-24 bg-gray-200 rounded"></div>
            <div class="h-6 bg-gray-200 rounded w-1/4"></div>
            <div class="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-else-if="relationship" class="space-y-8">
        <!-- User Profile Section -->
        <div class="text-center">
          <div class="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-medium mx-auto mb-4">
            {{ getInitials(relationship.to_user) }}
          </div>
          <h2 class="text-3xl font-bold text-gray-900 mb-2">{{ relationship.to_user }}</h2>
          <p class="text-lg text-gray-600 mb-1">{{ relationship.relationship_type_display }}</p>
        </div>

        <!-- Relationship Context Section -->
        <div class="space-y-4">
          <h3 class="text-xl font-semibold text-gray-900">Relationship Context</h3>
          <div class="text-gray-700 leading-relaxed text-base">
            <p v-if="relationship.context" class="whitespace-pre-wrap">
              {{ relationship.context }}
            </p>
            <p v-else class="text-gray-500 italic">
              No relationship context provided yet.
            </p>
          </div>
        </div>

        <!-- Other Notes Section -->
        <div class="space-y-4">
          <h3 class="text-xl font-semibold text-gray-900">Other Notes</h3>
          <div class="text-gray-700 leading-relaxed text-base">
            <p v-if="relationship.notes" class="whitespace-pre-wrap">
              {{ relationship.notes }}
            </p>
            <p v-else class="text-gray-500 italic">
              No additional notes provided yet.
            </p>
          </div>
        </div>

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