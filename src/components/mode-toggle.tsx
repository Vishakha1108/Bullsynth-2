import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/store/ThemeContext"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className="bg-background/50 backdrop-blur-sm border-white/10 hover:bg-primary/20 transition-all select-none cursor-pointer"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${theme === 'light' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
