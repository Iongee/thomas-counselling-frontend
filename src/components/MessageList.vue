<template>
  <div 
    ref="chatContainer"
    class="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50"
  >
    <!-- Welcome Message -->
    <div v-if="messages.length === 0" class="text-center py-8">
      <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-white text-2xl">{{ currentObjectiveIndex + 1 }}</span>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Start the conversation for this objective
      </h3>
      <p class="text-gray-600 max-w-md mx-auto">
        {{ currentObjective }}
      </p>
    </div>

    <!-- Messages -->
    <div
      v-for="(message, index) in messages"
      :key="index"
      :class="['flex', getMessageAlignment(message.sender)]"
    >
      <div class="flex items-start space-x-3 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        <!-- Avatar (only for non-user messages) -->
        <div
          v-if="!isCurrentUser(message.sender)"
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium"
          :class="getSenderUid(message.sender) === 'llm' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'"
        >
          {{ getSenderAvatar(message.sender) }}
        </div>

        <!-- Message Bubble -->
        <div class="flex flex-col">
          <!-- Sender Name (only for non-user messages) -->
          <div
            v-if="!isCurrentUser(message.sender)"
            class="text-xs text-gray-500 mb-1 px-1"
          >
            {{ getSenderName(message.sender) }}
          </div>
          
          <!-- Message Content -->
          <div
            :class="[
              'px-4 py-3 rounded-2xl shadow-sm',
              getMessageStyle(message.sender),
              isCurrentUser(message.sender) ? 'rounded-br-md' : 'rounded-bl-md'
            ]"
          >
            <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ message.content }}</p>
          </div>
        </div>

        <!-- User Avatar (only for user messages) -->
        <div
          v-if="isCurrentUser(message.sender)"
          class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"
        >
          <span class="text-white text-sm font-medium">{{ getSenderAvatar(message.sender) }}</span>
        </div>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div v-if="isLlmTyping" class="flex justify-start">
      <div class="flex items-start space-x-3 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
        <!-- AI Avatar -->
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium bg-orange-100 text-orange-800">
          🤖
        </div>

        <!-- Typing Bubble -->
        <div class="flex flex-col">
          <div class="text-xs text-gray-500 mb-1 px-1">
            AI Counselor
          </div>
          <div class="px-4 py-3 rounded-2xl rounded-bl-md shadow-sm bg-orange-100 text-gray-800 border border-orange-200">
            <div class="flex items-center space-x-3">
              <span class="text-sm italic text-gray-600">{{ typingMessage }}</span>
              <div class="typing-animation">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';

// Define props
const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  currentObjectiveIndex: {
    type: Number,
    required: true
  },
  currentObjective: {
    type: String,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  },
  isLlmTyping: {
    type: Boolean,
    default: false
  },
  typingMessage: {
    type: String,
    default: 'AI Counselor is typing...'
  }
});

// Template ref
const chatContainer = ref(null);

// Methods
function getSenderUid(sender) {
  return typeof sender === 'object' ? sender.uid : sender;
}

function isCurrentUser(sender) {
  return getSenderUid(sender) === props.currentUser.uid;
}

function getMessageAlignment(sender) {
  return isCurrentUser(sender) ? 'justify-end' : 'justify-start';
}

function getMessageStyle(sender) {
  const senderUid = getSenderUid(sender);

  if (senderUid === 'llm') {
    return 'bg-orange-100 text-gray-800 border border-orange-200';
  } else if (senderUid === props.currentUser.uid) {
    return 'bg-blue-500 text-white ml-auto';
  } else {
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}

function getSenderName(sender) {
  const senderUid = getSenderUid(sender);
  const senderName = typeof sender === 'object' ? sender.name : sender;

  if (senderUid === 'llm') {
    return 'AI Counselor';
  } else if (senderUid === props.currentUser.uid) {
    return 'You';
  } else {
    return senderName;
  }
}

function getSenderAvatar(sender) {
  const senderUid = getSenderUid(sender);
  const senderName = typeof sender === 'object' ? sender.name : sender;

  if (senderUid === 'llm') {
    return '🤖';
  } else if (senderUid === props.currentUser.uid) {
    return props.currentUser.displayName.charAt(0).toUpperCase();
  } else {
    return senderName.charAt(0).toUpperCase();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

// Watch for new messages and scroll to bottom
watch(() => props.messages.length, () => {
  scrollToBottom();
});

// Watch for typing indicator changes
watch(() => props.isLlmTyping, () => {
  if (props.isLlmTyping) {
    scrollToBottom();
  }
});

// Expose scrollToBottom method for parent component
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.typing-animation {
  display: flex;
  gap: 3px;
  align-items: center;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background-color: #f97316;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dot:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.7);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
