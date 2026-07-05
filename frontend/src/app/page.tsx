"use client"

import Link from "next/link"
import { Layout } from "@/components/layout"

export default function HomePage() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16 py-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            AI 图像生成平台
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            文生图 · 图生图 · 多图参考 · 并行生成 · 图片编辑
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/generate"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition"
            >
              开始生成
            </Link>
            <Link
              href="/editor"
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition border border-gray-700"
            >
              图片编辑
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-white mb-2">多模型支持</h3>
            <p className="text-gray-400 text-sm">
              支持 gpt-image-2 及多种主流AI图像模型，通过中转站API统一接入
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">并行生成</h3>
            <p className="text-gray-400 text-sm">
              同时发起多个生成任务，实时查看进度，大幅提升工作效率
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition">
            <div className="text-3xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold text-white mb-2">图片编辑</h3>
            <p className="text-gray-400 text-sm">
              内置Canvas编辑器，支持裁剪、调色、局部重绘等二次编辑功能
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">1+</div>
            <div className="text-sm text-gray-500">可用模型</div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-800">
            <div className="text-2xl font-bold text-green-400">4</div>
            <div className="text-sm text-gray-500">并行任务</div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-800">
            <div className="text-2xl font-bold text-purple-400">10MB</div>
            <div className="text-sm text-gray-500">最大图片</div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-800">
            <div className="text-2xl font-bold text-yellow-400">∞</div>
            <div className="text-sm text-gray-500">创意无限</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
