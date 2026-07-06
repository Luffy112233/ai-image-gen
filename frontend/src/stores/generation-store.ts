/**
 * Store for image generation tasks with async mode + WebSocket progress
 * 持久化到 localStorage，刷新页面后作品库仍可查看
 */

import { create } from 'zustand'
import { generateImage, GenerationRequest, GenerationResult } from '@/lib/api-client'

const STORAGE_KEY = 'ai_image_gen_gallery'

// 从 localStorage 加载已保存的图片
function loadGallery(): Array<{ url?: string; b64_json?: string; prompt: string; model?: string; size?: string; createdAt: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    console.log('[GALLERY] localStorage.getItem result:', raw ? `OK (${raw.length} chars)` : 'null')
    if (raw) {
      const parsed = JSON.parse(raw)
      console.log('[GALLERY] Parsed gallery count:', parsed.length)
      if (parsed.length > 0) {
        console.log('[GALLERY] First entry:', parsed[0])
      }
      return parsed
    }
  } catch (e) {
    console.error('Failed to load gallery:', e)
  }
  return []
}

// 保存图片到 localStorage（只存有 url 的图片，忽略 b64_json 避免超限）
function saveGallery(images: Array<{ url?: string; b64_json?: string; prompt: string; model?: string; size?: string; createdAt: string }>) {
  try {
    // 只保留有 url 的图片（b64_json 太大，localStorage 存不下）
    const withUrl = images.filter(img => img.url && img.url.length > 0)
    console.log('[GALLERY] Images with URL:', withUrl.length)
    // 按时间倒序排列，保留最近 50 张
    const sorted = withUrl.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50)
    const jsonStr = JSON.stringify(sorted)
    console.log('[GALLERY] JSON string length:', jsonStr.length, 'chars')
    localStorage.setItem(STORAGE_KEY, jsonStr)
    console.log('[GALLERY] localStorage.setItem succeeded')
    // 立即读回验证
    const verify = localStorage.getItem(STORAGE_KEY)
    console.log('[GALLERY] Verify read-back:', verify ? `OK (${verify.length} chars)` : 'FAILED')
  } catch (e) {
    console.error('[GALLERY] Save failed (likely localStorage quota exceeded):', e)
  }
}

interface GenerationTask {
  id: string
  backendTaskId: string | null
  request: GenerationRequest
  result: GenerationResult | null
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled'
  progress: number
  images: Array<{ url?: string; b64_json?: string }>
}

interface GenerationState {
  tasks: GenerationTask[]
  isGenerating: boolean
  gallery: Array<{ url?: string; b64_json?: string; prompt: string; model?: string; size?: string; createdAt: string }>
  
  // Actions
  addTask: (request: GenerationRequest) => string
  startGeneration: (taskId: string) => Promise<void>
  completeTask: (taskId: string, result: GenerationResult) => void
  failTask: (taskId: string, error: string) => void
  updateProgress: (taskId: string, progress: number, status: string, images?: Array<{url?: string; b64_json?: string}>) => void
  removeTask: (taskId: string) => void
  clearTasks: () => void
  cancelTask: (taskId: string) => void
  clearGallery: () => void
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  tasks: [],
  isGenerating: false,
  gallery: loadGallery(),
  
  addTask: (request) => {
    const id = crypto.randomUUID()
    set((state) => ({
      tasks: [...state.tasks, {
        id,
        backendTaskId: null,
        request,
        result: null,
        status: 'pending',
        progress: 0,
        images: [],
      }],
    }))
    return id
  },
  
