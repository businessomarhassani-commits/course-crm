'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Payment, PaymentStatus } from '@/types'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, DollarSign, Clock, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Stripe', 'Partial', 'PayPal', 'Crypto']
const STATUSES: PaymentStatus[] = ['Pending', 'Confirmed', 'Refunded']

interface Props {
  initialPayments: (Payment & { sales?: { id: string; customer_name: string; offer: string; amount: number } | null })[]
  sales: { id: string; customer_name: string; offer: string }[]
  currentUserId: string
  currentUserRole: string
}

const emptyForm = {
  sale_id: '', amount: '', method: 'Bank Transfer', status: 'Pending' as PaymentStatus, notes: '',
}

export function PaymentsClient({ initialPayments, sales, currentUserId, currentUserRole }: Props) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [payments, setPayments] = useState(initialPayments)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => payments.filter(p => {
    if (search && !p.sales?.customer_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  }), [payments, search, filterStatus])

  const totalConfirmed = filtered.filter(p => p.status === 'Confirmed').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = filtered.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0)

  const handleSave = async () => {
    if (!form.amount) { toast.error(t.payments.amountIsRequired); return }
    setSaving(true)

    let proof_url: string | null = null
    if (proofFile) {
      const ext = proofFile.name.split('.').pop()
      const path = `proofs/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('payments').upload(path, proofFile)
      if (uploadError) { toast.error(t.payments.proofUploadFailed + uploadError.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('payments').getPublicUrl(path)
      proof_url = urlData.publicUrl
    }

    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      sale_id: form.sale_id || null,
      proof_url,
    }

    const { data, error } = await supabase.from('payments').insert(payload).select('*, sales(id, customer_name, offer, amount)').single()
    if (error) { toast.error(error.message) } else {
      setPayments(prev => [data, ...prev])
      await supabase.from('activities').insert({ type: 'payment_added', description: `Payment of ${formatCurrency(parseFloat(form.amount))} recorded (${form.status})`, user_id: currentUserId })
      toast.success(t.payments.paymentRecorded)
      setModalOpen(false)
      setForm(emptyForm)
      setProofFile(null)
    }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: PaymentStatus) => {
    const { error } = await supabase.from('payments').update({ status }).eq('id', id)
    if (error) { toast.error(error.message) } else {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p))
      toast.success(t.payments.statusUpdated)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.payments.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} {t.payments.paymentsCount}</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />{t.payments.addPayment}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.payments.confirmed}</p><p className="text-xl font-bold text-green-400">{formatCurrency(totalConfirmed)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="w-4 h-4 text-yellow-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.payments.pending}</p><p className="text-xl font-bold text-yellow-400">{formatCurrency(totalPending)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><DollarSign className="w-4 h-4 text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">{t.payments.totalPayments}</p><p className="text-xl font-bold">{filtered.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.payments.searchPayments} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder={t.payments.allStatuses} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.payments.allStatuses}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colCustomer}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colAmount}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colMethod}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colStatus}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colProof}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colNotes}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.payments.colDate}</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t.payments.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">{t.payments.noPayments}</td></tr>
              ) : (
                filtered.map(payment => (
                  <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{payment.sales?.customer_name || '—'}</p>
                      {payment.sales?.offer && <p className="text-xs text-muted-foreground">{payment.sales.offer}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-400">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{payment.method || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${getStatusColor(payment.status)}`}>{payment.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {payment.proof_url
                        ? <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">{t.payments.viewProof}</a>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{payment.notes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(payment.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Select value={payment.status} onValueChange={v => updateStatus(payment.id, v as PaymentStatus)}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.payments.addPayment}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>{t.payments.linkToSale}</Label>
              <Select value={form.sale_id} onValueChange={v => setForm(f => ({ ...f, sale_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder={t.payments.selectSale} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t.payments.noLink}</SelectItem>
                  {sales.map(s => <SelectItem key={s.id} value={s.id}>{s.customer_name} — {s.offer}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.payments.amountRequired}</Label>
              <Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="497" type="number" />
            </div>
            <div className="space-y-2">
              <Label>{t.payments.method}</Label>
              <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v ?? 'Bank Transfer' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.payments.statusLabel}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as PaymentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.payments.paymentProof}</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} className="h-9" />
              </div>
              {proofFile && <p className="text-xs text-muted-foreground">{proofFile.name}</p>}
            </div>
            <div className="space-y-2 col-span-2">
              <Label>{t.payments.paymentNotes}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t.common.saving : t.payments.addPaymentBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
