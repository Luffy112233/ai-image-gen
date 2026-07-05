import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    setIsLoggedIn(false)
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-bold text-white">AI Image Gen</span>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-300 hover:text-white transition">
            首页
          </a>
          <a href="/generate" className="text-sm text-gray-300 hover:text-white transition">
            生成
          </a>
          <a href="/gallery" className="text-sm text-gray-300 hover:text-white transition">
            作品库
          </a>
          <a href="/editor" className="text-sm text-gray-300 hover:text-white transition">
            编辑
          </a>
          {isLoggedIn ? (
            <>
              <a href="/settings" className="text-sm text-gray-300 hover:text-white transition">
                设置
              </a>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300 transition"
              >
                退出
              </button>
            </>
          ) : (
            <a href="/login" className="text-sm text-blue-400 hover:text-blue-300 transition">
              登录
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-gray-950/50 min-h-[calc(100vh-3.5rem)]">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            快速操作
          </h3>
          <div className="space-y-1">
            <a href="/generate" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition">
              <span>🎨</span> 文生图
            </a>
            <a href="/generate?mode=img2img" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition">
              <span>🖼️</span> 图生图
            </a>
            <a href="/gallery" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition">
              <span>📂</span> 作品库
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            设置
          </h3>
          <div className="space-y-1">
            <a href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition">
              <span>⚙️</span> 系统设置
            </a>
          </div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="text-xs text-gray-500">中转站API状态</p>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-400">已连接</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
