// lib/store/useSidebarStore.ts
import { create } from 'zustand';

type SidebarStore = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setIsCollapsed: (collapsed: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setIsCollapsed: (isCollapsed) => set({ isCollapsed }),
}));