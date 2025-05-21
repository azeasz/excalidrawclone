"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Square, CircleIcon, Minus, ArrowRight, Type, Pencil, Trash2, MousePointer, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ToolbarProps = {
  activeTool: string
  setTool: (tool: any) => void
  color: string
  setColor: (color: string) => void
  strokeWidth: number
  setStrokeWidth: (width: number) => void
  fill: string
  setFill: (fill: string) => void
  showGrid: boolean
  setShowGrid: (show: boolean) => void
  gridSize: number
  setGridSize: (size: number) => void
  gridColor: string
  setGridColor: (color: string) => void
  gridOpacity: number
  setGridOpacity: (opacity: number) => void
  onShowKeyboardShortcuts: () => void
}

export default function Toolbar({
  activeTool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  fill,
  setFill,
  showGrid,
  setShowGrid,
  gridSize,
  setGridSize,
  gridColor,
  setGridColor,
  gridOpacity,
  setGridOpacity,
  onShowKeyboardShortcuts,
}: ToolbarProps) {
  return (
    <div className="w-64 bg-white border-r p-4 flex flex-col gap-4">
      <div>
        <h2 className="font-medium mb-2">Tools</h2>
        <div className="grid grid-cols-3 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "selection" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("selection")}
                  title="Selection"
                >
                  <MousePointer className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Selection (V)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "rectangle" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("rectangle")}
                  title="Rectangle"
                >
                  <Square className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Rectangle (R)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "circle" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("circle")}
                  title="Circle"
                >
                  <CircleIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Circle (C)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "line" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("line")}
                  title="Line"
                >
                  <Minus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Line (L)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "arrow" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("arrow")}
                  title="Arrow"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Arrow (A)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("text")}
                  title="Text"
                >
                  <Type className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Text (T)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === "freehand" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setTool("freehand")}
                  title="Freehand"
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Pencil (P)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="font-medium mb-2">Stroke</h2>
        <div className="space-y-2">
          <div>
            <Label htmlFor="stroke-color">Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: color }} />
              <Input
                id="stroke-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="stroke-width">Width: {strokeWidth}px</Label>
            <Input
              id="stroke-width"
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number.parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="font-medium mb-2">Fill</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-md border"
              style={{
                backgroundColor: fill === "transparent" ? "white" : fill,
                backgroundImage:
                  fill === "transparent"
                    ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)"
                    : "none",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 4px 4px",
              }}
            />
            <Input
              type="color"
              value={fill === "transparent" ? "#ffffff" : fill}
              onChange={(e) => setFill(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setFill(fill === "transparent" ? "#ffffff" : "transparent")}
          >
            {fill === "transparent" ? "Solid Fill" : "No Fill"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Grid</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-grid">Show Grid (G)</Label>
            <div className="flex items-center h-5">
              <input
                id="show-grid"
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <Label htmlFor="grid-size">Grid Size: {gridSize}px</Label>
            </div>
            <Input
              id="grid-size"
              type="range"
              min="10"
              max="100"
              step="10"
              value={gridSize}
              onChange={(e) => setGridSize(Number.parseInt(e.target.value))}
              className="w-full"
              disabled={!showGrid}
            />
          </div>

          <div>
            <Label htmlFor="grid-color">Grid Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: gridColor }} />
              <Input
                id="grid-color"
                type="color"
                value={gridColor}
                onChange={(e) => setGridColor(e.target.value)}
                className="w-full"
                disabled={!showGrid}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="grid-opacity">Grid Opacity: {gridOpacity}%</Label>
            <Input
              id="grid-opacity"
              type="range"
              min="5"
              max="100"
              step="5"
              value={gridOpacity}
              onChange={(e) => setGridOpacity(Number.parseInt(e.target.value))}
              className="w-full"
              disabled={!showGrid}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="mt-auto space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onShowKeyboardShortcuts}>
          <HelpCircle className="h-4 w-4 mr-2" /> Keyboard Shortcuts (?)
        </Button>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (confirm("Are you sure you want to clear the canvas?")) {
              window.location.reload()
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Clear Canvas
        </Button>
      </div>
    </div>
  )
}
