"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type KeyboardShortcutsDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export default function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const shortcuts = [
    {
      category: "Tools",
      items: [
        { key: "V", description: "Selection tool" },
        { key: "R", description: "Rectangle tool" },
        { key: "C", description: "Circle tool" },
        { key: "L", description: "Line tool" },
        { key: "A", description: "Arrow tool" },
        { key: "T", description: "Text tool" },
        { key: "P", description: "Pencil/Freehand tool" },
      ],
    },
    {
      category: "Actions",
      items: [
        { key: "Ctrl+Z", description: "Undo" },
        { key: "Ctrl+Y / Ctrl+Shift+Z", description: "Redo" },
        { key: "Ctrl+A", description: "Select all" },
        { key: "Ctrl+D", description: "Duplicate selected" },
        { key: "Ctrl+C", description: "Copy selected" },
        { key: "Ctrl+X", description: "Cut selected" },
        { key: "Ctrl+V", description: "Paste" },
        { key: "Delete / Backspace", description: "Delete selected" },
        { key: "Escape", description: "Deselect all / Cancel current operation" },
      ],
    },
    {
      category: "Editing",
      items: [
        { key: "Shift (while drawing)", description: "Constrain to perfect shape (square, circle)" },
        { key: "Shift (while resizing)", description: "Maintain aspect ratio" },
        { key: "Shift (while rotating)", description: "Snap to 15° increments" },
        { key: "Shift (while moving)", description: "Constrain to horizontal/vertical movement" },
        { key: "Alt (while moving)", description: "Duplicate element" },
      ],
    },
    {
      category: "View",
      items: [
        { key: "Ctrl+0", description: "Reset zoom" },
        { key: "Ctrl++", description: "Zoom in" },
        { key: "Ctrl+-", description: "Zoom out" },
        { key: "G", description: "Toggle grid" },
        { key: "?", description: "Show keyboard shortcuts" },
      ],
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to work more efficiently in the drawing app.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {shortcuts.map((category) => (
              <div key={category.category}>
                <h3 className="font-medium text-lg mb-2">{category.category}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {category.items.map((shortcut) => (
                    <div key={shortcut.key} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{shortcut.key}</span>
                      <span className="text-gray-700">{shortcut.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
