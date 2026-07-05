import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    value?: number[]
    onValueChange?: (values: number[]) => void
    min?: number
    max?: number
    step?: number
  }
>(({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
  return (
    <div className={cn("relative w-full flex items-center", className)}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => {
          onValueChange?.([Number(e.target.value)])
          props.onChange?.(e)
        }}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        {...props}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }
