"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  file: File
  preview: string
  id: string
}

interface ImageUploaderProps {
  onUpload: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
}

export function ImageUploader({
  onUpload,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
  acceptedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"],
}: ImageUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(2, 9),
    }))
    
    const updated = [...files, ...newFiles].slice(0, maxFiles)
    setFiles(updated)
    onUpload(updated)
  }, [files, maxFiles, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": acceptedTypes },
    maxSize,
    multiple: true,
    maxFiles,
  })

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id)
    setFiles(updated)
    onUpload(updated)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-2">📤</div>
        <p className="text-gray-300 font-medium">
          {isDragActive ? "拖放图片到这里" : "点击或拖放图片到此区域"}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          支持 PNG, JPG, WEBP · 最大 {maxSize / 1024 / 1024}MB · 最多 {maxFiles} 张
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((f) => (
            <div key={f.id} className="relative group rounded-lg overflow-hidden border border-gray-700">
              <img src={f.preview} alt={f.file.name} className="w-full h-24 object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <span className="text-xs text-white truncate max-w-[80px]">{f.file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
