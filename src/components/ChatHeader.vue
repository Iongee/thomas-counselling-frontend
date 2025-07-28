<template>
  <div class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span class="text-white font-medium text-sm">
          {{ currentObjectiveIndex >= totalObjectives ? 'S' : currentObjectiveIndex + 1 }}
        </span>
      </div>
      <div>
        <h1 class="text-lg font-semibold text-gray-900">
          {{ currentObjectiveIndex >= totalObjectives ? 'Summary' : `Objective ${currentObjectiveIndex + 1}: ${currentObjective}` }}
        </h1>
        <p class="text-sm text-gray-500">{{ statusMessage }}</p>
      </div>
    </div>
    
    <!-- Move to Next Button & Connection Status -->
    <div class="flex items-center space-x-4">
      <!-- Move to Next Objective Button -->
      <div 
        v-if="showMoveToNextButton"
        class="relative"
      >
        <button
          @click="handleMoveToNext"
          :disabled="!canMoveToNextObjective"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            canMoveToNextObjective
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
          ]"
          @mouseenter="showTooltip = !canMoveToNextObjective"
          @mouseleave="showTooltip = false"
        >
          Propose Moving to Next
        </button>
        
        <!-- Tooltip -->
        <div
          v-if="showTooltip && !canMoveToNextObjective"
          class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
        >
          {{ tooltipMessage }}
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
      
      <!-- Connection Status -->
      <div class="flex items-center space-x-2">
        <div :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></div>
        <span class="text-xs text-gray-500">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
        <span class="text-xs text-gray-500">{{ totalMessageCount }}/{{ messageLimit }} messages</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Define props
const props = defineProps({
  currentObjectiveIndex: {
    type: Number,
    required: true
  },
  currentObjective: {
    type: String,
    required: true
  },
  statusMessage: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  },
  totalMessageCount: {
    type: Number,
    required: true
  },
  messageLimit: {
    type: Number,
    required: true
  },
  canMoveToNextObjective: {
    type: Boolean,
    required: true
  },
  numMessagesForVotingThreshold: {
    type: Number,
    required: true
  },
  sessionCurrentObjectiveIndex: {
    type: Number,
    required: true
  },
  totalObjectives: {
    type: Number,
    required: true
  },
  isCurrentObjectiveReadOnly: {
    type: Boolean,
    required: true
  },
  isAiTalking: {
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
  voteActive: {
    type: Boolean,
    required: true
  }
});

// Define emits
const emit = defineEmits(['move-to-next']);

// Local state
const showTooltip = ref(false);

// Computed
const showMoveToNextButton = computed(() => {
  return props.sessionCurrentObjectiveIndex < props.totalObjectives - 1 &&
         !props.isCurrentObjectiveReadOnly &&
         props.currentObjectiveIndex === props.sessionCurrentObjectiveIndex;
});

const tooltipMessage = computed(() => {
  // Check if all participants have voted and transition is pending
  const allVoted = Object.values(props.moveToNextVotes).filter(v => v).length >= 2;
  const transitionPending = allVoted && props.voteActive;

  if (props.isTransitioning) {
    return 'Transitioning to next objective...';
  }
  if (transitionPending) {
    return 'All participants voted! Transition in progress...';
  }
  if (props.isAiTalking) {
    return 'Please wait for AI Counselor to finish responding';
  }
  if (props.totalMessageCount < props.numMessagesForVotingThreshold) {
    return `Must reach ${props.numMessagesForVotingThreshold} messages (${props.totalMessageCount}/${props.numMessagesForVotingThreshold})`;
  }
  return 'Cannot propose moving to next objective';
});

// Methods
function handleMoveToNext() {
  if (props.canMoveToNextObjective) {
    emit('move-to-next');
  }
}
</script>

<script>
import { computed } from 'vue';

export default {
  name: 'ChatHeader'
};
</script>
