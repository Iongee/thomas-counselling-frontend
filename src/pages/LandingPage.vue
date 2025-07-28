<!-- src/views/LandingPage.vue -->
<script>
import { useAuthStore } from "../authentication/auth.js";
import { useRouter } from "vue-router";
import Sidebar from "../components/Sidebar.vue";

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
    return {};
  },
  methods: {
    goToLogin() {
      this.router.push({ name: "login" });
    },
    goToSession() {
      // If the user is already authenticated, send them to the "start session" page.
      // Otherwise, redirect to login first.
      if (this.authStore.isAuthenticated) {
        this.router.push({ name: "startsession" });
      } else {
        this.router.push({ name: "login" });
      }
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },
  },
};
</script>

<template>
  <!-- Dashboard for Authenticated Users -->
  <div v-if="authStore.isAuthenticated" class="flex h-[calc(100vh-4rem)] bg-gray-50">
    <!-- Sidebar Component -->
    <Sidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Main Content Header -->
      <div class="bg-white border-b border-gray-200 px-8 py-6">
        <h1 class="text-3xl font-semibold text-gray-900 text-center">
          Welcome back, {{ authStore.user?.displayName }}
        </h1>
      </div>

      <!-- Main Content Body -->
      <div class="flex-1 flex items-center justify-center px-8">
        <div class="max-w-2xl w-full text-center">
          <div class="mb-8">
            <h2 class="text-2xl font-semibold text-gray-900 mb-4">Welcome to Let's Talk</h2>
            <p class="text-lg text-gray-600 mb-6">
              You can get started by navigating to "New Conversation" in the sidebar or click on the button below to create a new conversation.
            </p>
          </div>

          <!-- Create New Conversation Button -->
          <div>
            <button
              @click="goToSession"
              class="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create New Conversation
            </button>
          </div>
        </div>
      </div>

      <!-- User Info in Bottom Right -->
      <div class="absolute bottom-6 right-6">
        <div @click="$router.push('/settings')" class="flex items-center space-x-3 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200 cursor-pointer">
          <div  class="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium ">
            {{ getInitials(authStore.user?.displayName || 'U') }}
          </div>
          <span class="text-sm font-medium text-gray-700">{{ authStore.user?.displayName }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Marketing Page for Non-Authenticated Users -->
  <div v-else>
    <!-- ─────────────────────────────────────────────────────────────── HERO SECTION ─────────────────────────────────────────────────────────────── -->
    <section class="hero py-20 text-center bg-cover bg-center" 
             style="background-image: url('/src/assets/background.svg');">
      <h1 class="text-4xl font-serif mb-4">Conversations that bring you closer</h1>
      <p class="text-lg text-gray-700 mb-8">
        An emotionally aware space to explore tough conversations — 
        with your partner, family, or friends — guided gently by AI
      </p>
      <div class="space-x-4">
        <button
          @click="goToSession"
          class="px-6 py-2 bg-white rounded-full border border-gray-300 hover:bg-gray-100 transition"
        >
          Start a session
        </button>
        <button
          @click="goToLogin"
          class="px-6 py-2 bg-transparent rounded-full border border-gray-700 hover:bg-gray-50 transition"
        >
          Log in
        </button>
      </div>
    </section>

    <!-- ───────────────────────────────────────────────────────── HOW IT WORKS SECTION ──────────────────────────────────────────────────────── -->
    <section id="how-it-works" class="py-16 bg-gray-50">
      <div class="max-w-4xl mx-auto text-center mb-12">
        <h2 class="text-3xl font-semibold">How it works</h2>
      </div>
      <div class="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 px-4">
        <!-- Step 1 -->
        <div class="bg-white rounded-lg shadow p-6 text-left">
          <h3 class="font-medium mb-2">Step 1: Add a relationship</h3>
          <p class="text-gray-600">
            Set the stage by telling us a bit about who you're talking to and what's on your mind.
          </p>
        </div>
        <!-- Step 2 -->
        <div class="bg-white rounded-lg shadow p-6 text-left">
          <h3 class="font-medium mb-2">Step 2: Share it with them</h3>
          <p class="text-gray-600">
            Send them a private room link and reflect upon the topics before starting a session.
          </p>
        </div>
        <!-- Step 3 -->
        <div class="bg-white rounded-lg shadow p-6 text-left">
          <h3 class="font-medium mb-2">Step 3: Talk it out</h3>
          <p class="text-gray-600">
            Get thoughtful, calming prompts from AI that help you both speak honestly, and reflect together.
          </p>
        </div>
      </div>
    </section>

    <!-- ──────────────────────────────────────────────── WHY TALK WITH US SECTION ──────────────────────────────────────────────────── -->
    <section id="why-talk" class="py-16 bg-gray-100">
      <div class="max-w-6xl mx-auto px-4">
        <!-- Heading -->
        <div class="text-center mb-12">
          <h2 class="text-3xl font-semibold mb-4">Why talking with us?</h2>
        </div>
        <!-- Benefits Cards - Horizontal Layout -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white/75 p-6 rounded-lg shadow">
            <div class="flex items-center mb-2">
              <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              <h4 class="font-medium">Not just for couples</h4>
            </div>
            <p class="text-gray-600">
              Whether it's your partner, a parent, a friend, or a co-founder — we support every kind of relationship.
            </p>
          </div>
          <div class="bg-white/75 p-6 rounded-lg shadow">
            <div class="flex items-center mb-2">
              <span class="inline-block w-3 h-3 bg-gray-400 mr-2 transform rotate-45"></span>
              <h4 class="font-medium">Progress-focused, not venting</h4>
            </div>
            <p class="text-gray-600">
              Every conversation ends with clarity: what was said, what was understood, and what comes next.
            </p>
          </div>
          <div class="bg-white/75 p-6 rounded-lg shadow">
            <div class="flex items-center mb-2">
              <span class="inline-block w-3 h-3 border-l-2 border-t-2 border-gray-400 transform rotate-45 mr-2"></span>
              <h4 class="font-medium">AI that feels human</h4>
            </div>
            <p class="text-gray-600">
              Our counselor doesn't replace therapy. But it helps you say the things you've been meaning to — in a safe, gentle space.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────────────────────────────────────────────────────── FOOTER ───────────────────────────────────────────────────────────────── -->
    <footer class="bg-gray-200 py-8">
    </footer>
  </div>
</template>
