"use client"

import { Layout } from "@/components/layout"
import { ImageGrid } from "@/components/gallery/ImageGrid"
import { Button } from "@/components/ui/button"
import { useGenerationStore } from "@/stores/generation-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function GalleryPage() {
  const { gallery, clearGallery, deleteFromGallery } = useGenerationStore()
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "completed">("all")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDownload = async (image: typeof gallery[0]) => {
    if (image.b64_json) {
      try {
        const byteCharacters = atob(image.b64_json)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: "image/png" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `ai-image-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      } catch (e) {
        console.error("Download failed:", e)
      }
    }
    if (image.url) {
      const a = document.createElement("a")
      a.href = image.url
      a.download = `ai-image-${Date.now()}.png`
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleDelete = (idx: number) => {
    if (confirm('确定要删除这张作品吗？')) {
      deleteFromGallery(idx)
    }
  }

  const handleClearAll = () => {
    if (confirm("确定要清空所有作品吗？此操作不可恢复。")) {
      clearGallery()
    }
  }

  const handleEdit = (image: { url?: string; b64_json?: string; prompt?: string }) => {
    // 如果有 CDN URL，直接用；否则用 sessionStorage 传递 b64
    if (image.url) {
      router.push(`/editor?url=${encodeURIComponent(image.url)}&prompt=${encodeURIComponent(image.prompt || "")}`)
    } else if (image.b64_json) {
      // 把 b64 存入 sessionStorage，编辑器读取
      sessionStorage.setItem('editor_pending_edit', JSON.stringify({
        b64: image.b64_json,
        prompt: image.prompt || ''
      }))
      router.push('/editor')
    } else {
      alert('该图片没有可用的数据，无法编辑。')
    }
  }

  // 首次渲染时显示加载中，避免 SSR/CSR 不匹配
  if (!mounted) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">📂 作品库</h2>
              <p className="text-gray-400 text-sm mt-1">加载中...</p>
            </div>
          </div>
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-400 text-lg">正在加载作品库...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">📂 作品库</h2>
            <p className="text-gray-400 text-sm mt-1">共 {gallery.length} 张作品（保存在本地浏览器）</p>
          </div>
          <div className="flex gap-2">
            {gallery.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-400 border-red-500/50 hover:bg-red-500/10"
                onClick={handleClearAll}
              >
                🗑️ 清空全部
              </Button>
            )}
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-gray-400 text-lg">暂无生成作品</p>
            <p className="text-gray-500 text-sm mt-1">前往生成页面创作你的第一张图片</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-blue-400 border-blue-500/50 hover:bg-blue-500/10"
              onClick={() => (window.location.href = "/generate")}
            >
              去生成
            </Button>
          </div>
        ) : (
          <ImageGrid
            images={gallery.map((img, idx) => ({
              id: `${idx}`,
              url: img.url,
              b64_json: img.b64_json,
              prompt: img.prompt,
              model: img.model || "gpt-image-2",
              size: img.size || "1024x1024",
              createdAt: new Date(img.createdAt),
              status: "completed" as const,
              progress: 100,
            }))}
            onDelete={(idxStr) => handleDelete(Number(idxStr))}
            onDownload={handleDownload}
            onEdit={(img) => handleEdit(img)}
          />
        )}
      </div>
    </Layout>
  )
}
