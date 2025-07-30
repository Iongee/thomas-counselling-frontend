import { API_BASE_URL } from '../api.js'

class SSEService {
    constructor() {
        this.eventSource = null
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 5
        this.reconnectDelay = 1000
        this.listeners = new Map()
        this.isConnected = false
        this.shouldReconnect = true
        this.connectionListeners = []
        this.lastToken = null
        this.tokenRefreshCallback = null
    }

    setTokenRefreshCallback(callback) {
        this.tokenRefreshCallback = callback
    }

    async connect(token) {
        if (this.eventSource) {
            this.disconnect()
        }

        if (!token) {
            console.error('SSE: No token provided')
            return
        }

        this.lastToken = token

        // Try the simple endpoint first, then fall back to the class-based one
        let url = `${API_BASE_URL}/api/sse-simple/?token=${encodeURIComponent(token)}`

        // Add ngrok header as URL parameter if using ngrok
        if (API_BASE_URL.includes('ngrok')) {
            url += '&ngrok-skip-browser-warning=true'
        }

        console.log('SSE: Connecting to:', url.replace(/token=[^&]+/, 'token=***'))

        this.eventSource = new EventSource(url, {
            withCredentials: true
        })

        this.eventSource.onopen = (event) => {
            this.isConnected = true
            this.reconnectAttempts = 0
            this.emit('connected', { status: 'connected' })
            this.notifyConnectionListeners('connected')
        }

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                this.emit('message', data)
            } catch (error) {
                // Handle parsing error silently
            }
        }

        this.eventSource.onerror = async (error) => {
            console.error('SSE: Connection error', {
                readyState: this.eventSource.readyState,
                error: error
            })
            this.isConnected = false
            this.notifyConnectionListeners('disconnected')

            // Check if it's a connection error (readyState 2 = CLOSED)
            if (this.eventSource.readyState === 2) {
                if (this.shouldReconnect) {
                    console.log('SSE: Connection closed, attempting to reconnect...')

                    // If we have a token refresh callback and this might be an auth error, try refreshing token first
                    if (this.tokenRefreshCallback && this.reconnectAttempts === 0) {
                        try {
                            console.log('SSE: Attempting to refresh token before reconnect...')
                            const newToken = await this.tokenRefreshCallback()
                            if (newToken && newToken !== this.lastToken) {
                                console.log('SSE: Got new token, reconnecting...')
                                this.connect(newToken)
                                return
                            }
                        } catch (refreshError) {
                            console.error('SSE: Token refresh failed:', refreshError)
                        }
                    }

                    this.handleReconnect(token)
                }
            }
        }

        // Handle specific event types
        this.addEventListener('connected', (event) => {
            const data = JSON.parse(event.data)
        })

        this.addEventListener('heartbeat', (event) => {
            // Keep connection alive
        })

        this.addEventListener('session_update', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_update', data)
        })

        this.addEventListener('session_invitation', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_invitation', data)
        })

        this.addEventListener('session_invitation_accepted', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_invitation_accepted', data)
        })

        this.addEventListener('session_invitation_rejected', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_invitation_rejected', data)
        })

        this.addEventListener('relationship_invitation', (event) => {
            const data = JSON.parse(event.data)
            this.emit('relationship_invitation', data)
        })

        this.addEventListener('notification', (event) => {
            const data = JSON.parse(event.data)
            this.emit('notification', data)
        })

        this.addEventListener('session_deleted', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_deleted', data)
        })

        this.addEventListener('sessions_update', (event) => {
            const data = JSON.parse(event.data)
            this.emit('sessions_update', data)
        })

        this.addEventListener('objective_advancement', (event) => {
            const data = JSON.parse(event.data)
            this.emit('objective_advancement', data)
        })

        this.addEventListener('session_status_change', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_status_change', data)
        })

        this.addEventListener('vote_update', (event) => {
            const data = JSON.parse(event.data)
            this.emit('vote_update', data)
        })

        this.addEventListener('objective_transition', (event) => {
            const data = JSON.parse(event.data)
            this.emit('objective_transition', data)
        })

        this.addEventListener('session_completion', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_completion', data)
        })

        this.addEventListener('end_session_vote_update', (event) => {
            const data = JSON.parse(event.data)
            this.emit('end_session_vote_update', data)
        })

        this.addEventListener('session_summary_generated', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_summary_generated', data)
        })

        this.addEventListener('session_summary_generating', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_summary_generating', data)
        })

        this.addEventListener('session_summary_error', (event) => {
            const data = JSON.parse(event.data)
            this.emit('session_summary_error', data)
        })

        this.addEventListener('objective_completion', (event) => {
            const data = JSON.parse(event.data)
            this.emit('objective_completion', data)
        })
    }

    disconnect() {
        this.shouldReconnect = false

        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }

        this.isConnected = false
        this.notifyConnectionListeners('disconnected')
    }

    handleReconnect(token) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++

            setTimeout(() => {
                if (this.shouldReconnect) {
                    this.connect(token)
                }
            }, this.reconnectDelay * this.reconnectAttempts)
        } else {
            this.emit('connection_failed', { error: 'Max reconnection attempts reached' })
        }
    }

    addEventListener(eventType, callback) {
        if (this.eventSource) {
            this.eventSource.addEventListener(eventType, callback)
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, [])
        }
        this.listeners.get(event).push(callback)
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event)
            const index = callbacks.indexOf(callback)
            if (index > -1) {
                callbacks.splice(index, 1)
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data)
                } catch (error) {
                    // Handle listener error silently
                }
            })
        }
    }

    onConnectionChange(callback) {
        this.connectionListeners.push(callback)
    }

    offConnectionChange(callback) {
        const index = this.connectionListeners.indexOf(callback)
        if (index > -1) {
            this.connectionListeners.splice(index, 1)
        }
    }

    notifyConnectionListeners(status) {
        this.connectionListeners.forEach(callback => {
            try {
                callback(status)
            } catch (error) {
                // Handle connection listener error silently
            }
        })
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            shouldReconnect: this.shouldReconnect,
            readyState: this.eventSource ? this.eventSource.readyState : null,
            url: this.eventSource ? this.eventSource.url : null
        }
    }

    // Method to test connection with detailed error reporting
    async testConnection(token) {
        return new Promise((resolve) => {
            const testUrl = `${API_BASE_URL}/api/sse-simple/?token=${encodeURIComponent(token)}`

            if (API_BASE_URL.includes('ngrok')) {
                testUrl += '&ngrok-skip-browser-warning=true'
            }

            console.log('SSE: Testing connection to:', testUrl.replace(/token=[^&]+/, 'token=***'))

            const testEventSource = new EventSource(testUrl, { withCredentials: true })

            const timeout = setTimeout(() => {
                testEventSource.close()
                resolve({
                    success: false,
                    error: 'Connection timeout',
                    readyState: testEventSource.readyState
                })
            }, 10000) // 10 second timeout

            testEventSource.onopen = () => {
                clearTimeout(timeout)
                testEventSource.close()
                resolve({
                    success: true,
                    message: 'Connection successful'
                })
            }

            testEventSource.onerror = (error) => {
                clearTimeout(timeout)
                testEventSource.close()
                resolve({
                    success: false,
                    error: 'Connection failed',
                    readyState: testEventSource.readyState,
                    details: error
                })
            }
        })
    }
}

// Create singleton instance
const sseService = new SSEService()

export default sseService 