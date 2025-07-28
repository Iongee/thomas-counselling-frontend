<script>
import { useAuthStore } from '../authentication/auth';
import { useRouter } from 'vue-router';
import { storeReflection } from '../api.js'

export default {
    setup() {
        const authStore = useAuthStore();
        const router = useRouter();

        return {
            authStore,
            router,
        };
    },
    data() {
        return {
            feelings: '',
            hopes: '',
            isCheckingAuth: true,
        }
    },
    props: {
        session_uuid: {
            type: String,
            required: true
        }
    },
    methods: {
        async submitReflection() {
            // @TODO
            // Need better error handling
            // Need better case handling
            try {
                const response = await storeReflection(this.feelings,this.hopes,this.session_uuid);
            } catch (error) {
                // Handle error silently or show user-friendly message
            }
            this.$router.push({name:'chat',params: {session_uuid: this.session_uuid}})
        }
    },
    mounted() {
        // Set loading to false once component is mounted
        this.$nextTick(() => {
            this.isCheckingAuth = false;
        });
    }
}
</script>

<template>
    <!-- Loading State -->
    <div v-if="isCheckingAuth" class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div class="text-center">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            </div>
            <h2 class="text-lg font-medium text-gray-900 mb-2">Loading...</h2>
            <p class="text-sm text-gray-600">Preparing your reflection session</p>
        </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="authStore.isAuthenticated" class="min-h-screen bg-gray-50 py-8 px-4">
        <div class="max-w-2xl mx-auto">
            <!-- Header Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
                <h1 class="text-3xl font-semibold text-gray-900 mb-4">Private Reflection</h1>
                <p class="text-gray-600">Take a moment to reflect on your current feelings and hopes for this session.</p>
            </div>

            <!-- Reflection Form Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-6">Begin Your Private Reflection</h2>
                
                <form id="reflectionForm" @submit.prevent="submitReflection" class="space-y-6">
                    <!-- Name Field (Read-only) -->
                    <div class="flex flex-col">
                        <label for="name" class="text-sm font-medium text-gray-700 mb-2">Your Name</label>
                        <input 
                            type="text" 
                            id="name" 
                            :value="authStore.user.displayName" 
                            readonly
                            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 bg-gray-50 focus:outline-none"
                        />
                    </div>

                    <!-- Feelings Field -->
                    <div class="flex flex-col">
                        <label for="feelings" class="text-sm font-medium text-gray-700 mb-2">
                            How are you feeling right now?
                        </label>
                        <textarea 
                            id="feelings" 
                            v-model="feelings" 
                            required
                            rows="4"
                            placeholder="Share your current emotions and thoughts..."
                            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        ></textarea>
                    </div>

                    <!-- Hopes Field -->
                    <div class="flex flex-col">
                        <label for="hopes" class="text-sm font-medium text-gray-700 mb-2">
                            What do you hope will come out of this session?
                        </label>
                        <textarea 
                            id="hopes" 
                            v-model="hopes" 
                            required
                            rows="4"
                            placeholder="Describe your goals and desired outcomes..."
                            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        ></textarea>
                    </div>

                    <!-- Submit Button -->
                    <div class="pt-4">
                        <button
                            type="submit"
                            class="w-full bg-rose-200 hover:bg-rose-300 text-white font-medium py-3 px-6 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 cursor-pointer"
                        >
                            Submit Reflection
                        </button>
                    </div>
                </form>
            </div>

            <!-- Helper Text -->
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">
                    Your reflection is private and will help guide your session conversation.
                </p>
            </div>
        </div>
    </div>

    <!-- Not Authenticated State -->
    <div v-else class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-md mx-auto">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
            <p class="text-gray-600 mb-6">You need to be logged in to access this reflection session.</p>
            <div class="space-x-4">
                <router-link 
                    to="/login"
                    class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition"
                >
                    Login
                </router-link>
                <router-link 
                    to="/register"
                    class="inline-block border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-6 rounded-lg transition"
                >
                    Register
                </router-link>
            </div>
        </div>
    </div>
</template>