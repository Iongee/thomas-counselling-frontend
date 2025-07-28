<template>
  <div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
    <!-- Header -->
    <div class="p-6 border-b border-gray-200">
      <h2 class="text-lg font-medium text-gray-900 mb-2">Session Objectives</h2>
      <p class="text-sm text-gray-600">{{ completedObjectives }} of {{ totalObjectives }} completed</p>
    </div>
    
    <!-- Progress Bar -->
    <div class="px-6 py-4">
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${(completedObjectives / totalObjectives) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Objectives List -->
    <div class="flex-1 overflow-y-auto px-4 pb-4">
      <div 
        v-for="(objective, index) in objectives" 
        :key="index"
        :class="[
          'mb-4 p-4 rounded-lg border transition-all',
          index === currentObjectiveIndex ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200',
          getObjectiveStatus(index) === 'Locked' || isAiTalking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
        @click="handleObjectiveClick(index)"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center">
            <div 
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-3',
                getObjectiveStatus(index) === 'Active' ? 'bg-blue-500 text-white' :
                getObjectiveStatus(index) === 'Completed' ? 'bg-green-500 text-white' :
                'bg-gray-300 text-gray-600'
              ]"
            >
              {{ getObjectiveStatus(index) === 'Completed' ? '✓' : index + 1 }}
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Objective {{ index + 1 }}</h3>
              <span 
                :class="[
                  'text-xs px-2 py-1 rounded',
                  getObjectiveStatus(index) === 'Active' ? 'bg-blue-100 text-blue-800' :
                  getObjectiveStatus(index) === 'Completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                ]"
              >
                {{ getObjectiveStatus(index) }}
              </span>
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-2">{{ objective }}</p>
        <div class="text-xs text-gray-500">{{ getObjectiveMessageCount(index) }} messages</div>
      </div>
      
      <!-- Summary Section -->
      <div 
        v-if="showSummaryInSidebar"
        :class="[
          'mb-4 p-4 rounded-lg border transition-all',
          isViewingSummary ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200',
          summaryState === 'locked' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
        @click="handleSummaryClick"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center">
            <div 
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-3',
                summaryState === 'completed' ? 'bg-purple-500 text-white' :
                summaryState === 'active' ? 'bg-yellow-500 text-white' :
                'bg-gray-300 text-gray-600'
              ]"
            >
              {{ summaryState === 'completed' ? '✓' : summaryState === 'locked' ? '🔒' : 'S' }}
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Summary</h3>
              <span 
                :class="[
                  'text-xs px-2 py-1 rounded',
                  summaryState === 'completed' ? 'bg-purple-100 text-purple-800' :
                  summaryState === 'active' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-600'
                ]"
              >
                {{ summaryState === 'completed' ? 'Completed' : summaryState === 'active' ? 'Active' : 'Locked' }}
              </span>
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-2">Session reflection and AI-generated summary</p>
        <div class="text-xs text-gray-500">
          {{ summaryState === 'completed' ? 'Summary complete' : 
             summaryState === 'active' ? 'In progress' : 
             'Complete all objectives to unlock' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Define props
const props = defineProps({
  objectives: {
    type: Array,
    required: true
  },
  currentObjectiveIndex: {
    type: Number,
    required: true
  },
  sessionCurrentObjectiveIndex: {
    type: Number,
    required: true
  },
  completedObjectives: {
    type: Number,
    required: true
  },
  totalObjectives: {
    type: Number,
    required: true
  },
  objectiveMessageCounts: {
    type: Object,
    required: true
  },
  messageLimit: {
    type: Number,
    required: true
  },
  summaryState: {
    type: String,
    required: true
  },
  showSummaryInSidebar: {
    type: Boolean,
    default: true
  },
  isViewingSummary: {
    type: Boolean,
    required: true
  },
  isAiTalking: {
    type: Boolean,
    required: true
  }
});

// Define emits
const emit = defineEmits(['objective-selected', 'summary-selected']);

// Methods
function getObjectiveStatus(index) {
  // If we have completed all objectives (via session ending vote or normal progression)
  if (props.completedObjectives === props.totalObjectives && index < props.totalObjectives) {
    return 'Completed';
  }
  // Normal logic for objectives before the current session objective
  else if (index < props.sessionCurrentObjectiveIndex) {
    return 'Completed';
  }
  // Current active objective (unless all are completed)
  else if (index === props.sessionCurrentObjectiveIndex && props.completedObjectives < props.totalObjectives) {
    return 'Active';
  }
  // Future objectives that are locked
  else {
    return 'Locked';
  }
}

function getObjectiveMessageCount(index) {
  const count = props.objectiveMessageCounts[index] || 0;
  return `${count}/${props.messageLimit}`;
}

function handleObjectiveClick(index) {
  if (getObjectiveStatus(index) !== 'Locked' && !props.isAiTalking) {
    emit('objective-selected', index);
  }
}

function handleSummaryClick() {
  if (props.summaryState !== 'locked') {
    emit('summary-selected');
  }
}
</script>
