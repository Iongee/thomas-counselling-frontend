<template>
  <!-- End Session Voting Section (only on last objective) -->
  <div v-if="canEndSession || endSessionVoteActive" class="bg-amber-50 border-t border-amber-200 p-4">
    <div v-if="!endSessionVoteActive">
      <!-- Propose End Session Button -->
      <div class="relative">
        <button
          @click="handleVoteToEndSession"
          :disabled="isAiTalking"
          :class="[
            'w-full font-medium py-3 px-4 rounded-lg transition-colors',
            isAiTalking
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
              : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
          ]"
          @mouseenter="showEndSessionTooltip = isAiTalking"
          @mouseleave="showEndSessionTooltip = false"
        >
          End Session and Move to Summary
        </button>

        <!-- Tooltip for End Session button -->
        <div
          v-if="showEndSessionTooltip && isAiTalking"
          class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
        >
          Please wait for AI Counselor to finish responding
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    </div>
    
    <div v-else class="space-y-3">
      <!-- Vote Active Display -->
      <div class="text-center">
        <p class="text-sm font-medium text-amber-800">
          {{ endSessionVoteInitiatedByDisplay }} proposed to end the session
        </p>
        <!-- Debug Info (can be removed in production) -->
        <!-- <div v-if="showDebugInfo" class="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
          <div>Current User: {{ currentUser?.username }} (UID: {{ currentUser?.uid }})</div>
          <div>Display Name: {{ currentUser?.displayName }}</div>
          <div>Vote Initiated By: {{ endSessionVoteInitiatedBy }}</div>
          <div>Is Initiator (username): {{ endSessionVoteInitiatedBy === currentUser?.username }}</div>
          <div>Is Initiator (uid): {{ endSessionVoteInitiatedBy === currentUser?.uid }}</div>
          <div>Has Voted: {{ hasVotedToEndSession }}</div>
          <div>End Session Votes: {{ JSON.stringify(endSessionVotes) }}</div>
          <div>Show Buttons: {{ showVoteButtons }}</div>
        </div> -->
      </div>
      
      <!-- Vote Buttons (only for users who haven't voted and didn't initiate) -->
      <div v-if="showVoteButtons" class="flex space-x-2">
        <div class="relative flex-1">
          <button
            @click="handleVoteToEndSession"
            :disabled="isAiTalking"
            :class="[
              'w-full font-medium py-2 px-4 rounded-lg transition-colors',
              isAiTalking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
            ]"
            @mouseenter="showAcceptTooltip = isAiTalking"
            @mouseleave="showAcceptTooltip = false"
          >
            Accept
          </button>
          <!-- Tooltip for Accept button -->
          <div
            v-if="showAcceptTooltip && isAiTalking"
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
          >
            Please wait for AI Counselor to finish responding
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>

        <div class="relative flex-1">
          <button
            @click="handleRejectEndSessionVote"
            :disabled="isAiTalking"
            :class="[
              'w-full font-medium py-2 px-4 rounded-lg transition-colors',
              isAiTalking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-gray-500 hover:bg-gray-600 text-white cursor-pointer'
            ]"
            @mouseenter="showDeclineTooltip = isAiTalking"
            @mouseleave="showDeclineTooltip = false"
          >
            Decline
          </button>
          <!-- Tooltip for Decline button -->
          <div
            v-if="showDeclineTooltip && isAiTalking"
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
          >
            Please wait for AI Counselor to finish responding
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      </div>
      
      <!-- Status Messages -->
      <div v-if="isInitiator" class="text-center text-sm text-amber-700">
        ✓ Waiting for other participants to respond...
      </div>
      <div v-else-if="hasVotedToEndSession" class="text-center text-sm text-amber-700">
        ✓ Your response has been recorded
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Local state for tooltips
const showEndSessionTooltip = ref(false);
const showAcceptTooltip = ref(false);
const showDeclineTooltip = ref(false);

// Define props
const props = defineProps({
  canEndSession: {
    type: Boolean,
    required: true
  },
  endSessionVoteActive: {
    type: Boolean,
    required: true
  },
  endSessionVoteInitiatedBy: {
    type: String,
    required: true
  },
  endSessionVoteInitiatedByDisplay: {
    type: String,
    required: true
  },
  hasVotedToEndSession: {
    type: Boolean,
    required: true
  },
  endSessionVotes: {
    type: Object,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  },
  showDebugInfo: {
    type: Boolean,
    default: false
  },
  isAiTalking: {
    type: Boolean,
    required: true
  }
});

// Define emits
const emit = defineEmits(['vote-to-end-session', 'reject-end-session-vote']);

// Computed
const isInitiator = computed(() => {
  // Backend stores vote initiator using Firebase UID (stored in Django username field)
  return props.endSessionVoteInitiatedBy === props.currentUser?.uid;
});

const showVoteButtons = computed(() => {
  return !props.hasVotedToEndSession && !isInitiator.value;
});

// Methods
function handleVoteToEndSession() {
  if (!props.isAiTalking) {
    emit('vote-to-end-session');
  }
}

function handleRejectEndSessionVote() {
  if (!props.isAiTalking) {
    emit('reject-end-session-vote');
  }
}
</script>
