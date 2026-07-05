/**
 * WebSocket hook for real-time task progress updates
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface TaskStatus {
  task_id: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled' | 'cancelling' | 'not_found'
  progress: number
  images: Array<{ url?: string; b64_json?: string }>
  error?: string
  created_at?: string
}

export function useTaskWebSocket(taskId: string | null) {
  const [status, setStatus] = useState<TaskStatus | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (!taskId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/tasks/${taskId}`
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected to task:', taskId)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'status_update') {
          setStatus(data)
        } else if (data.type === 'pong') {
          // Heartbeat response, ignore
        }
      } catch (e) {
        console.error('[WS] Failed to parse message:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('[WS] Error:', error)
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected')
      // Auto-reconnect after 3 seconds
      reconnectTimerRef.current = window.setTimeout(connect, 3000)
    }
  }, [taskId])

  useEffect(() => {
    connect()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [taskId, connect])

  // Send ping to keep connection alive
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    const interval = setInterval(() => {
      try {
        wsRef.current?.send(JSON.stringify({ type: 'ping' }))
      } catch (e) {
        // Connection closed, ignore
      }
    }, 30000) // Ping every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return { status, isConnected: wsRef.current?.readyState === WebSocket.OPEN }
}
