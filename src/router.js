import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './authentication/auth.js'
import LandingPage from './pages/LandingPage.vue'
import StartSession from './pages/StartSession.vue'
import Login from './pages/Login.vue'
import Register from './pages/Register.vue'
import EmailVerification from './pages/EmailVerification.vue'
import Reflection from './pages/Reflection.vue'
import Chat from './pages/Chat.vue'
import Connect from './pages/Connect.vue'
import ManageRelationships from './pages/ManageRelationships.vue'
import EditRelationship from './pages/EditRelationship.vue'
import RelationshipDetails from './pages/RelationshipDetails.vue'
import SessionInvitation from './pages/SessionInvitation.vue'
import Settings from './pages/Settings.vue'

const routes = [
    {
        path: '/startsession',
        name: 'startsession',
        component: StartSession,
        meta: { requiresAuth: true }
    },
    {
        path: '/login',
        name: 'login',
        component: Login,
        meta: { requiresGuest: true }
    },
    {
        path: '/register',
        name: 'register',
        component: Register,
        meta: { requiresGuest: true }
    },
    {
        path: '/please-verify',
        name: 'please-verify',
        component: EmailVerification,
        meta: { requiresGuest: true }
    },
    {
        path: '/reflection/:session_uuid',
        name: 'reflection',
        component: Reflection,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/chat/:session_uuid',
        name: 'chat',
        component: Chat,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/connect/:session_uuid',
        name: 'connect',
        component: Connect,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/session-invitation/:invitation_uuid',
        name: 'session-invitation',
        component: SessionInvitation,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/manage-relationships',
        name: 'manage-relationships',
        component: ManageRelationships,
        meta: { requiresAuth: true }
    },
    {
        path: '/relationship/:relationshipId',
        name: 'relationship-details',
        component: RelationshipDetails,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/edit-relationship/:relationshipId',
        name: 'edit-relationship',
        component: EditRelationship,
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/settings',
        name: 'settings',
        component: Settings,
        meta: { requiresAuth: true }
    },
    {
        path: "/",
        name: "home",
        component: LandingPage
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// Navigation Guards
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Wait for auth initialization if not already initialized
    if (!authStore.isInitialized) {
        await authStore.initializeAuth()
    }
    
    // Check if route requires authentication
    if (to.meta.requiresAuth) {
        if (!authStore.isAuthenticated) {
            // Redirect to login with return URL
            next({
                name: 'login',
                query: { redirect: to.fullPath }
            })
            return
        }
        
        // Validate token for authenticated routes
        const isValid = await authStore.validateToken()
        if (!isValid) {
            // Token is invalid, redirect to login
            next({
                name: 'login',
                query: { redirect: to.fullPath }
            })
            return
        }
    }
    
    // Check if route requires guest (not authenticated)
    if (to.meta.requiresGuest) {
        if (authStore.isAuthenticated) {
            // Redirect authenticated users to home
            next({ name: 'home' })
            return
        }
    }
    
    // Allow navigation
    next()
})

export default router