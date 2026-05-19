'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Role } from '@/types'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getRoleColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Copy, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'

const ROLES: Role[] = ['admin', 'closer', 'partner', 'support']

interface Props {
  profiles: Profile[]
  sales: { closer_id: string | null; amount: number; refund_status: boolean }[]
  currentUserId: string
}

export function TeamClient({ profiles: initialProfiles, sales, currentUserId }: Props) {
  const supabase = createClient()
  const [profiles, setProfiles] = useState(initialProfiles)

  const getStats = (userId: string) => {
    const userSales = sales.filter(s => s.closer_id === userId && !s.refund_status)
    const revenue = userSales.reduce((sum, s) => sum + s.amount, 0)
    const refunds = sales.filter(s => s.closer_id === userId && s.refund_status).length
    return { salesCount: userSales.length, revenue, refunds }
  }

  const updateRole = async (id: string, role: Role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { toast.error(error.message) } else {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
      toast.success('Role updated')
    }
  }

  const copySignupLink = () => {
    const link = `${window.location.origin}/signup`
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Signup link copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }

  const totalRevenue = sales.filter(s => !s.refund_status).reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">{profiles.length} members</p>
        </div>
        <Button size="sm" variant="outline" onClick={copySignupLink}>
          <Copy className="w-4 h-4 mr-2" />Copy Signup Link
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><ShoppingCart className="w-4 h-4 text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">Team Members</p><p className="text-xl font-bold">{profiles.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="w-4 h-4 text-green-400" /></div>
          <div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><TrendingUp className="w-4 h-4 text-purple-400" /></div>
          <div><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold">{sales.filter(s => !s.refund_status).length}</p></div>
        </CardContent></Card>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {profiles.map(member => {
          const stats = getStats(member.id)
          const initials = member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? member.email.slice(0, 2).toUpperCase()
          return (
            <Card key={member.id} className={member.id === currentUserId ? 'border-primary/50' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{member.full_name || 'No name'}</p>
                      {member.id === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    <div className="mt-2">
                      <Select value={member.role} onValueChange={v => updateRole(member.id, v as Role)} disabled={member.id === currentUserId}>
                        <SelectTrigger className={`h-6 text-xs w-28 ${getRoleColor(member.role)} border`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-lg font-bold">{stats.salesCount}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">{formatCurrency(stats.revenue)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">{stats.refunds}</p>
                    <p className="text-xs text-muted-foreground">Refunds</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3">Joined {formatDate(member.created_at)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
