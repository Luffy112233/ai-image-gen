"use client"

import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface ApiConfig {
  id: number
  name: string
  api_url: string
  api_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [activeConfig, setActiveConfig] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string; models: string[] }>>({})
  const [error, setError] = useState("")

  // 加载配置列表
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const res = await fetch("/v1/api-configs")
      const data = await res.json()
      setConfigs(data.configs)
      if (data.configs.length > 0) {
        const active = data.configs.find((c: ApiConfig) => c.is_active)
        setActiveConfig(active?.id ?? data.configs[0].id)
      }
    } catch (err) {
      setError("加载配置失败")
    }
  }

  // 开始编辑
  const startEdit = (config?: ApiConfig) => {
    if (config) {
      setEditingId(config.id)
      setName(config.name)
      setApiUrl(config.api_url)
      setApiKey(config.api_key)
    } else {
      setEditingId(null)
      setName("")
      setApiUrl("https://")
      setApiKey("")
    }
    setError("")
  }

  // 保存配置
  const handleSave = async () => {
    if (!name || !apiUrl || !apiKey) {
      setError("请填写所有字段")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (editingId) {
        // 更新
        const res = await fetch(`/v1/api-configs/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, api_url: apiUrl, api_key: apiKey }),
        })
        if (!res.ok) throw new Error("更新失败")
      } else {
        // 新建
        const res = await fetch("/v1/api-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, api_url: apiUrl, api_key: apiKey }),
        })
        if (!res.ok) throw new Error("创建失败")
      }
      loadConfigs()
      startEdit()
    } catch {
      setError("保存失败")
    } finally {
      setSaving(false)
    }
  }

  // 删除配置
  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个配置吗？")) return
    try {
      const res = await fetch(`/v1/api-configs/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("删除失败")
      loadConfigs()
    } catch {
      setError("删除失败")
    }
  }

  // 设为活跃
  const handleActivate = async (id: number) => {
    try {
      const res = await fetch(`/v1/api-configs/${id}/activate`, { method: "POST" })
      if (!res.ok) throw new Error("激活失败")
      loadConfigs()
    } catch {
      setError("激活失败")
    }
  }

  // 测试连接
  const handleTest = async (id: number) => {
    setTesting(id)
    try {
      const res = await fetch(`/v1/api-configs/${id}/test`, { method: "POST" })
      const data = await res.json()
      setTestResults(prev => ({ ...prev, [id]: data }))
    } catch {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: "测试失败", models: [] } }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">⚙️ 系统设置</h2>
          <Button onClick={() => startEdit()} className="bg-blue-600 hover:bg-blue-700">
            ➕ 新增配置
          </Button>
        </div>

        {/* 编辑表单 */}
        {(editingId !== null || name || apiUrl !== "https://" || apiKey) && (
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">{editingId ? "编辑配置" : "新增配置"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">名称</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：中转站"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">API 地址</label>
                <Input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="例如：https://api.bondai.cc/v1"
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
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? "保存中..." : editingId ? "更新配置" : "创建配置"}
                </Button>
                <Button onClick={() => startEdit()} variant="outline" className="border-gray-700 text-gray-400">
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 配置列表 */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">API 配置列表</h3>
          {configs.map((config) => (
            <Card key={config.id} className={`border-gray-800 bg-gray-900/50 ${config.is_active ? "border-green-600" : ""}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{config.name}</span>
                    {config.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-700">
                        活跃
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(config.id)}
                      disabled={testing === config.id}
                      className="border-gray-700 text-gray-400 text-xs"
                    >
                      {testing === config.id ? "测试中..." : "🔌 测试"}
                    </Button>
                    {!config.is_active && (
                      <Button
                        size="sm"
                        onClick={() => handleActivate(config.id)}
                        className="bg-green-600 hover:bg-green-700 text-xs"
                      >
                        设为活跃
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(config)}
                      className="border-gray-700 text-gray-400 text-xs"
                    >
                      ✏️ 编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(config.id)}
                      className="border-gray-700 text-red-400 hover:text-red-300 text-xs"
                    >
                      🗑️ 删除
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {config.api_url}
                </div>
                {/* 测试结果 */}
                {testResults[config.id] && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    testResults[config.id].success
                      ? "bg-green-900/30 text-green-400"
                      : "bg-red-900/30 text-red-400"
                  }`}>
                    {testResults[config.id].message}
                    {testResults[config.id].models.length > 0 && (
                      <div className="mt-1">
                        模型: {testResults[config.id].models.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 关于 */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">关于</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              AI Image Gen v0.2.0
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
