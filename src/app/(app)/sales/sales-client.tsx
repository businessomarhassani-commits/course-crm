'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sale, Profile } from '@/types'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, DollarSign, TrendingUp, ShoppingCart, RefreshCcw } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Stripe', 'Partial', 'PayPal', 'Crypto']

interface Props {
  initialSales: (Sale & { closer?: Pick<Profile, 'id' | 'full_name'> | null; leads?: { id: string; full_name: string } | null })[]
  leads: { id: string; full_name: string }[]
  profiles: Pick<Profile, 'id' | 'full_name' | 'role' | 'email'>[]
  currentUserId: string
  currentUserRole: string
}

const emptyForm = {
  lead_id: '', customer_name: '', offer: '', amount: '',
  payment_method: 'Bank Transfer', closer_id: '', refund_status: false,
}

export function SalesClient({ initialSales, leads, profiles, currentUserId, currentUserRole }: Props) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [sales, setSales] = useState(initialSales)
  const [search, setSearch] = useState('')
  const [filterCloser, setFilterCloser] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => sales.filter(s => {
    if (search && !s.customer_name.toLowerCase().includes(search.toLowerCase()) && !s.offer.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCloser !== 'all' && s.closer_id !== filterCloser) return false
    return true
  }), [sales, search, filterCloser])

  const totalRevenue = filtered.filter(s => !s.refund_status).reduce((sum, s) => sum + s.amount, 0)
  const refundedAmount = filtered.filter(s => s.refund_status).reduce((sum, s) => sum + s.amount, 0)

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.offer.trim() || !form.amount) {
      toast.error(t.sales.nameOfferRequired)
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      lead_id: form.lead_id || null,
      closer_id: form.closer_id || currentUserId,
    }
    const { data, error } = await supabase.from('sales').insert(payload).select('*, closer:profiles!sales_closer_id_fkey(id, full_name), leads(id, full_name)').single()
    if (error) { toast.error(error.message) } else {
      setSales(prev => [data, ...prev])
      if (payload.lead_id) {
        await supabase.from('leads').update({ status: 'Closed' }).eq('id', payload.lead_id)
      }
      await supabase.from('activities').insert({ type: 'sale_created', description: `New sale: ${form.customer_name} - ${form.offer} ($${form.amount})`, user_id: currentUserId })
      toast.success(t.sales.saleCreated)
      setModalOpen(false)
      setForm(emptyForm)
    }
    setSaving(false)
  }

  const toggleRefund = async (id: string, current: boolean) => {
    const { error } = await supabase.from('sales').update({ refund_status: !current }).eq('id', id)
    if (error) { toast.error(error.message) } else {
      setSales(prev => prev.map(s => s.id === id ? { ...s, refund_status: !current } : s))
      toast.success(current ? t.sales.refundRemoved : t.sales.markedRefunded)
    }
  }

  const closers = profiles.filter(p => p.role === 'closer' || p.role === 'admin')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.sales.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} {t.sales.salesCount}</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />{t.sales.newSale}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="w-4 h-4 text-green-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.sales.totalRevenue}</p><p className="text-xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><ShoppingCart className="w-4 h-4 text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.sales.totalSales}</p><p className="text-xl font-bold">{filtered.filter(s => !s.refund_status).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10"><RefreshCcw className="w-4 h-4 text-red-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.sales.refunded}</p><p className="text-xl font-bold text-red-400">{formatCurrency(refundedAmount)}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.sales.searchSales} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        {currentUserRole === 'admin' && (
          <Select value={filterCloser} onValueChange={v => setFilterCloser(v ?? 'all')}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder={t.sales.allClosers} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.sales.allClosers}</SelectItem>
              {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colCustomer}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colOffer}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colAmount}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colMethod}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colCloser}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colStatus}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.sales.colDate}</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t.sales.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">{t.sales.noSales}</td></tr>
              ) : (
                filtered.map(sale => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{sale.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{sale.offer}</td>
                    <td className="px-4 py-3 font-semibold text-green-400">{formatCurrency(sale.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{sale.payment_method || '—'}</td>
                    <td className="px-4 py-3 text-xs">{sale.closer?.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      {sale.refund_status
                        ? <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{t.sales.refundedStatus}</Badge>
                        : <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{t.sales.activeStatus}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(sale.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {currentUserRole === 'admin' && (
                        <Button variant="ghost" size="sm" onClick={() => toggleRefund(sale.id, sale.refund_status)} className="h-7 text-xs">
                          {sale.refund_status ? t.sales.undoRefund : t.sales.refundBtn}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Sale Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.sales.newSale}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>{t.sales.linkToLead}</Label>
              <Select value={form.lead_id} onValueChange={v => {
                const val = v ?? ''
                const lead = leads.find(l => l.id === val)
                setForm(f => ({ ...f, lead_id: val, customer_name: lead?.full_name ?? f.customer_name }))
              }}>
                <SelectTrigger><SelectValue placeholder={t.sales.selectLead} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t.sales.noLink}</SelectItem>
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.sales.customerName}</Label>
              <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>{t.sales.offer}</Label>
              <Input value={form.offer} onChange={e => setForm(f => ({ ...f, offer: e.target.value }))} placeholder="Course name" />
            </div>
            <div className="space-y-2">
              <Label>{t.sales.amount}</Label>
              <Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="997" type="number" />
            </div>
            <div className="space-y-2">
              <Label>{t.sales.paymentMethod}</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v ?? 'Bank Transfer' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {currentUserRole === 'admin' && (
              <div className="space-y-2 col-span-2">
                <Label>{t.sales.assignCloser}</Label>
                <Select value={form.closer_id} onValueChange={v => setForm(f => ({ ...f, closer_id: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder={t.sales.assignCloser} /></SelectTrigger>
                  <SelectContent>
                    {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t.common.saving : t.sales.createSale}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
