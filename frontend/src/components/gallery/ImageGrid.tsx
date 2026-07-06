"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { downloadImage, downloadImageFromBase64, formatFileSize, truncateText } from "@/lib/utils"

interface GeneratedImage {
  id: string
  url?: string
  b64_json?: string
  prompt: string
  model: string
  size: string
  createdAt: Date
  status: "pending" | "generating" | "completed" | "failed"
  progress: number
  error?: string
}

interface ImageGridProps {
  images: GeneratedImage[]
  onDelete?: (id: string) => void
  onDownload?: (image: GeneratedImage) => void
  onEdit?: (image: GeneratedImage) => void
}

export function ImageGrid({ images, onDelete, onDownload, onEdit }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)

  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🖼️</div>
        <p className="text-gray-400 text-lg">暂无生成结果</p>
        <p className="text-gray-500 text-sm mt-1">在左侧输入提示词开始生成</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900 hover:border-blue-500/50 transition-all"
          >
            {/* Image */}
            {img.status === "completed" && img.url && (
              <div className="relative w-full aspect-square bg-gray-800">
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full h-full object-cover cursor-pointer"
                  onError={(e) => {
                    // URL 加载失败，显示灰色占位
                    ;(e.target as HTMLImageElement).style.display = 'none'
                    const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.img-fallback') as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div className="img-fallback hidden absolute inset-0 items-center justify-center bg-gray-800 text-gray-500 text-sm cursor-pointer"
                     onClick={() => setSelectedImage(img)}>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🖼️</div>
                    <p className="text-xs">CDN 不可用<br/>图片已保存</p>
                  </div>
                </div>
              </div>
            )}
            {img.status === "completed" && !img.url && img.b64_json && (
              <div className="relative w-full aspect-square bg-gray-800">
                <img
                  src={`data:image/png;base64,${img.b64_json}`}
                  alt={img.prompt}
                  className="w-full h-full object-cover cursor-pointer"
                />
              </div>
            )}
            {img.status === "generating" && (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-gray-800">
                <div className="text-4xl mb-2 animate-pulse">⏳</div>
                <Progress value={img.progress} className="w-3/4" />
                <span className="text-xs text-gray-400 mt-2">{img.progress}%</span>
              </div>
            )}
            {img.status === "failed" && (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-red-900/20 border border-red-800">
                <div className="text-4xl mb-2">❌</div>
                <p className="text-red-400 text-sm px-4 text-center">{truncateText(img.error || "生成失败", 40)}</p>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {img.status === "completed" && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => {
                      if (img.url) downloadImage(img.url, `${img.id}.png`)
                      else if (img.b64_json) downloadImageFromBase64(img.b64_json, `${img.id}.png`)
                    }}
                  >
                    💾 下载
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => setSelectedImage(img)}
                  >
                    🔍 查看
                  </Button>
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-purple-500/50 hover:bg-purple-500/70 text-white border-0"
                      onClick={() => onEdit(img)}
                    >
                      ✏️ 编辑
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-red-500/50 hover:bg-red-500/70 text-white border-0"
                      onClick={() => onDelete(img.id)}
                    >
                      🗑️
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Info bar */}
            <div className="p-3 border-t border-gray-800">
              <p className="text-xs text-gray-400 truncate" title={img.prompt}>
                {truncateText(img.prompt, 30)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                  {img.model}
                </Badge>
                <span className="text-[10px] text-gray-500">{img.size}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url || `data:image/png;base64,${selectedImage.b64_json}`}
              alt={selectedImage.prompt}
              className="w-full max-h-[70vh] object-contain"
            />
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-300">
                <strong>提示词:</strong> {selectedImage.prompt}
              </p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>模型: {selectedImage.model}</span>
                <span>尺寸: {selectedImage.size}</span>
                <span>时间: {selectedImage.createdAt.toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedImage.url) downloadImage(selectedImage.url, `${selectedImage.id}.png`)
                    else if (selectedImage.b64_json) downloadImageFromBase64(selectedImage.b64_json, `${selectedImage.id}.png`)
                  }}
                >
                  💾 下载
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedImage(null)}>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
