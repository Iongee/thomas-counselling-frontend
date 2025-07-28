<template>
  <div class="bg-white border-t border-gray-200 p-4"
       :class="!canTypeMessage ? 'opacity-75' : ''">
    <form @submit.prevent="submitMessage" class="flex items-center space-x-3">
      <!-- Message input -->
      <div class="flex-1 relative">
        <input
          v-model="messageText"
          type="text"
          :placeholder="placeholder"
          :disabled="!canTypeMessage"
          :class="[
            'w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
            !canTypeMessage ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'
          ]"
          @keydown.enter.prevent="submitMessage"
        />
      </div>

      <!-- Send button -->
      <button
        type="submit"
        :disabled="!canSendMessage"
        :class="[
          'p-2 text-white rounded-full transition-colors',
          canSendMessage ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Define props
const props = defineProps({
  canTypeMessage: {
    type: Boolean,
    required: true
  },
  placeholder: {
    type: String,
    default: 'Type your message here...'
  }
});

// Define emits
const emit = defineEmits(['send-message']);

// Local state
const messageText = ref('');

// Computed
const canSendMessage = computed(() => {
  return props.canTypeMessage && messageText.value.trim().length > 0;
});

// Methods
function submitMessage() {
  if (canSendMessage.value) {
    const message = messageText.value.trim();
    emit('send-message', message);
    messageText.value = ''; // Clear the input
  }
}
</script>
