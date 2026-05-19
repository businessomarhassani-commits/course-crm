'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getStatusColor, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Users, ShoppingCart, CheckSquare } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const supabase = createClient()
  const { t } = useLanguage()
  const [results, setResults] = useState<{ leads: unknown[]; sales: unknown[]; tasks: unknown[] }>({ leads: [], sales: [], tasks: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) return
    setLoading(true)
    Promise.all([
      supabase.from('leads').select('id, full_name, status, email, phone').ilike('full_name', `%${q}%`).limit(5),
      supabase.from('sales').select('id, customer_name, offer, amount').ilike('customer_name', `%${q}%`).limit(5),
      supabase.from('tasks').select('id, title, completed, due_date').ilike('title', `%${q}%`).limit(5),
    ]).then(([leads, sales, tasks]) => {
      setResults({ leads: leads.data ?? [], sales: sales.data ?? [], tasks: tasks.data ?? [] })
      setLoading(false)
    })
  }, [q])

  if (!q) return <div className="text-muted-foreground text-center py-12">{t.search.enterQuery}</div>
  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  )

  const total = results.leads.length + results.sales.length + results.tasks.length

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{total} {t.search.results} &quot;{q}&quot;</p>

      {(results.leads as { id: string; full_name: string; status: string; email?: string }[]).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="w-4 h-4" />{t.search.leadsSection}
          </div>
          {(results.leads as { id: string; full_name: string; status: string; email?: string }[]).map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <Card className="hover:border-border/80 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{lead.full_name}</p>
                    {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                  </div>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(lead.status)}`}>{lead.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {(results.sales as { id: string; customer_name: string; offer: string; amount: number }[]).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShoppingCart className="w-4 h-4" />{t.search.salesSection}
          </div>
          {(results.sales as { id: string; customer_name: string; offer: string; amount: number }[]).map((sale) => (
            <Link key={sale.id} href="/sales">
              <Card className="hover:border-border/80 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sale.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{sale.offer}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-400">${sale.amount}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {(results.tasks as { id: string; title: string; completed: boolean; due_date?: string }[]).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckSquare className="w-4 h-4" />{t.search.tasksSection}
          </div>
          {(results.tasks as { id: string; title: string; completed: boolean; due_date?: string }[]).map((task) => (
            <Link key={task.id} href="/tasks">
              <Card className="hover:border-border/80 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                  {task.due_date && <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {t.search.noResults} &quot;{q}&quot;
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  const { t } = useLanguage()
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t.search.title}</h1>
      <Suspense fallback={<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>}>
        <SearchResults />
      </Suspense>
    </div>
  )
}
