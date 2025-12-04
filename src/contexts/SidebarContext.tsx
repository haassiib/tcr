'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  openMenus: Set<string>
  toggleMenu: (menuName: string) => void
  lastOpenedMenu: string | null
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set())
  const [lastOpenedMenu, setLastOpenedMenu] = useState<string | null>(null)

  useEffect(() => {
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    setSidebarCollapsed(collapsed)
  }, [])

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', newState.toString())
  }

  const toggleMenu = (menuName: string) => {
    const newOpenMenus = new Set(openMenus)
    if (newOpenMenus.has(menuName)) {
      newOpenMenus.delete(menuName)
    } else {
      // This is a new menu being opened
      newOpenMenus.add(menuName)
      setLastOpenedMenu(menuName)
    }
    setOpenMenus(newOpenMenus)
  }

  return (
    <SidebarContext.Provider value={{
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      toggleSidebar,
      openMenus,
      toggleMenu,
      lastOpenedMenu,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}