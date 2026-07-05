"use client"

import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("https://cdn.bondai.cc/v1")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("ai_image_gen_api_key")
    const savedUrl = localStorage.getItem("ai_image_gen_api_url")
    if (savedKey) setApiKey(savedKey)
    if (savedUrl) setApiUrl(savedUrl)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError("")
    
    try {
      // Save to localStorage for persistence
      localStorage.setItem("ai_image_gen_api_key", apiKey)
      localStorage.setItem("ai_image_gen_api_url", apiUrl)
      
      // Also save to backend config if logged in
      const token = localStorage.getItem("token")
      if (token && apiKey) {
        try {
          await fetch("http://localhost:8000/api/v1/settings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ api_key: apiKey, api_url: apiUrl }),
          })
        } catch {
          // Backend settings not critical, localStorage is enough
        }
      }
      
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white">⚙️ 系统设置</h2>

        {/* API Configuration */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">API 配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">API 地址</label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">API 密钥</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 API 密钥"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">密钥保存在浏览器本地存储中</p>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                {error}
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className={saved ? "bg-green-600" : "bg-blue-600"}
            >
              {saved ? "✅ 已保存" : saving ? "保存中..." : "💾 保存设置"}
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">关于</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              AI Image Gen v0.1.0
            </p>
            <p className="text-gray-500 text-xs mt-2">
              一个多功能AI图像生成平台，支持文生图、图生图、多图参考、并行生成、图片编辑等。
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
