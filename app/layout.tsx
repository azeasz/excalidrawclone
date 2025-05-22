import DrawingApp from "@/components/drawing-app"
import { ThemeProvider } from "@/hooks/use-theme"
import "./globals.css"

export default function Home() {
  return (
    <ThemeProvider>
      <main className="flex min-h-screen flex-col">
        <DrawingApp />
      </main>
    </ThemeProvider>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
