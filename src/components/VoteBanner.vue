<template>
  <!-- Transition/Voting State Banner -->
  <div v-if="isTransitioning || (voteActive && hasVoted)" 
       class="px-6 py-3 border-b text-sm text-center"
       :class="isTransitioning ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'">
    <div v-if="isTransitioning" class="flex items-center justify-center space-x-2">
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Moving to next objective...</span>
    </div>
    <div v-else-if="voteActive && hasVoted">
      <span>✓ Your vote recorded! Waiting for other participants to vote...</span>
    </div>
  </div>

  <!-- Active Vote Display -->
  <div v-if="voteActive" class="bg-white border-t border-gray-200 px-4 py-3">
    <div class="space-y-3">
      <div class="flex items-center space-x-2">
        <div class="text-sm text-gray-700">
          <span class="font-medium">{{ voteInitiatedByDisplay }}</span> proposed moving to the next objective
        </div>
        <div v-if="hasVoted" class="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
          ✓ You voted to move on
        </div>
      </div>
      
      <!-- Voting buttons -->
      <div v-if="!hasVoted" class="flex items-center space-x-2">
        <div class="relative">
          <button
            @click="handleAgree"
            :disabled="isAiTalking"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isAiTalking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
            ]"
            @mouseenter="showAgreeTooltip = isAiTalking"
            @mouseleave="showAgreeTooltip = false"
          >
            Agree
          </button>
          <!-- Tooltip for Agree button -->
          <div
            v-if="showAgreeTooltip && isAiTalking"
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
          >
            Please wait for AI Counselor to finish responding
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>

        <div class="relative">
          <button
            @click="handleReject"
            :disabled="isAiTalking"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isAiTalking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
            ]"
            @mouseenter="showRejectTooltip = isAiTalking"
            @mouseleave="showRejectTooltip = false"
          >
            Reject
          </button>
          <!-- Tooltip for Reject button -->
          <div
            v-if="showRejectTooltip && isAiTalking"
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
          >
            Please wait for AI Counselor to finish responding
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      </div>
      
      <!-- Voting Status -->
      <div class="text-xs text-gray-500">
        Votes to move on: {{ votesCount }} / {{ totalParticipants }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Local state for tooltips
const showAgreeTooltip = ref(false);
const showRejectTooltip = ref(false);

// Define props
const props = defineProps({
  voteActive: {
    type: Boolean,
    required: true
  },
  voteInitiatedByDisplay: {
    type: String,
    required: true
  },
  hasVoted: {
    type: Boolean,
    required: true
  },
  isTransitioning: {
    type: Boolean,
    required: true
  },
  moveToNextVotes: {
    type: Object,
    required: true
  },
  totalParticipants: {
    type: Number,
    default: 2
  },
  isAiTalking: {
    type: Boolean,
    required: true
  }
});

// Define emits
const emit = defineEmits(['agree', 'reject']);

// Computed
const votesCount = computed(() => {
  return Object.values(props.moveToNextVotes).filter(v => v).length;
});

// Methods
function handleAgree() {
  if (!props.isAiTalking) {
    emit('agree');
  }
}

function handleReject() {
  if (!props.isAiTalking) {
    emit('reject');
  }
}
</script>

<script>
export default {
  name: 'VoteBanner'
};
</script>
