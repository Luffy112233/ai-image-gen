"use client"

import { Layout } from "@/components/layout"
import { GenerationParams } from "@/components/editor/GenerationParams"
import { ImageUploader, UploadedFile } from "@/components/upload/ImageUploader"
import { ImageGrid } from "@/components/gallery/ImageGrid"
import { useGenerationStore } from "@/stores/generation-store"
import { useState, useEffect, useCallback } from "react"

export default function GeneratePage() {
  const { tasks, addTask, startGeneration, clearTasks, isGenerating, updateProgress, cancelTask } = useGenerationStore()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [params, setParams] = useState({
    prompt: "",
    negativePrompt: "",
    model: "",
    size: "1024x1024",
    numImages: 1,
    seed: null as number | null,
    guidanceScale: 7.5,
    enableAdvanced: false,
  })
  const [generating, setGenerating] = useState(false)

  // 加载可用模型
  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const res = await fetch("/api/v1/generation/models")
      const data = await res.json()
      // 合并所有模型的列表
      const models = new Set<string>()
      for (const adapter of data.models || []) {
        for (const m of (adapter.models || [])) {
          models.add(m)
        }
      }
      if (models.size > 0) {
        setAvailableModels(Array.from(models))
        // 如果当前没有选中的模型，自动选择第一个
        if (!params.model) {
          setParams(prev => ({ ...prev, model: Array.from(models)[0] }))
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err)
    }
  }
  // Poll for task status as fallback — 使用 backendTaskId 而不是 task.id
  useEffect(() => {
    const activeTasks = tasks.filter(t => ['pending', 'generating'].includes(t.status) && t.backendTaskId)
    if (activeTasks.length === 0) return

    const interval = setInterval(async () => {
      for (const task of activeTasks) {
        try {
          const response = await fetch(`/api/v1/generation/status/${task.backendTaskId}`)
          if (response.ok) {
            const status = await response.json()
            if (status.status !== task.status || status.progress !== task.progress) {
              updateProgress(task.id, status.progress || 0, status.status || 'generating', status.images)
            }
          }
        } catch (e) {
          // Ignore polling errors
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [tasks, updateProgress])

  const handleGenerate = useCallback(async () => {
    if (!params.prompt.trim() || generating) return
    setGenerating(true)

    console.log('[UPLOAD] uploadedFiles count:', uploadedFiles.length, uploadedFiles)
    let imageBase64: string | undefined
    if (uploadedFiles.length > 0) {
      const firstFile = uploadedFiles[0].file
      console.log('[UPLOAD] First file:', firstFile.name, firstFile.type, firstFile.size)
      imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(firstFile)
      })
      console.log('[UPLOAD] Converted image to base64, length:', imageBase64?.length)
    }

    // 构建请求 payload
    const request: any = {
      prompt: params.prompt,
      model: params.model,
      size: params.size,
      n: params.numImages,
      ...(params.negativePrompt && { negative_prompt: params.negativePrompt }),
      ...(params.seed !== null && { seed: params.seed }),
      ...(params.guidanceScale && { guidance_scale: params.guidanceScale }),
      async_mode: true,
    }

    // 如果有上传的图片，加入请求
    if (imageBase64) {
      request.image_url = imageBase64
      console.log('[UPLOAD] Added image_url to request, length:', imageBase64.length)
    }

    // Add task to store (creates local task entry)
    const taskId = addTask(request)

    // Start generation (calls backend API + polls for status)
    try {
      await startGeneration(taskId)
    } catch (err) {
      console.error("Generation failed:", err)
    } finally {
      // Reset generating flag after a delay to allow UI to update
      setTimeout(() => setGenerating(false), 1000)
    }
  }, [params, generating, addTask, startGeneration, uploadedFiles])

  const handleFileUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files)
  }

  // Collect all generated images from tasks
  const allImages = tasks.flatMap((t) => {
    if (t.images && t.images.length > 0) {
      return t.images.map((img, idx) => ({
        id: `${t.id}-${idx}`,
        url: img.url,
        b64_json: img.b64_json,
        prompt: t.request.prompt,
        model: t.request.model,
        size: t.request.size,
        createdAt: new Date(),
        status: "completed" as const,
        progress: 100,
      }))
    }
    return [{
      id: t.id,
      prompt: t.request.prompt,
      model: t.request.model,
      size: t.request.size,
      createdAt: new Date(),
      status: t.status as any,
      progress: t.progress,
      error: t.result?.error,
    }]
  })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Controls */}
          <div className="w-full lg:w-[400px] flex-shrink-0 space-y-4">
            <h2 className="text-2xl font-bold text-white">🎨 图片生成</h2>
            
            {/* Active Tasks Status */}
            {tasks.some(t => ['pending', 'generating'].includes(t.status)) && (
              <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-800">
                <p className="text-sm text-blue-400">
                  ⏳ {tasks.filter(t => ['pending', 'generating'].includes(t.status)).length} 个任务正在运行
                </p>
                <div className="mt-2 space-y-1">
                  {tasks.filter(t => ['pending', 'generating'].includes(t.status)).map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 truncate max-w-[200px]">{t.request.prompt}</span>
                      <span className="text-blue-400 ml-2">{t.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Images */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">参考图片（可选）</h3>
              <ImageUploader
                onUpload={handleFileUpload}
                maxFiles={5}
              />
            </div>

            {/* Generation Params */}
            <GenerationParams
              params={params}
              onChange={(updates) => setParams({ ...params, ...updates })}
              onGenerate={handleGenerate}
              isGenerating={generating}
              availableModels={availableModels}
            />

            {/* Clear All */}
            {tasks.length > 0 && (
              <button
                onClick={clearTasks}
                className="text-sm text-gray-500 hover:text-red-400 transition"
              >
                清空所有任务
              </button>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                生成结果
                {allImages.length > 0 && (
                  <span className="ml-2 text-sm text-gray-400">
                    ({allImages.length} 张)
                  </span>
                )}
              </h2>
            </div>
            <ImageGrid images={allImages} onDelete={() => {}} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
