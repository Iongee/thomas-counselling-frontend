<template>
  <div class="flex items-center justify-center min-h-screen px-4">
    <div class="flex w-full max-w-4xl overflow-hidden bg-white/80 backdrop-blur-sm rounded-xl shadow-xl">
      <!-- Sign Up Column -->
      <div class="w-1/2 p-8 flex flex-col items-center border-r border-gray-200">
        <button
          type="button"
          class="self-start text-gray-400 hover:text-gray-600 mb-4 focus:outline-none"
        >
          <span class="text-xl font-light">&times;</span>
        </button>

        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Sign up</h2>

        <button
          @click="signUpWithGoogle"
          class="flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
        >
          <span class="text-lg font-bold">G</span>
          <span>Continue with Google</span>
        </button>

        <button
          @click="signUpWithEmail"
          class="mt-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
        >
          <span class="text-lg">✉️</span>
          <span>Sign up with email</span>
        </button>

        <p class="mt-6 w-full max-w-xs text-center text-xs text-gray-500">
          By signing up, you agree to the
          <a href="#" class="underline text-blue-500 hover:text-blue-600">Terms of Service</a>
          and acknowledge you’ve read our
          <a href="#" class="underline text-blue-500 hover:text-blue-600">Privacy Policy</a>.
        </p>
      </div>

      <!-- Log In Column -->
      <div class="w-1/2 p-8 flex flex-col items-center">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Log in</h2>

        <form @submit.prevent="login" class="w-full max-w-xs flex flex-col space-y-6">
          <!-- Username Field -->
          <div class="flex flex-col">
            <label for="username" class="text-sm text-gray-600 mb-1">Email</label>
            <input
              v-model="email"
              id="email"
              type="email"
              placeholder="Enter your email"
              required
              @input="resetError"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <!-- Password Field with toggle -->
          <div class="flex flex-col">
            <div class="flex justify-between items-center mb-1">
              <label for="password" class="text-sm text-gray-600">Password</label>
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="text-xs text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {{ showPassword ? "Hide" : "Show" }}
              </button>
            </div>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              id="password"
              placeholder="••••••••"
              required
              @input="resetError"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <!-- Forgot Password Link - Removed for now -->
          <!-- <div class="flex justify-end">
            <router-link to="/forgot-password" class="text-xs text-blue-500 hover:underline">
              Forget your password?
            </router-link>
          </div> -->

          <!-- Log in Button -->
          <button
            type="submit"
            class="w-full rounded-full bg-rose-200 py-2 text-white font-medium hover:bg-rose-300 transition"
          >
            Log in
          </button>
        </form>

        <!-- Error Message -->
        <p v-if="error" class="mt-4 text-sm text-red-500">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../authentication/auth'

export default {
  setup() {
    const authStore = useAuthStore()
    return {
      authStore,
    }
  },
  data() {
    return {
      email: '',
      password: '',
      error: '',
      showPassword: false,
    }
  },
  methods: {
    async login() {
      try {
        await this.authStore.login(this.email, this.password, this.$router)

        // Handle redirect after successful login
        if (this.authStore.isAuthenticated) {
          const redirectPath = this.$route.query.redirect || '/'
          this.$router.push(redirectPath)
        } else {
          this.error = 'Login failed. Please check your credentials.'
        }
      } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          // Redirect to verification page with context
          this.$router.push('/please-verify?from=login')
        } else {
          this.error = 'Login failed. Please check your credentials.'
        }
      }
    },
    resetError() {
      this.error = ''
    },
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword
    },
    async signUpWithGoogle() {
      try {
        await this.authStore.loginWithGoogle(this.$router);

        // Handle redirect after successful Google login
        if (this.authStore.isAuthenticated) {
          const redirectPath = this.$route.query.redirect || '/'
          this.$router.push(redirectPath)
        }
      } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          // Redirect to verification page with context
          this.$router.push('/please-verify?from=login')
        } else {
          this.error = 'Failed to sign in with Google. Please try again.'
        }
      }
    },
    signUpWithEmail() {
      this.$router.push('/register')
    },
  },
}
</script>
