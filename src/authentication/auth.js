import { defineStore } from 'pinia'
import { auth } from '../firebase/config'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    onAuthStateChanged,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,
    reauthenticateWithPopup,
} from "firebase/auth";
import sseService from '../services/sseService'
import notificationService from '../services/notificationService'
import { API_BASE_URL } from '../api'

const url = `${API_BASE_URL}/`

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        idToken: localStorage.getItem('idToken') || null,
        isInitialized: false,
    }),
    getters: {
        isAuthenticated: (state) => {
            return !!state.idToken && !!state.user && state.isInitialized
        },
    },

    actions: {
        async initializeAuth() {
            return new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        // Check email verification status first
                        if (!user.emailVerified) {
                            await signOut(auth)
                            this.clearAuth()
                            this.isInitialized = true
                            unsubscribe()
                            resolve()
                            return
                        }

                        // Validate token and update if needed
                        try {
                            const token = await user.getIdToken(true) // Force refresh
                            this.idToken = token
                            this.user = {
                                email: user.email,
                                uid: user.uid,
                                displayName: user.displayName
                            }
                            localStorage.setItem('idToken', token)
                            localStorage.setItem('user', JSON.stringify(this.user))

                            // Connect to SSE after successful auth
                            this.connectSSE()
                        } catch (error) {
                            this.clearAuth()
                        }
                    } else {
                        this.clearAuth()
                    }
                    this.isInitialized = true
                    unsubscribe()
                    resolve()
                })
            })
        },

        clearAuth() {
            this.idToken = null
            this.user = null
            localStorage.removeItem('idToken')
            localStorage.removeItem('user')
            
            // Disconnect SSE
            sseService.disconnect()
        },

        async login(email, password) {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                // Check email verification status
                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    this.clearAuth();
                    const error = new Error('EMAIL_NOT_VERIFIED');
                    error.code = 'EMAIL_NOT_VERIFIED';
                    throw error;
                }

                const token = await userCredential.user.getIdToken();

                this.idToken = token;
                this.user = {
                    email: userCredential.user.email,
                    uid: userCredential.user.uid,
                    displayName: userCredential.user.displayName
                };

                localStorage.setItem('idToken', token);
                localStorage.setItem('user', JSON.stringify(this.user));

                // Connect to SSE after successful login
                this.connectSSE();

            } catch (error) {
                this.clearAuth()
                throw error
            }
        },

        async logout(router = null) {
            try {
                await signOut(auth);
                this.clearAuth(); 
                if (router) {
                    // Clear browser history to prevent back button access
                    router.replace({ name: 'login' });
                    // Clear any cached pages
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, null, '/login');
                    }
                }
            } catch (error) {
                // Clear auth state even if Firebase logout fails
                this.clearAuth()
                if (router) {
                    router.replace({ name: 'login' });
                }
            }
        },

        async register(email, password, username, router = null) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, {
                    displayName: username,
                });
                await sendEmailVerification(userCredential.user);

                await signOut(auth);
                this.clearAuth()
                
                if (router) {
                    await router.push('/please-verify'); 
                }
            } catch (error) {
                this.clearAuth()
                throw error;
            }
        },

        async handleAuthStateChange(user) {
            if (user) {
                const token = await user.getIdToken();
                this.idToken = token;
                this.user = {
                    email: user.email,
                    uid: user.uid,
                    displayName: user.displayName
                };
                localStorage.setItem('idToken', token);
                localStorage.setItem('user', JSON.stringify(this.user));
            } else {
                this.clearAuth()
            }
        },

        async loginWithGoogle() {
            const provider = new GoogleAuthProvider();
            try {
                const userCredential = await signInWithPopup(auth, provider);

                // Check email verification status
                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    this.clearAuth();
                    const error = new Error('EMAIL_NOT_VERIFIED');
                    error.code = 'EMAIL_NOT_VERIFIED';
                    throw error;
                }

                const token = await userCredential.user.getIdToken();
                this.idToken = token;
                this.user = {
                    email: userCredential.user.email,
                    uid: userCredential.user.uid,
                    displayName: userCredential.user.displayName
                };
                localStorage.setItem('idToken', token);
                localStorage.setItem('user', JSON.stringify(this.user));

                // Connect to SSE after successful Google login
                this.connectSSE();
            } catch (error) {
                this.clearAuth()
                throw error;
            }
        },

        async validateToken() {
            if (!this.idToken) return false

            try {
                const user = auth.currentUser
                if (user) {
                    const token = await user.getIdToken(true) // Force refresh
                    this.idToken = token
                    localStorage.setItem('idToken', token)
                    return true
                }
                return false
            } catch (error) {
                this.clearAuth()
                return false
            }
        },

        async updateDisplayName(newDisplayName) {
            try {
                const user = auth.currentUser
                if (!user) {
                    throw new Error('No authenticated user found')
                }

                // Update the profile in Firebase
                await updateProfile(user, {
                    displayName: newDisplayName
                })

                // Update local state
                this.user = {
                    ...this.user,
                    displayName: newDisplayName
                }
                localStorage.setItem('user', JSON.stringify(this.user))

                return { success: true }
            } catch (error) {
                throw error
            }
        },

        async deleteAccount() {
            try {
                const user = auth.currentUser
                if (!user) {
                    throw new Error('No authenticated user found')
                }

                try {
                    // Try to delete the user directly first
                    await deleteUser(user)
                } catch (error) {
                    if (error.code === 'auth/requires-recent-login') {
                        // Handle re-authentication automatically
                        await this.handleReauthenticationForDeletion(user)
                        // Try deletion again after re-authentication
                        await deleteUser(user)
                    } else {
                        throw error
                    }
                }

                // Clear local auth state
                this.clearAuth()

                return { success: true }
            } catch (error) {
                throw error
            }
        },

        async handleReauthenticationForDeletion(user) {
            // Check how the user originally signed in
            const providerData = user.providerData

            if (providerData.some(provider => provider.providerId === 'google.com')) {
                // User signed in with Google - use popup re-authentication
                const provider = new GoogleAuthProvider()
                await reauthenticateWithPopup(user, provider)
            } else {
                // For email/password users, we need to get their password
                // Since we can't get the password automatically, we'll throw a specific error
                throw new Error('EMAIL_REAUTH_REQUIRED')
            }
        },
        
        connectSSE() {
            if (!this.idToken) {
                return
            }

            // Connect to SSE
            sseService.connect(this.idToken)

            // Set up event listeners
            this.setupSSEListeners()
        },
        
        setupSSEListeners() {
            // Listen for notifications - DISABLED
            // sseService.on('notification', (data) => {
            //     const notification = data.notification
            //     notificationService.show(
            //         notification.title,
            //         notification.message,
            //         notification.type,
            //         notification.type === 'error' ? 8000 : 5000
            //     )
            // })
            
            // Listen for session invitations - NOTIFICATIONS DISABLED
            sseService.on('session_invitation', (data) => {
                // notificationService.info(
                //     'New Session Invitation',
                //     `${data.invitation.from_user} invited you to a counseling session`,
                //     6000
                // )
            })
            
            // Listen for session invitation acceptance - NOTIFICATIONS DISABLED
            sseService.on('session_invitation_accepted', (data) => {
                // notificationService.success(
                //     'Invitation Accepted',
                //     data.session.message || 'Your session invitation was accepted!',
                //     5000
                // )
            })
            
            // Listen for relationship invitations
            sseService.on('relationship_invitation', (data) => {
                notificationService.info(
                    'New Relationship Invitation',
                    `${data.invitation.from_user} sent you a relationship invitation`,
                    6000
                )
            })
            
            // Listen for session deletion
            sseService.on('session_deleted', (data) => {
                notificationService.warning(
                    'Session Deleted',
                    'A session you were participating in has been deleted',
                    6000
                )
            })
            
            // Listen for connection status changes
            sseService.onConnectionChange((status) => {
                // Handle connection status changes silently
            })
        }
    }
})