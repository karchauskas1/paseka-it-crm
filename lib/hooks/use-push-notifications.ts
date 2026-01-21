'use client'

import { useState, useEffect, useCallback } from 'react'

interface PushNotificationState {
  supported: boolean
  permission: NotificationPermission | null
  subscription: PushSubscription | null
  loading: boolean
  error: string | null
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    supported: false,
    permission: null,
    subscription: null,
    loading: true,
    error: null,
  })

  // Check support and current state on mount
  useEffect(() => {
    const checkSupport = async () => {
      // Check browser support
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

      if (!supported) {
        setState((prev) => ({
          ...prev,
          supported: false,
          loading: false,
        }))
        return
      }

      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered:', registration)

        // Get current permission
        const permission = Notification.permission

        // Get existing subscription
        const subscription = await registration.pushManager.getSubscription()

        setState({
          supported: true,
          permission,
          subscription,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error('Push notifications setup error:', error)
        setState((prev) => ({
          ...prev,
          supported: true,
          loading: false,
          error: 'Не удалось настроить push-уведомления',
        }))
      }
    }

    checkSupport()
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!state.supported) {
      setState((prev) => ({ ...prev, error: 'Push-уведомления не поддерживаются' }))
      return false
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          permission,
          loading: false,
          error: 'Разрешение на уведомления отклонено',
        }))
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from env (needs to be exposed in the UI)
      // For now, we'll skip the actual push subscription and just track permission
      // In production, you'd need to set up VAPID keys

      // Try to subscribe (this will fail without VAPID keys configured)
      // const subscription = await registration.pushManager.subscribe({
      //   userVisibleOnly: true,
      //   applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      // })

      // For now, just update permission state
      setState((prev) => ({
        ...prev,
        permission: 'granted',
        loading: false,
      }))

      // Note: In production, you would send the subscription to your server:
      // await fetch('/api/push/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ subscription }),
      // })

      return true
    } catch (error) {
      console.error('Push subscription error:', error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Не удалось подписаться на уведомления',
      }))
      return false
    }
  }, [state.supported])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!state.subscription) {
      return true
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Unsubscribe from push manager
      await state.subscription.unsubscribe()

      // Remove subscription from server
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: state.subscription.endpoint }),
      })

      setState((prev) => ({
        ...prev,
        subscription: null,
        loading: false,
      }))

      return true
    } catch (error) {
      console.error('Push unsubscription error:', error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Не удалось отписаться от уведомлений',
      }))
      return false
    }
  }, [state.subscription])

  // Show a local notification (for testing)
  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (state.permission !== 'granted') {
        console.warn('Notification permission not granted')
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          ...options,
        })
      } catch (error) {
        console.error('Failed to show notification:', error)
      }
    },
    [state.permission]
  )

  return {
    ...state,
    subscribe,
    unsubscribe,
    showNotification,
    isSubscribed: !!state.subscription || state.permission === 'granted',
  }
}
