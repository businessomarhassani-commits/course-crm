'use client'

import { useState } from 'react'
import { Plus, X, Users, ShoppingCart, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'

export function QuickActionsFAB() {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const actions = [
    { href: '/leads?new=1', label: t.dashboard.newLead.replace('+ ', ''), icon: Users, color: 'bg-blue-600 hover:bg-blue-500' },
    { href: '/sales?new=1', label: t.dashboard.newSale.replace('+ ', ''), icon: ShoppingCart, color: 'bg-green-600 hover:bg-green-500' },
    { href: '/tasks?new=1', label: t.dashboard.newTask.replace('+ ', ''), icon: CheckSquare, color: 'bg-orange-600 hover:bg-orange-500' },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 md:hidden">
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map(action => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href} onClick={() => setOpen(false)}>
                <div className="flex items-center gap-2">
                  <span className="bg-card text-foreground text-xs font-medium px-2 py-1 rounded-md shadow-lg border border-border">
                    {action.label}
                  </span>
                  <button className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-colors', action.color)}>
                    <Icon className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all',
          open ? 'bg-muted-foreground rotate-45' : 'bg-primary hover:bg-primary/90'
        )}
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  )
}
