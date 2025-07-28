<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <!-- Email Icon -->
        <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h1>
        
        <!-- Message -->
        <p class="text-gray-600 mb-6 leading-relaxed">
          {{ message }}
        </p>

        <!-- Additional Instructions -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <p class="text-sm text-gray-700 mb-2">
            <strong>Don't see the email?</strong>
          </p>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email address</li>
            <li>• Wait a few minutes for the email to arrive</li>
          </ul>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button
            @click="goToLogin"
            class="w-full bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Login
          </button>
          
          <button
            @click="goToRegister"
            class="w-full bg-gray-100 text-gray-700 rounded-lg py-3 px-4 font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Try Different Email
          </button>
        </div>

        <!-- Footer Note -->
        <p class="text-xs text-gray-500 mt-6">
          Need help? Contact our support team if you continue to have issues.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmailVerification',
  data() {
    return {
      message: this.getVerificationMessage()
    }
  },
  methods: {
    getVerificationMessage() {
      // Check if user came from login attempt (via route query or referrer)
      const fromLogin = this.$route.query.from === 'login' ||
                       document.referrer.includes('/login');

      if (fromLogin) {
        return "Your email address needs to be verified before you can log in. Please check your email and click the verification link to activate your account.";
      } else {
        return "We've sent a verification email to your inbox. Please check your email and click the verification link to activate your account.";
      }
    },
    goToLogin() {
      this.$router.push('/login');
    },
    goToRegister() {
      this.$router.push('/register');
    }
  }
}
</script>

<style scoped>
/* Add any additional styles if needed */
</style> 