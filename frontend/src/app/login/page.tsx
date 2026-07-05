"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      if (isLogin) {
        // Login
        const formData = new FormData()
        formData.append("username", email)
        formData.append("password", password)
        
        const resp = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          body: formData,
        })
        
        if (!resp.ok) {
          throw new Error("登录失败")
        }
        
        const data = await resp.json()
        localStorage.setItem("token", data.access_token)
        router.push("/")
      } else {
        // Register
        const resp = await fetch("http://localhost:8000/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, username }),
        })
        
        if (!resp.ok) {
          throw new Error("注册失败")
        }
        
        // Auto login after register
        const formData = new FormData()
        formData.append("username", email)
        formData.append("password", password)
        
        const loginResp = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          body: formData,
        })
        
        if (loginResp.ok) {
          const data = await loginResp.json()
          localStorage.setItem("token", data.access_token)
          router.push("/")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">AI Image Gen</CardTitle>
          <CardDescription className="text-gray-400">
            {isLogin ? "登录你的账户" : "创建新账户"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="输入邮箱"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "处理中..." : isLogin ? "登录" : "注册"}
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {isLogin ? "没有账户？注册" : "已有账户？登录"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
