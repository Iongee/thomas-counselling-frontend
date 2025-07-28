<script>
import { useAuthStore } from '../authentication/auth';
import { useRouter } from 'vue-router';

export default {
    setup() {
        const authStore = useAuthStore();
        const router = useRouter();

        return {
            authStore,
            router,
        };
    },
}
</script>

<template>
    
</template>