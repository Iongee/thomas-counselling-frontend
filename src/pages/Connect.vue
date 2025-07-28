<script>
import { useAuthStore } from '../authentication/auth';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../api';

export default {
    setup() {
        const authStore = useAuthStore();
        const router = useRouter();

        return {
            authStore,
            router,
        };
    },
    props: {
        session_uuid: {
            type: String,
            required: true,
        }
    },
    methods: {
        correctUser() {
            return false;
        }
    },
    created() {
        // Extract host from API_BASE_URL (remove http:// prefix)
        const host = API_BASE_URL.replace('http://', '').replace('https://', '')
        let url = `ws://${host}/ws/socket-server/`

        
        const chatSocket = new WebSocket(url)

        chatSocket.onmessage = function(e) {
            let data = JSON.parse(e.data);
            console.log('Data:', data)
            console.log(data.type)

        }
    },
}
</script>

<template>
    <div v-if="authStore.isAuthenticated">
        <div v-if="correctUser()">shit</div>
        <div v-else> wow </div>
        <h1>lets chat</h1>
    </div>
    <p v-else>
        You are not logged in.
        <router-link to="/login">Login</router-link> or
        <router-link to="/register">Register</router-link>
    </p>
    

</template>