  startGeneration: async (taskId) => {
    set((state) => ({
      isGenerating: true,
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'generating', progress: 10 } : t
      ),
    }))
    
    const state = get()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) return
    
    try {
      // Call async generation API
      console.log('[STORE] Calling /api/v1/generation with:', { prompt: task.request.prompt, model: task.request.model, hasImage: !!task.request.image_url, imageLength: task.request.image_url?.length })
      const body = JSON.stringify({ ...task.request, async_mode: true })
      console.log('[STORE] Body has image_url:', body.includes('image_url'), 'body starts with:', body.substring(0, 200))
      const response = await fetch('/api/v1/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task.request, async_mode: true }),
      })
      
      if (!response.ok) {
        console.error('[STORE] API error:', response.status, response.statusText)
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[STORE] Received task_id:', data.task_id)
      // 存储后端返回的 task_id
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, backendTaskId: data.task_id, status: 'generating' as const, progress: 20 } : t
        ),
      }))
      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResp = await fetch(`/api/v1/generation/status/${data.task_id}`)
          if (statusResp.ok) {
            const status = await statusResp.json()
            console.log('[STORE] Poll status:', { taskId: data.task_id, backendStatus: status.status, backendProgress: status.progress, frontendStatus: task.status, frontendProgress: task.progress })
            if (status.status !== task.status || status.progress !== task.progress) {
              get().updateProgress(task.id, status.progress || 0, status.status || 'generating', status.images)
            }
            
            // Stop polling when complete
            if (['completed', 'failed', 'cancelled'].includes(status.status)) {
              console.log('[STORE] Stopping poll - task completed')
              clearInterval(pollInterval)
            }
          }
        } catch (e) {
          console.error('[STORE] Poll error:', e)
        }
      }, 2000)
      
      // Clean up interval after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000)
      
    } catch (error) {
      console.error('[STORE] Generation error:', error)
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { 
            ...t, 
            status: 'failed' as const, 
            progress: 0,
            result: {
              task_id: taskId,
              status: 'failed',
              images: [],
              error: String(error),
              progress: 0,
            }
          } : t
        ),
        isGenerating: false,
      }))
    }
  },
  
  completeTask: (taskId, result) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { 
          ...t, 
          result, 
          status: 'completed' as const, 
          progress: 100,
          images: result.images,
        } : t
      ),
      isGenerating: state.tasks.length > 1 ? state.isGenerating : false,
    }))
  },
  
  failTask: (taskId, error) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { 
          ...t, 
          status: 'failed' as const, 
          progress: 0,
          result: {
            task_id: taskId,
            status: 'failed',
            images: [],
            error,
            progress: 0,
          }
        } : t
      ),
      isGenerating: false,
    }))
  },
  
  updateProgress: (taskId, progress, status, images) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? {
          ...t,
          status: status as any,
          progress,
          images: images || t.images,
          result: status === 'completed' ? {
            task_id: taskId,
            status: 'completed',
            images: images || [],
            progress,
          } : status === 'failed' ? {
            task_id: taskId,
            status: 'failed',
            images: [],
            error: 'Generation failed',
            progress,
          } : t.result,
        } : t
      ),
      isGenerating: state.tasks.some(t => 
        ['pending', 'generating'].includes(t.status)
      ),
    }))
    
    // 当任务完成时，保存图片到 gallery
    if (status === 'completed' && images && images.length > 0) {
      console.log('[STORE] Task completed, saving to gallery:', { taskId, imageCount: images.length, firstImageUrl: images[0]?.url })
      const gallery = get().gallery
      const task = get().tasks.find(t => t.id === taskId)
      const newImages = images.map((img, idx) => ({
        url: img.url,
        prompt: task?.request.prompt || '',
        model: task?.request.model,
        size: task?.request.size,
        createdAt: new Date().toISOString(),
      }))
      console.log('[STORE] Image entry:', { url: newImages[0]?.url, urlLen: newImages[0]?.url?.length, prompt: newImages[0]?.prompt })
      const updatedGallery = [...newImages, ...gallery]
      console.log('[STORE] Updated gallery size:', updatedGallery.length)
      // 保留所有有效图片（有 url 或 b64_json 的都保留），最多50张
      const persistedGallery = updatedGallery.slice(0, 50)
      console.log('[STORE] Persisted gallery (valid URLs only):', persistedGallery.length, persistedGallery.map(i => i.url?.substring(0, 60)))
      if (persistedGallery.length === 0) {
        console.warn('[STORE] No valid URLs to persist')
        return
      }
      saveGallery(persistedGallery)
      set({ gallery: updatedGallery })
      const verify = localStorage.getItem(STORAGE_KEY)
      console.log('[STORE] localStorage verify:', verify ? `OK (${verify.length} chars)` : 'EMPTY')
    }
  },
  
  cancelTask: async (taskId) => {
    try {
      await fetch(`/api/v1/generation/cancel/${taskId}`, {
        method: 'POST',
      })
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'cancelled' as const, progress: 0 } : t
        ),
      }))
    } catch (e) {
      console.error('Failed to cancel task:', e)
    }
  },
  
  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }))
  },
  
  clearTasks: () => {
    set({ tasks: [], isGenerating: false })
  },
  
  clearGallery: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ gallery: [] })
  },
  
  deleteFromGallery: (idx: number) => {
    set((state) => {
      const newGallery = state.gallery.filter((_, i) => i !== idx)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newGallery))
      return { gallery: newGallery }
    })
  },
}))
