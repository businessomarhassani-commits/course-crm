'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Role } from '@/types'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getRoleColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Copy, DollarSign, ShoppingCart, TrendingUp, KeyRound } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const ROLES: Role[] = ['admin', 'closer', 'partner', 'support']

interface Props {
  profiles: Profile[]
  sales: { closer_id: string | null; amount: number; refund_status: boolean }[]
  currentUserId: string
}

export function TeamClient({ profiles: initialProfiles, sales, currentUserId }: Props) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [resetTarget, setResetTarget] = useState<Profile | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

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
      toast.success(t.team.roleUpdated)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    if (newPassword.length < 8) { toast.error(t.team.passwordMinLength); return }
    setResetting(true)
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetTarget.id, newPassword }),
    })
    const result = await res.json()
    if (!res.ok) {
      toast.error(result.error || t.team.passwordResetFailed)
    } else {
      toast.success(t.team.passwordReset)
      setResetTarget(null)
      setNewPassword('')
    }
    setResetting(false)
  }

  const copySignupLink = () => {
    const link = `${window.location.origin}/signup`
    navigator.clipboard.writeText(link).then(() => {
      toast.success(t.team.signupLinkCopied)
    }).catch(() => {
      toast.error(t.team.failedToCopy)
    })
  }

  const totalRevenue = sales.filter(s => !s.refund_status).reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.team.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{profiles.length} {t.team.members}</p>
        </div>
        <Button size="sm" variant="outline" onClick={copySignupLink}>
          <Copy className="w-4 h-4 mr-2" />{t.team.copySignupLink}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><ShoppingCart className="w-4 h-4 text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.team.teamMembers}</p><p className="text-xl font-bold">{profiles.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="w-4 h-4 text-green-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.team.totalRevenue}</p><p className="text-xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><TrendingUp className="w-4 h-4 text-purple-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.team.totalSales}</p><p className="text-xl font-bold">{sales.filter(s => !s.refund_status).length}</p></div>
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
                      <p className="font-semibold truncate">{member.full_name || t.team.noName}</p>
                      {member.id === currentUserId && <span className="text-xs text-muted-foreground">({t.team.you})</span>}
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
                    <p className="text-xs text-muted-foreground">{t.team.sales}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">{formatCurrency(stats.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{t.team.revenue}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">{stats.refunds}</p>
                    <p className="text-xs text-muted-foreground">{t.team.refunds}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3">{t.team.joined} {formatDate(member.created_at)}</p>

                {member.id !== currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 h-7 text-xs"
                    onClick={() => { setResetTarget(member); setNewPassword('') }}
                  >
                    <KeyRound className="w-3 h-3 mr-1.5" />{t.team.resetPassword}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) { setResetTarget(null); setNewPassword('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.team.resetPasswordTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {resetTarget?.full_name || resetTarget?.email}
            </p>
            <div className="space-y-2">
              <Label>{t.team.newPassword}</Label>
              <Input
                type="password"
                placeholder={t.team.newPasswordPlaceholder}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setNewPassword('') }}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? t.team.resetting : t.team.resetBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
