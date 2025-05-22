"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import Toolbar from "./toolbar"
import PropertiesPanel from "./properties-panel"
import KeyboardShortcutsDialog from "./keyboard-shortcuts-dialog"
import { Download, Upload, Undo, Redo, Copy, Scissors, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/use-theme"

// Define types for our elements
type ElementType = "selection" | "rectangle" | "circle" | "line" | "arrow" | "text" | "freehand"
type Element = {
  id: string
  type: ElementType
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: { x: number; y: number }[]
  text?: string
  fill: string
  stroke: string
  strokeWidth: number
  isDragging: boolean
  selected?: boolean
  rotation?: number // Add rotation property
}

// Define handle positions
type HandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right"
  | "start"
  | "end"
  | "rotation"

// History type for undo/redo
type History = {
  past: Element[][]
  present: Element[]
  future: Element[][]
}

export default function DrawingApp() {
  // Get theme context
  const { theme, setTheme } = useTheme()

  // Instead of a simple elements state, we'll use a history object
  const [history, setHistory] = useState<History>({
    past: [],
    present: [],
    future: [],
  })

  // For convenience, we'll create a getter for the current elements
  const elements = history.present

  const [selectedElement, setSelectedElement] = useState<Element | null>(null)
  const [tool, setTool] = useState<ElementType>("selection")
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(theme === "dark" ? "#ffffff" : "#000000")
  const [strokeWidth, setStrokeWidth] = useState<number>(2)
  const [fill, setFill] = useState("transparent")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [action, setAction] = useState<"none" | "drawing" | "moving" | "resizing" | "selecting">("none")
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<Element[]>([])

  // Grid settings
  const [showGrid, setShowGrid] = useState(true)
  const [gridSize, setGridSize] = useState<number>(20)
  const [gridColor, setGridColor] = useState(theme === "dark" ? "#333333" : "#cccccc")
  const [gridOpacity, setGridOpacity] = useState<number>(50)

  // Selection box for multi-select
  const [selectionBox, setSelectionBox] = useState<{
    startX: number
    startY: number
    width: number
    height: number
  } | null>(null)

  // Track if we're in multi-select mode
  const [multiSelectMode, setMultiSelectMode] = useState(false)

  // Maximum number of history states to keep
  const MAX_HISTORY_LENGTH = 50

  // Update default colors when theme changes
  useEffect(() => {
    if (theme === "dark") {
      // Only update color if it's the default black
      if (color === "#000000") {
        setColor("#ffffff")
      }
      // Only update grid color if it's the default light mode color
      if (gridColor === "#cccccc") {
        setGridColor("#333333")
      }
    } else {
      // Only update color if it's the default white
      if (color === "#ffffff") {
        setColor("#000000")
      }
      // Only update grid color if it's the default dark mode color
      if (gridColor === "#333333") {
        setGridColor("#cccccc")
      }
    }
  }, [theme, color, gridColor])

  // Set canvas size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight - 100, // Subtract toolbar height
      })
    }

    updateSize()
    window.addEventListener("resize", updateSize)

    return () => window.removeEventListener("resize", updateSize)
  }, [])

  const updateHistory = useCallback((newElements: Element[]) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present].slice(-MAX_HISTORY_LENGTH),
      present: newElements,
      future: [],
    }))
  }, [])

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev
      const newPresent = prev.past[prev.past.length - 1]
      const newPast = prev.past.slice(0, prev.past.length - 1)
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future].slice(0, MAX_HISTORY_LENGTH),
      }
    })
  }, [])

  const handleRedo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev
      const newPresent = prev.future[0]
      const newFuture = prev.future.slice(1)
      return {
        past: [...prev.past, prev.present].slice(-MAX_HISTORY_LENGTH),
        present: newPresent,
        future: newFuture,
      }
    })
  }, [])

  // Draw grid and all elements on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas with theme-appropriate background
    ctx.fillStyle = `hsl(var(--canvas-background))`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply zoom
    ctx.save()
    ctx.scale(zoom, zoom)

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, canvas.width / zoom, canvas.height / zoom, gridSize, gridColor, gridOpacity)
    }

    // Draw selection box if it exists
    if (selectionBox) {
      ctx.save()
      ctx.strokeStyle = `hsl(var(--selection-color))`
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.strokeRect(selectionBox.startX, selectionBox.startY, selectionBox.width, selectionBox.height)
      ctx.fillStyle = `hsl(var(--selection-fill))`
      ctx.fillRect(selectionBox.startX, selectionBox.startY, selectionBox.width, selectionBox.height)
      ctx.restore()
    }

    // Draw all elements
    elements.forEach((element) => {
      ctx.strokeStyle = element.stroke
      ctx.fillStyle = element.fill
      ctx.lineWidth = element.strokeWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // Save context state before applying transformations
      ctx.save()

      // Apply rotation if element has a rotation property
      if (element.rotation) {
        let centerX, centerY

        if (element.type === "rectangle") {
          centerX = element.x + (element.width || 0) / 2
          centerY = element.y + (element.height || 0) / 2
        } else if (element.type === "circle") {
          centerX = element.x
          centerY = element.y
        } else if (element.type === "text") {
          const textWidth = (element.text || "").length * 8
          centerX = element.x + textWidth / 2
          centerY = element.y - 8
        } else if (
          (element.type === "line" || element.type === "arrow") &&
          element.points &&
          element.points.length >= 2
        ) {
          const start = element.points[0]
          const end = element.points[1]
          centerX = (start.x + end.x) / 2
          centerY = (start.y + end.y) / 2
        } else {
          centerX = element.x
          centerY = element.y
        }

        // Translate to center, rotate, translate back
        ctx.translate(centerX, centerY)
        ctx.rotate((element.rotation * Math.PI) / 180)
        ctx.translate(-centerX, -centerY)
      }

      // Draw the actual element
      if (element.type === "rectangle") {
        ctx.beginPath()
        ctx.rect(element.x, element.y, element.width || 0, element.height || 0)
        if (element.fill !== "transparent") {
          ctx.fill()
        }
        ctx.stroke()
      } else if (element.type === "circle") {
        ctx.beginPath()
        ctx.arc(element.x, element.y, element.radius || 0, 0, Math.PI * 2)
        if (element.fill !== "transparent") {
          ctx.fill()
        }
        ctx.stroke()
      } else if (element.type === "line") {
        if (element.points && element.points.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(element.points[0].x, element.points[0].y)

          if (element.type === "freehand" && element.points.length > 2) {
            // For freehand, connect all points
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y)
            }
          } else {
            // For regular line, just connect start and end
            ctx.lineTo(element.points[1].x, element.points[1].y)
          }

          ctx.stroke()
        }
      } else if (element.type === "arrow") {
        if (element.points && element.points.length >= 2) {
          const start = element.points[0]
          const end = element.points[1]

          // Draw the line
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.stroke()

          // Draw the arrow head
          const angle = Math.atan2(end.y - start.y, end.x - start.x)
          const headLength = 15

          ctx.beginPath()
          ctx.moveTo(end.x, end.y)
          ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6),
          )
          ctx.moveTo(end.x, end.y)
          ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6),
          )
          ctx.stroke()
        }
      } else if (element.type === "text") {
        ctx.font = "16px sans-serif"
        ctx.fillStyle = element.fill === "transparent" ? element.stroke : element.fill
        ctx.fillText(element.text || "Double click to edit", element.x, element.y)
      }

      // Restore context state to remove transformations
      ctx.restore()

      // Draw selection indicator and resize handles if element is selected
      if (element.selected) {
        ctx.save()
        ctx.strokeStyle = `hsl(var(--selection-color))`
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])

        // Apply rotation to selection box and handles
        let centerX, centerY

        if (element.type === "rectangle") {
          centerX = element.x + (element.width || 0) / 2
          centerY = element.y + (element.height || 0) / 2
        } else if (element.type === "circle") {
          centerX = element.x
          centerY = element.y
        } else if (element.type === "text") {
          const textWidth = (element.text || "").length * 8
          centerX = element.x + textWidth / 2
          centerY = element.y - 8
        } else if (
          (element.type === "line" || element.type === "arrow") &&
          element.points &&
          element.points.length >= 2
        ) {
          const start = element.points[0]
          const end = element.points[1]
          centerX = (start.x + end.x) / 2
          centerY = (start.y + end.y) / 2
        } else {
          centerX = element.x
          centerY = element.y
        }

        if (element.rotation) {
          ctx.translate(centerX, centerY)
          ctx.rotate((element.rotation * Math.PI) / 180)
          ctx.translate(-centerX, -centerY)
        }

        if (element.type === "rectangle") {
          ctx.strokeRect(element.x - 5, element.y - 5, (element.width || 0) + 10, (element.height || 0) + 10)

          // Draw resize handles for rectangle
          drawRectangleHandles(ctx, element)
        } else if (element.type === "circle") {
          ctx.beginPath()
          ctx.arc(element.x, element.y, (element.radius || 0) + 5, 0, Math.PI * 2)
          ctx.stroke()

          // Draw resize handles for circle
          drawCircleHandles(ctx, element)
        } else if (element.type === "line" || element.type === "arrow") {
          if (element.points && element.points.length >= 2) {
            const start = element.points[0]
            const end = element.points[1]

            ctx.beginPath()
            ctx.moveTo(start.x - 5, start.y - 5)
            ctx.lineTo(end.x + 5, end.y + 5)
            ctx.stroke()

            // Draw resize handles for line/arrow
            drawLineHandles(ctx, element)
          }
        } else if (element.type === "text") {
          // Calculate text dimensions
          const textWidth = (element.text || "").length * 8 // Approximate width
          const textHeight = 16 // Approximate height

          ctx.strokeRect(element.x - 5, element.y - textHeight - 5, textWidth + 10, textHeight + 10)

          // Draw resize handles for text
          drawTextHandles(ctx, element)
        }

        // Draw rotation handle (after other handles)
        drawRotationHandle(ctx, element)

        ctx.restore()
      }
    })

    // Restore zoom
    ctx.restore()
  }, [elements, activeHandle, showGrid, gridSize, gridColor, gridOpacity, selectionBox, zoom, theme])

  // Function to draw the grid
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    size: number,
    color: string,
    opacity: number,
  ) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.globalAlpha = opacity / 100 // Convert percentage to decimal

    // Draw vertical lines
    for (let x = 0; x <= width; x += size) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += size) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    ctx.restore()
  }

  // Draw rectangle resize handles
  const drawRectangleHandles = (ctx: CanvasRenderingContext2D, element: Element) => {
    const handleSize = 8
    const x = element.x
    const y = element.y
    const width = element.width || 0
    const height = element.height || 0

    // Draw handles
    ctx.fillStyle = `hsl(var(--handle-color))`
    ctx.strokeStyle = `hsl(var(--handle-border))`
    ctx.lineWidth = 1
    ctx.setLineDash([])

    // Top-left
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Top-middle
    ctx.beginPath()
    ctx.rect(x + width / 2 - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Top-right
    ctx.beginPath()
    ctx.rect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Middle-left
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Middle-right
    ctx.beginPath()
    ctx.rect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Bottom-left
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Bottom-middle
    ctx.beginPath()
    ctx.rect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Bottom-right
    ctx.beginPath()
    ctx.rect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()
  }

  // Draw circle resize handles
  const drawCircleHandles = (ctx: CanvasRenderingContext2D, element: Element) => {
    const handleSize = 8
    const x = element.x
    const y = element.y
    const radius = element.radius || 0

    ctx.fillStyle = `hsl(var(--handle-color))`
    ctx.strokeStyle = `hsl(var(--handle-border))`
    ctx.lineWidth = 1
    ctx.setLineDash([])

    // Top handle
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y - radius - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Right handle
    ctx.beginPath()
    ctx.rect(x + radius - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Bottom handle
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y + radius - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Left handle
    ctx.beginPath()
    ctx.rect(x - radius - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()
  }

  // Draw line/arrow resize handles
  const drawLineHandles = (ctx: CanvasRenderingContext2D, element: Element) => {
    if (!element.points || element.points.length < 2) return

    const handleSize = 8
    const start = element.points[0]
    const end = element.points[1]

    ctx.fillStyle = `hsl(var(--handle-color))`
    ctx.strokeStyle = `hsl(var(--handle-border))`
    ctx.lineWidth = 1
    ctx.setLineDash([])

    // Start handle
    ctx.beginPath()
    ctx.rect(start.x - handleSize / 2, start.y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // End handle
    ctx.beginPath()
    ctx.rect(end.x - handleSize / 2, end.y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()
  }

  // Draw text resize handles
  const drawTextHandles = (ctx: CanvasRenderingContext2D, element: Element) => {
    const handleSize = 8
    const x = element.x
    const y = element.y
    const textWidth = (element.text || "").length * 8 // Approximate width
    const textHeight = 16 // Approximate height

    ctx.fillStyle = `hsl(var(--handle-color))`
    ctx.strokeStyle = `hsl(var(--handle-border))`
    ctx.lineWidth = 1
    ctx.setLineDash([])

    // Top-left
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y - textHeight - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Top-right
    ctx.beginPath()
    ctx.rect(x + textWidth - handleSize / 2, y - textHeight - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Bottom-left
    ctx.beginPath()
    ctx.rect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()

    // Bottom-right
    ctx.beginPath()
    ctx.rect(x + textWidth - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
    ctx.fill()
    ctx.stroke()
  }

  // Add this function after the drawTextHandles function
  const drawRotationHandle = (ctx: CanvasRenderingContext2D, element: Element) => {
    const handleSize = 8
    let centerX, centerY, handleX, handleY

    if (element.type === "rectangle") {
      centerX = element.x + (element.width || 0) / 2
      centerY = element.y + (element.height || 0) / 2
      handleX = centerX
      handleY = element.y - 30 // Position handle above the element
    } else if (element.type === "circle") {
      centerX = element.x
      centerY = element.y
      handleX = centerX
      handleY = centerY - (element.radius || 0) - 30 // Position handle above the circle
    } else if (element.type === "text") {
      const textWidth = (element.text || "").length * 8 // Approximate width
      centerX = element.x + textWidth / 2
      centerY = element.y - 8 // Adjust for text baseline
      handleX = centerX
      handleY = centerY - 30 // Position handle above the text
    } else if ((element.type === "line" || element.type === "arrow") && element.points && element.points.length >= 2) {
      const start = element.points[0]
      const end = element.points[1]
      centerX = (start.x + end.x) / 2
      centerY = (start.y + end.y) / 2
      handleX = centerX
      handleY = centerY - 30 // Position handle above the line
    } else {
      return // Unsupported element type
    }

    // Draw line from center to handle
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(handleX, handleY)
    ctx.stroke()

    // Draw rotation handle
    ctx.fillStyle = `hsl(var(--handle-color))`
    ctx.strokeStyle = `hsl(var(--handle-border))`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(handleX, handleY, handleSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Check if a point is inside a resize handle
  const getHandleAtPosition = (x: number, y: number, element: Element): HandlePosition | null => {
    const handleSize = 8

    if (element.type === "rectangle") {
      const ex = element.x
      const ey = element.y
      const width = element.width || 0
      const height = element.height || 0

      // Check top-left handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "top-left"
      }

      // Check top handle
      if (
        x >= ex + width / 2 - handleSize / 2 &&
        x <= ex + width / 2 + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "top"
      }

      // Check top-right handle
      if (
        x >= ex + width - handleSize / 2 &&
        x <= ex + width + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "top-right"
      }

      // Check left handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey + height / 2 - handleSize / 2 &&
        y <= ey + height / 2 + handleSize / 2
      ) {
        return "left"
      }

      // Check right handle
      if (
        x >= ex + width - handleSize / 2 &&
        x <= ex + width + handleSize / 2 &&
        y >= ey + height / 2 - handleSize / 2 &&
        y <= ey + height / 2 + handleSize / 2
      ) {
        return "right"
      }

      // Check bottom-left handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey + height - handleSize / 2 &&
        y <= ey + height + handleSize / 2
      ) {
        return "bottom-left"
      }

      // Check bottom handle
      if (
        x >= ex + width / 2 - handleSize / 2 &&
        x <= ex + width / 2 + handleSize / 2 &&
        y >= ey + height - handleSize / 2 &&
        y <= ey + height + handleSize / 2
      ) {
        return "bottom"
      }

      // Check bottom-right handle
      if (
        x >= ex + width - handleSize / 2 &&
        x <= ex + width + handleSize / 2 &&
        y >= ey + height - handleSize / 2 &&
        y <= ey + height + handleSize / 2
      ) {
        return "bottom-right"
      }

      // Check rotation handle
      const centerX = ex + width / 2
      const handleX = centerX
      const handleY = ey - 30

      if (
        x >= handleX - handleSize / 2 &&
        x <= handleX + handleSize / 2 &&
        y >= handleY - handleSize / 2 &&
        y <= handleY + handleSize / 2
      ) {
        return "rotation"
      }
    } else if (element.type === "circle") {
      const ex = element.x
      const ey = element.y
      const radius = element.radius || 0

      // Check top handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey - radius - handleSize / 2 &&
        y <= ey - radius + handleSize / 2
      ) {
        return "top"
      }

      // Check right handle
      if (
        x >= ex + radius - handleSize / 2 &&
        x <= ex + radius + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "right"
      }

      // Check bottom handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey + radius - handleSize / 2 &&
        y <= ey + radius + handleSize / 2
      ) {
        return "bottom"
      }

      // Check left handle
      if (
        x >= ex - radius - handleSize / 2 &&
        x <= ex - radius + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "left"
      }

      // Check rotation handle
      const handleX = ex
      const handleY = ey - radius - 30

      if (
        x >= handleX - handleSize / 2 &&
        x <= handleX + handleSize / 2 &&
        y >= handleY - handleSize / 2 &&
        y <= handleY + handleSize / 2
      ) {
        return "rotation"
      }
    } else if (element.type === "line" || element.type === "arrow") {
      if (!element.points || element.points.length < 2) return null

      const start = element.points[0]
      const end = element.points[1]

      // Check start handle
      if (
        x >= start.x - handleSize / 2 &&
        x <= start.x + handleSize / 2 &&
        y >= start.y - handleSize / 2 &&
        y <= start.y + handleSize / 2
      ) {
        return "start"
      }

      // Check end handle
      if (
        x >= end.x - handleSize / 2 &&
        x <= end.x + handleSize / 2 &&
        y >= end.y - handleSize / 2 &&
        y <= end.y + handleSize / 2
      ) {
        return "end"
      }
    } else if (element.type === "text") {
      const ex = element.x
      const ey = element.y
      const textWidth = (element.text || "").length * 8 // Approximate width
      const textHeight = 16 // Approximate height

      // Check top-left handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey - textHeight - handleSize / 2 &&
        y <= ey - textHeight + handleSize / 2
      ) {
        return "top-left"
      }

      // Check top-right handle
      if (
        x >= ex + textWidth - handleSize / 2 &&
        x <= ex + textWidth + handleSize / 2 &&
        y >= ey - textHeight - handleSize / 2 &&
        y <= ey - textHeight + handleSize / 2
      ) {
        return "top-right"
      }

      // Check bottom-left handle
      if (
        x >= ex - handleSize / 2 &&
        x <= ex + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "bottom-left"
      }

      // Check bottom-right handle
      if (
        x >= ex + textWidth - handleSize / 2 &&
        x <= ex + textWidth + handleSize / 2 &&
        y >= ey - handleSize / 2 &&
        y <= ey + handleSize / 2
      ) {
        return "bottom-right"
      }

      // Check rotation handle
      const centerX = ex + textWidth / 2
      const handleY = ey - textHeight - 30

      if (
        x >= centerX - handleSize / 2 &&
        x <= centerX + handleSize / 2 &&
        y >= handleY - handleSize / 2 &&
        y <= handleY + handleSize / 2
      ) {
        return "rotation"
      }
    }

    return null
  }

  // Check if element is inside the selection box
  const isElementInSelectionBox = (
    element: Element,
    selectionBox: {
      startX: number
      startY: number
      width: number
      height: number
    },
  ): boolean => {
    // Calculate the bounds of the selection box
    const selectionLeft = selectionBox.width >= 0 ? selectionBox.startX : selectionBox.startX + selectionBox.width
    const selectionRight = selectionBox.width >= 0 ? selectionBox.startX + selectionBox.width : selectionBox.startX
    const selectionTop = selectionBox.height >= 0 ? selectionBox.startY : selectionBox.startY + selectionBox.height
    const selectionBottom = selectionBox.height >= 0 ? selectionBox.startY + selectionBox.height : selectionBox.startY

    if (element.type === "rectangle") {
      // Check if rectangle is inside selection box
      return (
        element.x >= selectionLeft &&
        element.x + (element.width || 0) <= selectionRight &&
        element.y >= selectionTop &&
        element.y + (element.height || 0) <= selectionBottom
      )
    } else if (element.type === "circle") {
      // Check if circle is inside selection box
      return (
        element.x - (element.radius || 0) >= selectionLeft &&
        element.x + (element.radius || 0) <= selectionRight &&
        element.y - (element.radius || 0) >= selectionTop &&
        element.y + (element.radius || 0) <= selectionBottom
      )
    } else if (element.type === "text") {
      // Check if text is inside selection box
      const textWidth = (element.text || "").length * 8
      const textHeight = 16
      return (
        element.x >= selectionLeft &&
        element.x + textWidth <= selectionRight &&
        element.y - textHeight >= selectionTop &&
        element.y <= selectionBottom
      )
    } else if ((element.type === "line" || element.type === "arrow") && element.points && element.points.length >= 2) {
      // Check if both endpoints of line/arrow are inside selection box
      const start = element.points[0]
      const end = element.points[1]
      return (
        start.x >= selectionLeft &&
        start.x <= selectionRight &&
        start.y >= selectionTop &&
        start.y <= selectionBottom &&
        end.x >= selectionLeft &&
        end.x <= selectionRight &&
        end.y >= selectionTop &&
        end.y <= selectionBottom
      )
    }
    return false
  }

  // Add keyboard shortcuts for undo/redo and selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in a text field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Tool selection shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            setTool("selection")
            e.preventDefault()
            break
          case "r":
            setTool("rectangle")
            e.preventDefault()
            break
          case "c":
            setTool("circle")
            e.preventDefault()
            break
          case "l":
            setTool("line")
            e.preventDefault()
            break
          case "a":
            setTool("arrow")
            e.preventDefault()
            break
          case "t":
            setTool("text")
            e.preventDefault()
            break
          case "p":
            setTool("freehand")
            e.preventDefault()
            break
          case "g":
            setShowGrid(!showGrid)
            e.preventDefault()
            break
          case "d":
            setTheme(theme === "dark" ? "light" : "dark")
            e.preventDefault()
            break
          case "?":
            setShowShortcutsDialog(true)
            e.preventDefault()
            break
          case "escape":
            // Deselect all elements
            if (elements.some((el) => el.selected)) {
              const updatedElements = elements.map((el) => ({
                ...el,
                selected: false,
              }))
              updateHistory(updatedElements)
              setSelectedElement(null)
            }
            e.preventDefault()
            break
        }
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault()
        handleRedo()
      }

      // Select all: Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault()
        const updatedElements = elements.map((el) => ({
          ...el,
          selected: true,
        }))
        updateHistory(updatedElements)

        // Set the first element as the primary selected element if nothing is selected
        if (!selectedElement && updatedElements.length > 0) {
          setSelectedElement(updatedElements[0])
        }
      }

      // Copy: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault()
        const selectedElements = elements.filter((el) => el.selected)
        if (selectedElements.length > 0) {
          // Create deep copies of the selected elements
          const copiedElements = selectedElements.map((el) => ({
            ...JSON.parse(JSON.stringify(el)),
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new IDs
          }))
          setClipboard(copiedElements)
        }
      }

      // Cut: Ctrl+X
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault()
        const selectedElements = elements.filter((el) => el.selected)
        if (selectedElements.length > 0) {
          // Create deep copies of the selected elements
          const copiedElements = selectedElements.map((el) => ({
            ...JSON.parse(JSON.stringify(el)),
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new IDs
          }))
          setClipboard(copiedElements)

          // Remove the selected elements
          const updatedElements = elements.filter((el) => !el.selected)
          updateHistory(updatedElements)
          setSelectedElement(null)
        }
      }

      // Paste: Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault()
        if (clipboard.length > 0) {
          // Deselect all current elements
          const deselectedElements = elements.map((el) => ({
            ...el,
            selected: false,
          }))

          // Create copies of clipboard elements with new IDs and offset positions
          const pastedElements = clipboard.map((el) => {
            const newElement = {
              ...JSON.parse(JSON.stringify(el)),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              selected: true,
              x: el.x + 20, // Offset to make it clear it's a new element
              y: el.y + 20,
            }

            // Adjust points for line and arrow
            if ((el.type === "line" || el.type === "arrow") && el.points) {
              newElement.points = el.points.map((point) => ({
                x: point.x + 20,
                y: point.y + 20,
              }))
            }

            return newElement
          })

          // Add the pasted elements to the canvas
          updateHistory([...deselectedElements, ...pastedElements])

          // Set the first pasted element as the selected element
          if (pastedElements.length > 0) {
            setSelectedElement(pastedElements[0])
          }
        }
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault()
        const selectedElements = elements.filter((el) => el.selected)
        if (selectedElements.length > 0) {
          // Deselect all current elements
          const deselectedElements = elements.map((el) => ({
            ...el,
            selected: false,
          }))

          // Create duplicates with new IDs and offset positions
          const duplicatedElements = selectedElements.map((el) => {
            const newElement = {
              ...JSON.parse(JSON.stringify(el)),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              selected: true,
              x: el.x + 20,
              y: el.y + 20,
            }

            // Adjust points for line and arrow
            if ((el.type === "line" || el.type === "arrow") && el.points) {
              newElement.points = el.points.map((point) => ({
                x: point.x + 20,
                y: point.y + 20,
              }))
            }

            return newElement
          })

          // Add the duplicated elements to the canvas
          updateHistory([...deselectedElements, ...duplicatedElements])

          // Set the first duplicated element as the selected element
          if (duplicatedElements.length > 0) {
            setSelectedElement(duplicatedElements[0])
          }
        }
      }

      // Delete selected elements: Delete key
      if (e.key === "Delete" || e.key === "Backspace") {
        if (elements.some((el) => el.selected)) {
          handleDeleteSelectedElements()
        }
      }

      // Zoom controls
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault()
        setZoom(1) // Reset zoom
      } else if ((e.ctrlKey || e.metaKey) && e.key === "=") {
        e.preventDefault()
        setZoom((prev) => Math.min(prev + 0.1, 3)) // Zoom in (max 3x)
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault()
        setZoom((prev) => Math.max(prev - 0.1, 0.5)) // Zoom out (min 0.5x)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    history,
    elements,
    selectedElement,
    handleUndo,
    handleRedo,
    updateHistory,
    clipboard,
    showGrid,
    zoom,
    theme,
    setTheme,
  ])

  const handleDeleteSelectedElements = () => {
    const updatedElements = elements.filter((el) => !el.selected)
    updateHistory(updatedElements)
    setSelectedElement(null)
  }

  const clearSelection = () => {
    const updatedElements = elements.map((el) => ({
      ...el,
      selected: false,
    }))
    updateHistory(updatedElements)
    setSelectedElement(null)
  }

  const getMouseCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMouseCoordinates(e)

    // Check if Shift key is pressed for multi-select
    const isShiftPressed = e.shiftKey
    setMultiSelectMode(isShiftPressed)

    // Check if Alt key is pressed for duplication
    const isAltPressed = e.altKey

    // First, check if we're clicking on a resize handle of the selected element
    if (selectedElement) {
      const handle = getHandleAtPosition(x, y, selectedElement)

      if (handle) {
        setAction("resizing")
        setActiveHandle(handle)
        setStartPoint({ x, y })
        return
      }
    }

    // Check if clicking on an existing element
    const clickedElement = elements.find((element) => isPointInElement(x, y, element))

    if (clickedElement) {
      // If Alt is pressed, duplicate the element before moving
      if (isAltPressed) {
        const duplicatedElement = {
          ...JSON.parse(JSON.stringify(clickedElement)),
          id: Date.now().toString(),
          selected: true,
        }

        // Deselect all other elements if Shift is not pressed
        const updatedElements = elements.map((el) => ({
          ...el,
          selected: isShiftPressed ? el.selected : el.id === clickedElement.id,
        }))

        updateHistory([...updatedElements, duplicatedElement])
        setSelectedElement(duplicatedElement)
        setAction("moving")
        setStartPoint({ x, y })
        return
      }

      // Check if we should deselect other elements or keep them selected
      if (!isShiftPressed && !clickedElement.selected) {
        // Regular click (without Shift) - deselect others
        const updatedElements = elements.map((el) => ({
          ...el,
          selected: el.id === clickedElement.id,
        }))

        updateHistory(updatedElements)
        setSelectedElement(clickedElement)
      } else {
        // Shift-click or clicking already selected element
        const updatedElements = elements.map((el) => {
          if (el.id === clickedElement.id) {
            // Toggle selection if shift-clicking an already selected element
            return {
              ...el,
              selected: isShiftPressed ? !el.selected : true,
            }
          }
          return {
            ...el,
            // Keep selection state for other elements if shift is pressed
            selected: isShiftPressed ? el.selected : false,
          }
        })

        updateHistory(updatedElements)

        // Set the clicked element as the primary selected element
        if (!clickedElement.selected || !isShiftPressed) {
          setSelectedElement(clickedElement)
        }
      }

      setAction("moving")
      setStartPoint({ x, y })
      return
    }

    // If clicking on empty space and not holding Shift, clear selection
    if (!isShiftPressed) {
      const hasSelectedElements = elements.some((el) => el.selected)
      if (hasSelectedElements) {
        const updatedElements = elements.map((el) => ({
          ...el,
          selected: false,
        }))
        updateHistory(updatedElements)
        setSelectedElement(null)
      }
    }

    // Start drawing or selection box
    if (tool === "selection" || isShiftPressed) {
      // Start a selection box
      setAction("selecting")
      setSelectionBox({
        startX: x,
        startY: y,
        width: 0,
        height: 0,
      })
    } else {
      // Start drawing a shape
      setAction("drawing")
      setStartPoint({ x, y })

      if (tool === "freehand") {
        const newElement: Element = {
          id: Date.now().toString(),
          type: "line",
          x: 0,
          y: 0,
          points: [{ x, y }],
          stroke: color,
          strokeWidth,
          fill,
          isDragging: false,
          rotation: 0,
        }
        updateHistory([...elements, newElement])
      } else if (tool === "text") {
        const newElement: Element = {
          id: Date.now().toString(),
          type: "text",
          x,
          y,
          text: "Double-click to edit",
          fill: color,
          stroke: "transparent",
          strokeWidth: 0,
          isDragging: false,
          selected: true,
          rotation: 0,
        }

        // Deselect all other elements
        const updatedElements = elements.map((el) => ({
          ...el,
          selected: false,
        }))

        updateHistory([...updatedElements, newElement])
        setSelectedElement(newElement)

        // Immediately open the text editor
        setTimeout(() => {
          const canvas = canvasRef.current
          if (canvas) {
            const event = new MouseEvent("dblclick", {
              bubbles: true,
              cancelable: true,
              clientX: x * zoom + canvas.getBoundingClientRect().left,
              clientY: y * zoom + canvas.getBoundingClientRect().top,
            })
            canvas.dispatchEvent(event)
          }
        }, 50)
      } else {
        const newElement: Element = {
          id: Date.now().toString(),
          type: tool,
          x,
          y,
          width: 0,
          height: 0,
          fill,
          stroke: color,
          strokeWidth,
          isDragging: false,
          rotation: 0,
        }

        if (tool === "circle") {
          newElement.radius = 0
        } else if (tool === "line" || tool === "arrow") {
          newElement.points = [
            { x, y },
            { x, y },
          ]
        }

        updateHistory([...elements, newElement])
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (action === "none" || !startPoint) return

    const { x, y } = getMouseCoordinates(e)

    if (action === "selecting") {
      // Update selection box
      if (selectionBox) {
        setSelectionBox({
          ...selectionBox,
          width: x - selectionBox.startX,
          height: y - selectionBox.startY,
        })
      }
    } else if (action === "drawing") {
      const lastElement = elements[elements.length - 1]

      if (!lastElement) return

      if (tool === "freehand" && lastElement.points) {
        // Add point to freehand drawing
        const updatedElements = elements.map((el, index) => {
          if (index === elements.length - 1) {
            return {
              ...el,
              points: [...(el.points || []), { x, y }],
            }
          }
          return el
        })

        // For freehand drawing, we don't want to create a history entry for every point
        // Instead, we'll just update the current state
        setHistory((prev) => ({
          ...prev,
          present: updatedElements,
        }))
      } else if (tool === "rectangle") {
        const updatedElements = elements.map((el, index) => {
          if (index === elements.length - 1) {
            // If Shift is pressed, make a perfect square
            if (e.shiftKey) {
              const width = x - el.x
              const height = y - el.y
              const size = Math.max(Math.abs(width), Math.abs(height))
              return {
                ...el,
                width: width >= 0 ? size : -size,
                height: height >= 0 ? size : -size,
              }
            } else {
              return {
                ...el,
                width: x - el.x,
                height: y - el.y,
              }
            }
          }
          return el
        })

        // For shape drawing, we don't want to create a history entry for every size change
        // Instead, we'll just update the current state
        setHistory((prev) => ({
          ...prev,
          present: updatedElements,
        }))
      } else if (tool === "circle") {
        const updatedElements = elements.map((el, index) => {
          if (index === elements.length - 1) {
            const dx = x - el.x
            const dy = y - el.y
            const radius = Math.sqrt(dx * dx + dy * dy)
            return {
              ...el,
              radius,
            }
          }
          return el
        })

        setHistory((prev) => ({
          ...prev,
          present: updatedElements,
        }))
      } else if ((tool === "line" || tool === "arrow") && lastElement.points) {
        const updatedElements = elements.map((el, index) => {
          if (index === elements.length - 1) {
            // If Shift is pressed, constrain to horizontal, vertical, or 45-degree angles
            if (e.shiftKey) {
              const start = el.points?.[0] || { x: 0, y: 0 }
              const dx = x - start.x
              const dy = y - start.y
              const angle = Math.atan2(dy, dx)
              const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
              const distance = Math.sqrt(dx * dx + dy * dy)
              const snapX = start.x + distance * Math.cos(snapAngle)
              const snapY = start.y + distance * Math.sin(snapAngle)

              return {
                ...el,
                points: [start, { x: snapX, y: snapY }],
              }
            } else {
              return {
                ...el,
                points: [el.points?.[0] || { x: 0, y: 0 }, { x, y }],
              }
            }
          }
          return el
        })

        setHistory((prev) => ({
          ...prev,
          present: updatedElements,
        }))
      }
    } else if (action === "moving") {
      // Move all selected elements
      const dx = x - startPoint.x
      const dy = y - startPoint.y

      // If Shift is pressed, constrain movement to horizontal or vertical
      const constrainedDx = e.shiftKey ? (Math.abs(dx) > Math.abs(dy) ? dx : 0) : dx
      const constrainedDy = e.shiftKey ? (Math.abs(dy) > Math.abs(dx) ? dy : 0) : dy

      const updatedElements = elements.map((el) => {
        if (el.selected) {
          if (el.type === "rectangle" || el.type === "text") {
            return {
              ...el,
              x: el.x + constrainedDx,
              y: el.y + constrainedDy,
            }
          } else if (el.type === "circle") {
            return {
              ...el,
              x: el.x + constrainedDx,
              y: el.y + constrainedDy,
            }
          } else if ((el.type === "line" || el.type === "arrow") && el.points) {
            return {
              ...el,
              points: el.points.map((point) => ({
                x: point.x + constrainedDx,
                y: point.y + constrainedDy,
              })),
            }
          }
        }
        return el
      })

      // For moving, we don't want to create a history entry for every position change
      // Instead, we'll just update the current state
      setHistory((prev) => ({
        ...prev,
        present: updatedElements,
      }))

      // Update the selected element if it's being moved
      if (selectedElement && selectedElement.selected) {
        const updatedSelectedElement = updatedElements.find((el) => el.id === selectedElement.id)
        if (updatedSelectedElement) {
          setSelectedElement(updatedSelectedElement)
        }
      }

      setStartPoint({ x, y })
    } else if (action === "resizing" && selectedElement && activeHandle) {
      // Existing resize code for single elements...

      if (activeHandle === "rotation") {
        const updatedElements = elements.map((el) => {
          if (el.id === selectedElement.id) {
            let centerX, centerY

            if (el.type === "rectangle") {
              centerX = el.x + (el.width || 0) / 2
              centerY = el.y + (el.height || 0) / 2
            } else if (el.type === "circle") {
              centerX = el.x
              centerY = el.y
            } else if (el.type === "text") {
              const textWidth = (el.text || "").length * 8
              centerX = el.x + textWidth / 2
              centerY = el.y - 8
            } else if ((el.type === "line" || el.type === "arrow") && el.points && el.points.length >= 2) {
              const start = el.points[0]
              const end = el.points[1]
              centerX = (start.x + end.x) / 2
              centerY = (start.y + end.y) / 2
            } else {
              centerX = el.x
              centerY = el.y
            }

            // Calculate angle based on mouse position relative to center
            const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
            // Add 90 degrees to make 0 degrees point up instead of right
            let rotation = angle + 90

            // Optional: snap rotation to 15-degree increments when holding Shift
            if (e.shiftKey) {
              rotation = Math.round(rotation / 15) * 15
            }

            return {
              ...el,
              rotation,
            }
          }
          return el
        })

        // Update the current state without creating a history entry yet
        setHistory((prev) => ({
          ...prev,
          present: updatedElements,
        }))

        // Update selected element
        const updatedElement = updatedElements.find((el) => el.id === selectedElement.id)
        if (updatedElement) {
          setSelectedElement(updatedElement)
        }
      } else {
        // Rest of your existing resize handle code...
        const updatedElements = elements.map((el) => {
          if (el.id === selectedElement.id) {
            if (el.type === "rectangle") {
              let newX = el.x
              let newY = el.y
              let newWidth = el.width || 0
              let newHeight = el.height || 0

              switch (activeHandle) {
                case "top-left":
                  newX = x
                  newY = y
                  newWidth = el.x + (el.width || 0) - x
                  newHeight = el.y + (el.height || 0) - y
                  break
                case "top":
                  newY = y
                  newHeight = el.y + (el.height || 0) - y
                  break
                case "top-right":
                  newY = y
                  newWidth = x - el.x
                  newHeight = el.y + (el.height || 0) - y
                  break
                case "left":
                  newX = x
                  newWidth = el.x + (el.width || 0) - x
                  break
                case "right":
                  newWidth = x - el.x
                  break
                case "bottom-left":
                  newX = x
                  newWidth = el.x + (el.width || 0) - x
                  newHeight = y - el.y
                  break
                case "bottom":
                  newHeight = y - el.y
                  break
                case "bottom-right":
                  newWidth = x - el.x
                  newHeight = y - el.y
                  break
              }

              // If Shift is pressed, maintain aspect ratio
              if (e.shiftKey && newWidth !== 0 && newHeight !== 0) {
                const aspectRatio = (el.width || 1) / (el.height || 1)

                if (activeHandle.includes("top") || activeHandle.includes("bottom")) {
                  newWidth = newHeight * aspectRatio
                } else {
                  newHeight = newWidth / aspectRatio
                }
              }

              // Ensure width and height are not negative
              if (newWidth < 0) {
                newX = newX + newWidth
                newWidth = Math.abs(newWidth)
              }

              if (newHeight < 0) {
                newY = newY + newHeight
                newHeight = Math.abs(newHeight)
              }

              return {
                ...el,
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
              }
            } else if (el.type === "circle") {
              let newRadius = el.radius || 0

              switch (activeHandle) {
                case "top":
                  newRadius = Math.abs(y - el.y)
                  break
                case "right":
                  newRadius = Math.abs(x - el.x)
                  break
                case "bottom":
                  newRadius = Math.abs(y - el.y)
                  break
                case "left":
                  newRadius = Math.abs(x - el.x)
                  break
              }

              return {
                ...el,
                radius: newRadius,
              }
            } else if ((el.type === "line" || el.type === "arrow") && el.points) {
              const points = [...el.points]

              if (activeHandle === "start" && points.length > 0) {
                // If Shift is pressed, constrain to horizontal, vertical, or 45-degree angles
                if (e.shiftKey && points.length > 1) {
                  const end = points[1]
                  const dx = end.x - x
                  const dy = end.y - y
                  const angle = Math.atan2(dy, dx)
                  const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                  const distance = Math.sqrt(dx * dx + dy * dy)
                  const snapX = end.x - distance * Math.cos(snapAngle)
                  const snapY = end.y - distance * Math.sin(snapAngle)

                  points[0] = { x: snapX, y: snapY }
                } else {
                  points[0] = { x, y }
                }
              } else if (activeHandle === "end" && points.length > 1) {
                // If Shift is pressed, constrain to horizontal, vertical, or 45-degree angles
                if (e.shiftKey) {
                  const start = points[0]
                  const dx = x - start.x
                  const dy = y - start.y
                  const angle = Math.atan2(dy, dx)
                  const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
                  const distance = Math.sqrt(dx * dx + dy * dy)
                  const snapX = start.x + distance * Math.cos(snapAngle)
                  const snapY = start.y + distance * Math.sin(snapAngle)

                  points[1] = { x: snapX, y: snapY }
                } else {
                  points[1] = { x, y }
                }
              }

              return {
                ...el,
                points,
              }
            } else if (el.type === "text") {
              // For text, we don't resize the text itself, but we can move it
              // This is a simplified implementation
              let newX = el.x
              let newY = el.y

              if (activeHandle === "top-left" || activeHandle === "bottom-left") {
                newX = x
              }

              if (activeHandle === "top-left" || activeHandle === "top-right") {
                newY = y + 16 // Adjust for text baseline
              }

              return {
                ...el,
                x: newX,
                y: newY,
              }
            }
          }
          return el
        })

        // Update the current state without creating a history entry yet
        setHistory((prev) => ({
          ...prev,
          present: updatedElements,
        }))

        // Update selected element
        const updatedElement = updatedElements.find((el) => el.id === selectedElement.id)
        if (updatedElement) {
          setSelectedElement(updatedElement)
        }
      }
    }
  }

  const handleMouseUp = () => {
    // When mouse up after drawing, moving, or resizing, we want to create a history entry
    if (action === "drawing" || action === "moving" || action === "resizing") {
      // We don't need to call updateHistory here because we've been updating the present state
      // during the action. We just need to add the present state to the past.
      setHistory((prev) => ({
        past: [...prev.past, prev.present].slice(-MAX_HISTORY_LENGTH),
        present: prev.present,
        future: [],
      }))
    } else if (action === "selecting" && selectionBox) {
      // Calculate selection box boundaries (account for negative width/height)
      const selectionLeft = selectionBox.width >= 0 ? selectionBox.startX : selectionBox.startX + selectionBox.width
      const selectionRight = selectionBox.width >= 0 ? selectionBox.startX + selectionBox.width : selectionBox.startX
      const selectionTop = selectionBox.height >= 0 ? selectionBox.startY : selectionBox.startY + selectionBox.height
      const selectionBottom = selectionBox.height >= 0 ? selectionBox.startY + selectionBox.height : selectionBox.startY

      // Check if selection box is too small (just a click)
      const isSelectionTooSmall = Math.abs(selectionBox.width) < 5 && Math.abs(selectionBox.height) < 5

      if (!isSelectionTooSmall) {
        // Update elements inside the selection box
        const updatedElements = elements.map((el) => {
          // Check if element is inside the selection box
          const isInside = isElementInSelectionBox(el, selectionBox)

          // If in multi-select mode (Shift), toggle selection state
          // Otherwise, set selection based on whether it's inside the box
          if (multiSelectMode) {
            return {
              ...el,
              selected: isInside ? !el.selected : el.selected,
            }
          } else {
            return {
              ...el,
              selected: isInside,
            }
          }
        })

        // Update history with new selection
        updateHistory(updatedElements)

        // Set the first selected element as the primary selected element
        const firstSelected = updatedElements.find((el) => el.selected)
        setSelectedElement(firstSelected || null)
      }

      // Clear selection box
      setSelectionBox(null)
    }

    setAction("none")
    setStartPoint(null)
    setActiveHandle(null)
  }

  const isPointInElement = (x: number, y: number, element: Element): boolean => {
    if (element.type === "rectangle") {
      return (
        x >= element.x &&
        x <= element.x + (element.width || 0) &&
        y >= element.y &&
        y <= element.y + (element.height || 0)
      )
    } else if (element.type === "circle") {
      const dx = x - element.x
      const dy = y - element.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= (element.radius || 0)
    } else if (element.type === "line" || element.type === "arrow") {
      if (!element.points || element.points.length < 2) return false

      const start = element.points[0]
      const end = element.points[1]

      // Check if point is near the line
      const lineLength = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))

      // Distance from point to line
      const distance =
        Math.abs((end.y - start.y) * x - (end.x - start.x) * y + end.x * start.y - end.y * start.x) / lineLength

      return distance < 10 // 10px threshold
    } else if (element.type === "text") {
      // Simple bounding box for text
      const textWidth = (element.text || "").length * 8 // Approximate width
      const textHeight = 16 // Approximate height

      return x >= element.x && x <= element.x + textWidth && y >= element.y - textHeight && y <= element.y
    }

    return false
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMouseCoordinates(e)

    // Find if we double-clicked on a text element
    const textElement = elements.find((element) => element.type === "text" && isPointInElement(x, y, element))

    if (!textElement) return

    // Create a textarea for editing
    const textarea = document.createElement("textarea")
    document.body.appendChild(textarea)

    // Position the textarea over the text element
    textarea.value = textElement.text || "" // Ensure we always have a string value
    textarea.style.position = "absolute"
    textarea.style.left = `${textElement.x * zoom}px`
    textarea.style.top = `${(textElement.y - 16) * zoom}px` // Adjust for text baseline
    textarea.style.fontFamily = "sans-serif"
    textarea.style.fontSize = `${16 * zoom}px`
    textarea.style.padding = "0"
    textarea.style.margin = "0"
    textarea.style.overflow = "hidden"
    textarea.style.background = "transparent"
    textarea.style.border = "1px solid hsl(var(--primary))"
    textarea.style.outline = "none"
    textarea.style.resize = "none"
    textarea.style.minWidth = "100px"
    textarea.style.minHeight = "20px"
    textarea.style.color = theme === "dark" ? "white" : "black"

    // Focus the textarea
    textarea.focus()

    // Flag to track if the text has been saved
    let isTextSaved = false

    // Handle saving the text when done editing
    const saveText = () => {
      // Prevent multiple saves
      if (isTextSaved) return
      isTextSaved = true

      const newText = textarea.value || "" // Ensure we always have a string value

      // Remove the textarea only if it's still in the document
      if (textarea.parentNode) {
        document.body.removeChild(textarea)
      }

      // Update the element with the new text
      const updatedElements = elements.map((el) => {
        if (el.id === textElement.id) {
          return {
            ...el,
            text: newText,
          }
        }
        return el
      })

      // Add to history when text is edited
      updateHistory(updatedElements)

      // Update selected element if it's the one being edited
      if (selectedElement && selectedElement.id === textElement.id) {
        setSelectedElement({
          ...selectedElement,
          text: newText,
        })
      }
    }

    // Save on blur
    textarea.addEventListener("blur", saveText, { once: true })

    // Save on Enter key (without shift)
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        saveText()
        // Remove focus to prevent blur event from firing after we've already saved
        textarea.blur()
      }
    })
  }

  const handleDeleteElement = () => {
    if (!selectedElement) return

    const updatedElements = elements.filter((el) => el.id !== selectedElement.id)
    updateHistory(updatedElements)
    setSelectedElement(null)
  }

  const updateElementProperty = (property: string, value: any) => {
    if (!elements.some((el) => el.selected)) return

    // Ensure value is never undefined
    if (value === undefined) {
      if (typeof value === "string") {
        value = ""
      } else if (typeof value === "number") {
        value = 0
      }
    }

    const updatedElements = elements.map((el) => {
      if (el.selected) {
        return {
          ...el,
          [property]: value,
        }
      }
      return el
    })

    updateHistory(updatedElements)

    // Update the selected element if it exists
    if (selectedElement) {
      setSelectedElement({ ...selectedElement, [property]: value })
    }
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = "drawing.png"
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSave = () => {
    const data = JSON.stringify(elements)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.download = "drawing.json"
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedElements = JSON.parse(event.target?.result as string)
        updateHistory(importedElements)
      } catch (error) {
        console.error("Failed to import file:", error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-background border-b border-border p-2 flex justify-between items-center">
        <h1 className="text-xl font-bold">Excalidraw Clone</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleUndo} disabled={history.past.length === 0}>
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRedo} disabled={history.future.length === 0}>
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const selectedElements = elements.filter((el) => el.selected)
                    if (selectedElements.length > 0) {
                      const copiedElements = selectedElements.map((el) => ({
                        ...JSON.parse(JSON.stringify(el)),
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                      }))
                      setClipboard(copiedElements)
                    }
                  }}
                  disabled={!elements.some((el) => el.selected)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy (Ctrl+C)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const selectedElements = elements.filter((el) => el.selected)
                    if (selectedElements.length > 0) {
                      const copiedElements = selectedElements.map((el) => ({
                        ...JSON.parse(JSON.stringify(el)),
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                      }))
                      setClipboard(copiedElements)
                      const updatedElements = elements.filter((el) => !el.selected)
                      updateHistory(updatedElements)
                      setSelectedElement(null)
                    }
                  }}
                  disabled={!elements.some((el) => el.selected)}
                >
                  <Scissors className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cut (Ctrl+X)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (clipboard.length > 0) {
                      const deselectedElements = elements.map((el) => ({
                        ...el,
                        selected: false,
                      }))
                      const pastedElements = clipboard.map((el) => {
                        const newElement = {
                          ...JSON.parse(JSON.stringify(el)),
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                          selected: true,
                          x: el.x + 20,
                          y: el.y + 20,
                        }
                        if ((el.type === "line" || el.type === "arrow") && el.points) {
                          newElement.points = el.points.map((point) => ({
                            x: point.x + 20,
                            y: point.y + 20,
                          }))
                        }
                        return newElement
                      })
                      updateHistory([...deselectedElements, ...pastedElements])
                      if (pastedElements.length > 0) {
                        setSelectedElement(pastedElements[0])
                      }
                    }
                  }}
                  disabled={clipboard.length === 0}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Paste (Ctrl+V)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Download className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button variant="outline" size="sm" className="relative">
            <Upload className="h-4 w-4 mr-1" /> Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          fill={fill}
          setFill={setFill}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          gridSize={gridSize}
          setGridSize={setGridSize}
          gridColor={gridColor}
          setGridColor={setGridColor}
          gridOpacity={gridOpacity}
          setGridOpacity={setGridOpacity}
          onShowKeyboardShortcuts={() => setShowShortcutsDialog(true)}
        />

        <div className="flex-1 relative bg-canvas-background">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            className="block"
            style={{ cursor: activeHandle ? "nwse-resize" : "default" }}
          />
        </div>

        {elements.some((el) => el.selected) && (
          <PropertiesPanel
            element={selectedElement}
            selectedElements={elements.filter((el) => el.selected)}
            updateProperty={updateElementProperty}
            onDelete={handleDeleteSelectedElements}
          />
        )}
      </div>

      <KeyboardShortcutsDialog isOpen={showShortcutsDialog} onClose={() => setShowShortcutsDialog(false)} />
    </div>
  )
}
