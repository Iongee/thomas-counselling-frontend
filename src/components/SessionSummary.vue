<template>
  <!-- Summary Content - Full Page -->
  <div class="h-full bg-white flex flex-col">
    <!-- Summary Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="text-center">
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Session Summary</h2>
        <p class="text-gray-600">Reflecting on your conversation journey</p>
      </div>
    </div>

    <!-- Scrollable Summary Content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      <!-- Initial Context Recap -->
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-2">Session Overview</h3>
      <div class="text-sm text-gray-600 space-y-1">
        <p><strong>Topics:</strong> {{ summaryData?.initial_context?.categories?.join(', ') || 'N/A' }}</p>
        <p><strong>Initial Context:</strong> {{ summaryData?.initial_context?.context || 'N/A' }}</p>
      </div>
    </div>

    <!-- How Do You Feel Now Form -->
    <div v-if="!userHasSubmittedSummary" class="bg-blue-50 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-3">How do you feel now?</h3>
      <p class="text-sm text-gray-600 mb-4">Please share your thoughts about how this session went and how you're feeling now.</p>
      
      <div class="space-y-3">
        <textarea
          v-model="howYouFeelNow"
          placeholder="Please provide at least one sentence about how you feel now..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows="4"
        ></textarea>
        
        <button
          @click="handleSubmitResponse"
          :disabled="!canSubmitResponse"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Submit Response
        </button>
      </div>
    </div>

    <!-- User Submitted - Waiting for Others -->
    <div v-else-if="!allSubmittedSummary" class="bg-green-50 rounded-lg p-4 text-center">
      <div class="text-green-600 mb-2">✓ Your response has been submitted</div>
      <p class="text-sm text-gray-600">Waiting for other participants to share their thoughts...</p>
    </div>

    <!-- User Responses -->
    <div v-if="summaryResponses.length > 0" class="space-y-3">
      <h3 class="font-medium text-gray-900">Participant Responses</h3>
      <div v-for="response in summaryResponses" :key="response.user" class="bg-gray-50 rounded-lg p-3">
        <div class="font-medium text-sm text-gray-900">{{ response.user }}</div>
        <div class="text-sm text-gray-600 mt-1">{{ response.how_you_feel_now }}</div>
      </div>
    </div>

    <!-- AI Generated Summary -->
    <div v-if="summaryData?.summary_generated && summaryData?.final_summary" class="bg-blue-50 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-3">AI-Generated Session Summary</h3>
      <div v-html="formattedSummary" class="text-sm text-gray-700 prose prose-sm max-w-none"></div>
    </div>

    <!-- Waiting for Summary Generation -->
    <div v-else-if="allSubmittedSummary" class="bg-yellow-50 rounded-lg p-4 text-center">
      <div class="flex items-center justify-center space-x-2">
        <svg class="animate-spin h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-yellow-700">Generating session summary...</span>
      </div>
    </div>

    <!-- Final Action Buttons -->
    <div v-if="summaryGenerated" class="flex space-x-4 pt-4">
      <button
        @click="handleNavigateToHome"
        class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        End Room
      </button>
      <button
        @click="handleNavigateToNewSession"
        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Create New Conversation
      </button>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';

// Define props
const props = defineProps({
  summaryData: {
    type: Object,
    default: () => ({})
  },
  userHasSubmittedSummary: {
    type: Boolean,
    required: true
  },
  allSubmittedSummary: {
    type: Boolean,
    required: true
  },
  summaryResponses: {
    type: Array,
    default: () => []
  },
  summaryGenerated: {
    type: Boolean,
    required: true
  },
  finalSummary: {
    type: String,
    default: ''
  }
});

// Define emits
const emit = defineEmits(['submit-response', 'navigate-to-home', 'navigate-to-new-session']);

// Local state
const howYouFeelNow = ref('');

// Computed
const canSubmitResponse = computed(() => {
  return howYouFeelNow.value.trim() && howYouFeelNow.value.length >= 10;
});

// Methods
function handleSubmitResponse() {
  if (canSubmitResponse.value) {
    emit('submit-response', howYouFeelNow.value);
    howYouFeelNow.value = ''; // Clear the input
  }
}

function handleNavigateToHome() {
  emit('navigate-to-home');
}

function handleNavigateToNewSession() {
  emit('navigate-to-new-session');
}

// Computed
const formattedSummary = computed(() => {
  if (!props.summaryData?.final_summary) return '';
  return marked(props.summaryData.final_summary);
});
</script>


