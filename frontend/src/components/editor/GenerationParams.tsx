"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

interface GenerationParams {
  prompt: string
  negativePrompt: string
  model: string
  size: string
  numImages: number
  seed: number | null
  guidanceScale: number
  enableAdvanced: boolean
}

export function GenerationParams({
  params,
  onChange,
  onGenerate,
  isGenerating,
}: {
  params: GenerationParams
  onChange: (updates: Partial<GenerationParams>) => void
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="text-white">生成参数</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-gray-300">提示词</Label>
          <Textarea
            value={params.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            placeholder="描述你想要生成的图片，例如：一只可爱的猫咪坐在花园里..."
            className="min-h-[100px] bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <Label className="text-gray-300">反向提示词（可选）</Label>
          <Input
            value={params.negativePrompt}
            onChange={(e) => onChange({ negativePrompt: e.target.value })}
            placeholder="不想要的内容，例如：模糊、低质量..."
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">模型</Label>
            <Select
              value={params.model}
              onChange={(e) => onChange({ model: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            >
              <option value="gpt-image-2">gpt-image-2</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">尺寸</Label>
            <Select
              value={params.size}
              onChange={(e) => onChange({ size: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            >
              <option value="1024x1024">1024×1024</option>
              <option value="512x512">512×512</option>
              <option value="768x768">768×768</option>
              <option value="1024x768">1024×768</option>
              <option value="768x1024">768×1024</option>
            </Select>
          </div>
        </div>

        {/* Number of Images */}
        <div className="space-y-2">
          <Label className="text-gray-300">生成数量: {params.numImages}</Label>
          <Slider
            value={[params.numImages]}
            onValueChange={([v]) => onChange({ numImages: v })}
            min={1}
            max={4}
            step={1}
            className="bg-gray-800"
          />
        </div>

        {/* Advanced Options */}
        {params.enableAdvanced && (
          <div className="space-y-2">
            <Label className="text-gray-300">Seed (可选)</Label>
            <Input
              type="number"
              value={params.seed ?? ""}
              onChange={(e) => onChange({ seed: e.target.value ? Number(e.target.value) : null })}
              placeholder="留空则随机"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        )}

        {/* Toggle Advanced */}
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 text-sm">高级选项</Label>
          <Switch
            checked={params.enableAdvanced}
            onCheckedChange={(v) => onChange({ enableAdvanced: v })}
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={!params.prompt.trim() || isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
          size="lg"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-2">⏳</span> 生成中...
            </>
          ) : (
            "🎨 生成图片"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
