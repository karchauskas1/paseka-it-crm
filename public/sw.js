// Service Worker for Push Notifications
// PASEKA IT CRM

const CACHE_NAME = 'paseka-crm-v1'

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(clients.claim())
})

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push received:', event)

  let data = {
    title: 'PASEKA CRM',
    body: 'У вас новое уведомление',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'default',
    data: {},
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = {
        ...data,
        ...payload,
      }
    } catch (e) {
      console.error('Failed to parse push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Открыть',
      },
      {
        action: 'dismiss',
        title: 'Закрыть',
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Get URL from notification data or default to /chat
  const url = event.notification.data?.url || '/chat'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (url) {
            client.navigate(url)
          }
          return
        }
      }
      // Open a new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)
})
