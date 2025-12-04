import { LucideIcon } from 'lucide-react'

export interface MenuItem {
  name: string
  href?: string
  icon: LucideIcon
  active?: boolean
  children?: MenuItem[],
  permission?: string
}