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
    }

    connect(token) {
        if (this.eventSource) {
            this.disconnect()
        }

        if (!token) {
            return
        }

        // Try the simple endpoint first, then fall back to the class-based one
        const url = `${API_BASE_URL}/api/sse-simple/?token=${encodeURIComponent(token)}`
        
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
        
        this.eventSource.onerror = (error) => {
            this.isConnected = false
            this.notifyConnectionListeners('disconnected')

            // Check if it's a connection error (readyState 2 = CLOSED)
            if (this.eventSource.readyState === 2) {
                if (this.shouldReconnect) {
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
            shouldReconnect: this.shouldReconnect
        }
    }
}

// Create singleton instance
const sseService = new SSEService()

export default sseService 