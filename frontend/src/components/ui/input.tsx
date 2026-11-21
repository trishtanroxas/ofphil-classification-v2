import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[#D5E2D9] bg-white px-3 py-1 text-xs text-[#10241A] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[#5A7466] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0B6B3A] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
