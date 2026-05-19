import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalLeads },
    { data: sales },
    { count: pendingFollowups },
    { data: recentActivities },
    { data: leadsBySource },
    { data: leadsByStatus },
    { data: recentSales },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('sales').select('amount, created_at, refund_status'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Follow-up'),
    supabase.from('activities').select('*, user:profiles(full_name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('leads').select('lead_source'),
    supabase.from('leads').select('status'),
    supabase.from('sales').select('*, closer:profiles(full_name)').order('created_at', { ascending: false }).limit(5),
  ])

  const totalRevenue = sales?.filter(s => !s.refund_status).reduce((sum, s) => sum + (s.amount || 0), 0) ?? 0
  const closedLeads = leadsByStatus?.filter(l => l.status === 'Closed').length ?? 0
  const conversionRate = totalLeads ? Math.round((closedLeads / totalLeads) * 100) : 0

  // Daily sales for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const dailySales = last7Days.map(day => ({
    date: day,
    revenue: sales?.filter(s => s.created_at.startsWith(day) && !s.refund_status).reduce((sum, s) => sum + (s.amount || 0), 0) ?? 0,
  }))

  // Lead sources pie data
  const sourceMap: Record<string, number> = {}
  leadsBySource?.forEach(l => {
    const src = l.lead_source || 'Unknown'
    sourceMap[src] = (sourceMap[src] || 0) + 1
  })
  const sourcePieData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }))

  // Status bar data
  const statusMap: Record<string, number> = {}
  leadsByStatus?.forEach(l => { statusMap[l.status] = (statusMap[l.status] || 0) + 1 })
  const statusBarData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

  return (
    <DashboardClient
      stats={{
        totalLeads: totalLeads ?? 0,
        totalRevenue,
        totalSales: sales?.length ?? 0,
        conversionRate,
        pendingFollowups: pendingFollowups ?? 0,
      }}
      dailySales={dailySales}
      sourcePieData={sourcePieData}
      statusBarData={statusBarData}
      recentActivities={recentActivities ?? []}
      recentSales={recentSales ?? []}
    />
  )
}
