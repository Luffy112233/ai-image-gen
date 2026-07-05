"use client"

import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader, UploadedFile } from "@/components/upload/ImageUploader"
import { useState } from "react"

export default function EditorPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [prompt, setPrompt] = useState("")
  const [editing, setEditing] = useState(false)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white">🖌️ 图片编辑</h2>

        {/* Upload Section */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">上传编辑图片</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              onUpload={(files) => setUploadedFiles(files)}
              maxFiles={1}
            />
          </CardContent>
        </Card>

        {/* Editing Controls */}
        {uploadedFiles.length > 0 && (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">编辑操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt for editing */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">编辑指令</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要的编辑效果，例如：把背景换成星空..."
                  className="min-h-[80px] bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-700"
                >
                  🔄 风格迁移
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-700"
                >
                  ✂️ 智能扩图
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-700"
                >
                  🎭 局部重绘
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-700"
                >
                  📐 高清放大
                </Button>
              </div>

              <Button
                onClick={() => setEditing(true)}
                disabled={!prompt.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {editing ? "⏳ 编辑中..." : "✨ 开始编辑"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {uploadedFiles.length > 0 && (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">预览</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={uploadedFiles[0].preview}
                alt="Preview"
                className="max-w-full rounded-lg border border-gray-700"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
