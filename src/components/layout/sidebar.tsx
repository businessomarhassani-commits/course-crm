'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Profile } from '@/types'
import {
  LayoutDashboard, Users, ShoppingCart, CreditCard, CheckSquare,
  BarChart2, BookOpen, LogOut, ChevronLeft, ChevronRight,
  Megaphone, Kanban, GraduationCap
} from 'lucide-react'
import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/leads', label: t.nav.leads, icon: Users },
    { href: '/pipeline', label: t.nav.pipeline, icon: Kanban },
    { href: '/sales', label: t.nav.sales, icon: ShoppingCart },
    { href: '/students', label: t.nav.students, icon: GraduationCap },
    { href: '/payments', label: t.nav.payments, icon: CreditCard },
    { href: '/tasks', label: t.nav.tasks, icon: CheckSquare },
    { href: '/content', label: t.nav.content, icon: Megaphone },
    { href: '/team', label: t.nav.team, icon: BarChart2, adminOnly: true },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success(t.nav.signOut)
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const filteredNav = navItems.filter(item => {
    if (item.adminOnly && profile?.role !== 'admin') return false
    return true
  })

  return (
    <aside className={cn(
      'relative flex flex-col border-r border-border bg-card/50 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-border', collapsed && 'justify-center px-2')}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight">Course CRM</span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[4.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all relative',
                active
                  ? 'text-primary bg-primary/10 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-primary before:rounded-full'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className={cn('border-t border-border p-3', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
              <Badge variant="outline" className="text-xs px-1 py-0 capitalize mt-0.5">
                {profile?.role}
              </Badge>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
              title={t.nav.signOut}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        {collapsed && (
          <button onClick={handleSignOut} className="mt-2 w-full flex justify-center text-muted-foreground hover:text-foreground" title={t.nav.signOut}>
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
