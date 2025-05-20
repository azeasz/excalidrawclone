"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"

type Element = {
  id: string
  type: string
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
  rotation?: number
}

type PropertiesPanelProps = {
  element: Element | null
  selectedElements: Element[]
  updateProperty: (property: string, value: any) => void
  onDelete: () => void
}

export default function PropertiesPanel({ element, selectedElements, updateProperty, onDelete }: PropertiesPanelProps) {
  const multipleSelected = selectedElements.length > 1

  if (!element && selectedElements.length === 0) {
    return (
      <div className="w-64 bg-white border-l p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Properties</h2>
        </div>
        <div className="text-sm text-gray-500">No element selected</div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-l p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">
          {multipleSelected ? `Properties (${selectedElements.length} elements)` : "Properties"}
        </h2>
        <Button variant="destructive" size="icon" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Type</Label>
          <div className="text-sm mt-1 capitalize">{element?.type}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="x-position">X Position</Label>
            <Input
              id="x-position"
              type="number"
              value={Math.round(element?.x || 0)}
              onChange={(e) => updateProperty("x", Number.parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="y-position">Y Position</Label>
            <Input
              id="y-position"
              type="number"
              value={Math.round(element?.y || 0)}
              onChange={(e) => updateProperty("y", Number.parseInt(e.target.value))}
            />
          </div>
        </div>

        {element?.type === "rectangle" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                type="number"
                value={Math.round(element?.width || 0)}
                onChange={(e) => updateProperty("width", Number.parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                type="number"
                value={Math.round(element?.height || 0)}
                onChange={(e) => updateProperty("height", Number.parseInt(e.target.value))}
              />
            </div>
          </div>
        )}

        {element?.type === "circle" && (
          <div>
            <Label htmlFor="radius">Radius</Label>
            <Input
              id="radius"
              type="number"
              value={Math.round(element?.radius || 0)}
              onChange={(e) => updateProperty("radius", Number.parseInt(e.target.value))}
            />
          </div>
        )}

        {element?.type === "text" && (
          <div>
            <Label htmlFor="text">Text</Label>
            <Input id="text" value={element?.text || ""} onChange={(e) => updateProperty("text", e.target.value)} />
          </div>
        )}

        {(element?.type === "rectangle" ||
          element?.type === "circle" ||
          element?.type === "text" ||
          element?.type === "line" ||
          element?.type === "arrow") && (
          <div>
            <Label htmlFor="rotation">Rotation (degrees)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rotation"
                type="number"
                value={Math.round(element?.rotation || 0)}
                onChange={(e) => updateProperty("rotation", Number.parseInt(e.target.value))}
                className="w-full"
              />
              <Button variant="outline" size="sm" onClick={() => updateProperty("rotation", 0)} title="Reset rotation">
                Reset
              </Button>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="stroke-color">Stroke Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: element?.stroke }} />
            <Input
              id="stroke-color"
              type="color"
              value={element?.stroke}
              onChange={(e) => updateProperty("stroke", e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="stroke-width">Stroke Width: {element?.strokeWidth}px</Label>
          <Input
            id="stroke-width"
            type="range"
            min="1"
            max="20"
            value={element?.strokeWidth}
            onChange={(e) => updateProperty("strokeWidth", Number.parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {(element?.type === "rectangle" || element?.type === "circle" || element?.type === "text") && (
          <div>
            <Label htmlFor="fill-color">Fill Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-8 h-8 rounded-md border"
                style={{
                  backgroundColor: element?.fill === "transparent" ? "white" : element?.fill,
                  backgroundImage:
                    element?.fill === "transparent"
                      ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)"
                      : "none",
                  backgroundSize: "8px 8px",
                  backgroundPosition: "0 0, 4px 4px",
                }}
              />
              <Input
                id="fill-color"
                type="color"
                value={element?.fill === "transparent" ? "#ffffff" : element?.fill}
                onChange={(e) => updateProperty("fill", e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={() => updateProperty("fill", element?.fill === "transparent" ? "#ffffff" : "transparent")}
            >
              {element?.fill === "transparent" ? "Solid Fill" : "No Fill"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
