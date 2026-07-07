"use client"

import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader, UploadedFile } from "@/components/upload/ImageUploader"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useGenerationStore } from "@/stores/generation-store"

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startGeneration, addTask, tasks } = useGenerationStore()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [prompt, setPrompt] = useState("")
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("")
  const [availableModels, setAvailableModels] = useState<string[]>([])

  // 加载可用模型
  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch("/api/v1/generation/models")
        const data = await res.json()
        const models = new Set<string>()
        for (const adapter of data.models || []) {
          for (const m of (adapter.models || [])) {
            models.add(m)
          }
        }
        if (models.size > 0) {
          setAvailableModels(Array.from(models))
          setSelectedModel(Array.from(models)[0])
        }
      } catch (err) {
        console.error("Failed to load models:", err)
      }
    }
    loadModels()
  }, [])

  // 从 URL 参数或 sessionStorage 预加载图片
  useEffect(() => {
    const imageUrl = searchParams.get("url")
    const initialPrompt = searchParams.get("prompt")
    
    if (initialPrompt) {
      setPrompt(initialPrompt)
    }

    if (imageUrl) {
      setUploadedFiles([{
        file: new File([new ArrayBuffer(0)], "edited-image.png", { type: "image/png" }),
        preview: imageUrl,
        id: "from-gallery"
      }])
      return
    }

    // 尝试从 sessionStorage 读取（作品库编辑跳转过来）
    const pendingEdit = sessionStorage.getItem('editor_pending_edit')
    if (pendingEdit) {
      try {
        const { b64, prompt: storedPrompt } = JSON.parse(pendingEdit)
        if (storedPrompt) setPrompt(storedPrompt)
        setUploadedFiles([{
          file: new File([new ArrayBuffer(0)], "edited-image.png", { type: "image/png" }),
          preview: `data:image/png;base64,${b64}`,
          id: "from-gallery"
        }])
        sessionStorage.removeItem('editor_pending_edit')
      } catch (e) {
        console.error("[EDITOR] Failed to load from sessionStorage:", e)
      }
    }
    
    setLoading(false)
  }, [searchParams])

  // 监听生成任务完成
  useEffect(() => {
    const currentTask = tasks.find(t => t.status === 'completed' && t.images?.length > 0)
    if (currentTask && currentTask.images?.[0]?.b64_json) {
      setResultImage(currentTask.images[0].b64_json)
      setError(null)
      setEditing(false)
    }
  }, [tasks])

  const handleStartEdit = async () => {
    if (!uploadedFiles.length || !prompt.trim()) return
    
    setError(null)
    setResultImage(null)
    setEditing(true)

    const imageData = uploadedFiles[0].preview

    try {
      // 先创建任务
      const taskId = addTask({
        prompt: prompt,
        model: selectedModel || "gpt-image-2",
        size: "1024x1024",
        n: 1,
        image_url: imageData,
        async_mode: true,
      })
      // 再启动生成
      await startGeneration(taskId)
    } catch (e: any) {
      console.error("[EDITOR] Generation failed:", e)
      setError(e.message || "编辑失败")
      setEditing(false)
    }
  }

  // 没有图片时的空状态
  if (!loading && uploadedFiles.length === 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-white">🖌️ 图片编辑</h2>
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-400 mb-4">请先上传一张图片进行编辑</p>
              <Button variant="outline" onClick={() => router.push("/generate")}>
                ← 返回生成页面
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🖌️ 图片编辑</h2>
          <Button variant="outline" size="sm" onClick={() => router.push("/gallery")}>
            ← 返回作品库
          </Button>
        </div>

        {/* Upload Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">上传编辑图片</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader onUpload={(files) => setUploadedFiles(files)} maxFiles={1} />
            {uploadedFiles.length > 0 && (
              <p className="text-xs text-green-400 mt-2">✅ 已加载图片</p>
            )}
          </CardContent>
        </Card>

        {/* Editing Controls */}
        {uploadedFiles.length > 0 && !resultImage && (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">编辑操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">编辑指令</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要的编辑效果，例如：把背景换成星空..."
                  className="min-h-[80px] bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">模型</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                >
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  ) : (
                    <option value="">加载中...</option>
                  )}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-gray-300 border-gray-700"
                  onClick={() => setPrompt("把图片变成卡通风格")}>🔄 风格迁移</Button>
                <Button variant="outline" size="sm" className="text-gray-300 border-gray-700"
                  onClick={() => setPrompt("智能扩图，扩展背景")}>✂️ 智能扩图</Button>
                <Button variant="outline" size="sm" className="text-gray-300 border-gray-700"
                  onClick={() => setPrompt("局部重绘，优化细节")}>🎭 局部重绘</Button>
                <Button variant="outline" size="sm" className="text-gray-300 border-gray-700"
                  onClick={() => setPrompt("高清放大，提升分辨率")}>📐 高清放大</Button>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  ❌ {error}
                </div>
              )}

              <Button
                onClick={handleStartEdit}
                disabled={!prompt.trim() || editing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {editing ? "⏳ 编辑中..." : "✨ 开始编辑"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Original Image Preview */}
        {uploadedFiles.length > 0 && !resultImage && (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader><CardTitle className="text-white">原图</CardTitle></CardHeader>
            <CardContent>
              <img src={uploadedFiles[0].preview} alt="Original" className="max-w-full rounded-lg border border-gray-700" />
            </CardContent>
          </Card>
        )}

        {/* Result Image */}
        {resultImage && (
          <Card className="border-green-800 bg-gray-900/50 border-2">
            <CardHeader>
              <CardTitle className="text-green-400">✅ 编辑完成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <img src={`data:image/png;base64,${resultImage}`} alt="Result" className="max-w-full rounded-lg border border-gray-700" />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const a = document.createElement("a")
                    a.href = `data:image/png;base64,${resultImage}`
                    a.download = `edited-${Date.now()}.png`
                    a.click()
                  }}
                >
                  💾 下载
                </Button>
                <Button variant="outline" onClick={() => setResultImage(null)}>
                  🔄 继续编辑
                </Button>
                <Button variant="outline" onClick={() => router.push("/gallery")}>
                  📂 去作品库
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
