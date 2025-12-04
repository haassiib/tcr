'use client'

import { useState, useEffect } from 'react'

export function useSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(['dashboard']))

  useEffect(() => {
    setIsMounted(true)
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
      newOpenMenus.add(menuName)
    }
    setOpenMenus(newOpenMenus)
  }

  return {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    isMounted,
    openMenus,
    toggleSidebar,
    toggleMenu,
  }
}