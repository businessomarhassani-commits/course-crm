'use client'

import { formatCurrency, formatRelativeTime, getStatusColor } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, DollarSign, TrendingUp, AlertCircle, ShoppingCart,
  ArrowUpRight, Activity
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']

interface DashboardClientProps {
  stats: {
    totalLeads: number
    totalRevenue: number
    totalSales: number
    conversionRate: number
    pendingFollowups: number
  }
  dailySales: { date: string; revenue: number }[]
  sourcePieData: { name: string; value: number }[]
  statusBarData: { name: string; value: number }[]
  recentActivities: Array<{ id: string; type: string; description: string; created_at: string; user?: { full_name: string } | null }>
  recentSales: Array<{ id: string; customer_name: string; offer: string; amount: number; created_at: string; closer?: { full_name: string } | null }>
}

export function DashboardClient({
  stats, dailySales, sourcePieData, statusBarData, recentActivities, recentSales
}: DashboardClientProps) {
  const statCards = [
    { title: 'Total Leads', value: stats.totalLeads.toString(), icon: Users, change: '+12%', color: 'text-blue-400', href: '/leads' },
    { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, change: '+8%', color: 'text-green-400', href: '/sales' },
    { title: 'Total Sales', value: stats.totalSales.toString(), icon: ShoppingCart, change: '+5%', color: 'text-purple-400', href: '/sales' },
    { title: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, change: '+2%', color: 'text-yellow-400', href: '/leads' },
    { title: 'Pending Follow-ups', value: stats.pendingFollowups.toString(), icon: AlertCircle, change: '', color: 'text-orange-400', href: '/tasks' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:border-border/80 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                      {card.change && (
                        <p className="text-xs text-green-400 flex items-center gap-0.5 mt-1">
                          <ArrowUpRight className="w-3 h-3" />{card.change}
                        </p>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/leads?new=1"><Button size="sm">+ New Lead</Button></Link>
        <Link href="/sales?new=1"><Button size="sm" variant="outline">+ New Sale</Button></Link>
        <Link href="/tasks?new=1"><Button size="sm" variant="outline">+ New Task</Button></Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {sourcePieData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourcePieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={false} labelLine={false}>
                    {sourcePieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBarData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSales.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No sales yet</div>
            ) : (
              recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{sale.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{sale.offer} · {sale.closer?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{formatCurrency(sale.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(sale.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No activity yet</div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.user?.full_name} · {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
