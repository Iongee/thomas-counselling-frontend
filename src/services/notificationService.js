class NotificationService {
    constructor() {
        this.notifications = []
        this.listeners = []
        this.nextId = 1
    }
    
    show(title, message, type = 'info', duration = 5000) {
        const notification = {
            id: this.nextId++,
            title,
            message,
            type, // 'info', 'success', 'warning', 'error'
            timestamp: new Date(),
            duration,
            visible: true
        }
        
        this.notifications.push(notification)
        this.notifyListeners()
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification.id)
            }, duration)
        }
        
        return notification.id
    }
    
    hide(id) {
        const index = this.notifications.findIndex(n => n.id === id)
        if (index > -1) {
            this.notifications[index].visible = false
            this.notifyListeners()
            
            // Remove from array after fade animation
            setTimeout(() => {
                this.remove(id)
            }, 300)
        }
    }
    
    remove(id) {
        const index = this.notifications.findIndex(n => n.id === id)
        if (index > -1) {
            this.notifications.splice(index, 1)
            this.notifyListeners()
        }
    }
    
    clear() {
        this.notifications = []
        this.notifyListeners()
    }
    
    success(title, message, duration = 4000) {
        return this.show(title, message, 'success', duration)
    }
    
    info(title, message, duration = 4000) {
        return this.show(title, message, 'info', duration)
    }
    
    warning(title, message, duration = 6000) {
        return this.show(title, message, 'warning', duration)
    }
    
    error(title, message, duration = 8000) {
        return this.show(title, message, 'error', duration)
    }
    
    getNotifications() {
        return this.notifications
    }
    
    addListener(callback) {
        this.listeners.push(callback)
    }
    
    removeListener(callback) {
        const index = this.listeners.indexOf(callback)
        if (index > -1) {
            this.listeners.splice(index, 1)
        }
    }
    
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback([...this.notifications])
            } catch (error) {
                console.error('Error in notification listener:', error)
            }
        })
    }
}

// Create singleton instance
const notificationService = new NotificationService()

export default notificationService 