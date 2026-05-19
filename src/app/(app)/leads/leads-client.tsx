'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lead, Profile, LeadStatus } from '@/types'
import { toast } from 'sonner'
import { formatDate, getStatusColor, exportToCSV } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, Download, MessageCircle, Pencil, Trash2,
  ChevronLeft, ChevronRight, ExternalLink, Filter
} from 'lucide-react'
import Link from 'next/link'

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Follow-up', 'Closed', 'No answer', 'Lost', 'Refund']
const SOURCES = ['Instagram', 'Facebook', 'YouTube', 'TikTok', 'Referral', 'Website', 'WhatsApp', 'Other']
const PAGE_SIZE = 20

interface LeadsClientProps {
  initialLeads: Lead[]
  profiles: Pick<Profile, 'id' | 'full_name' | 'role' | 'email'>[]
  currentUserId: string
  currentUserRole: string
}

const emptyForm = {
  full_name: '', phone: '', email: '', instagram: '', facebook: '',
  lead_source: '', assigned_to: '', status: 'New' as LeadStatus,
  notes: '', interested_offer: '', budget: '', country: '',
}

export function LeadsClient({ initialLeads, profiles, currentUserId, currentUserRole }: LeadsClientProps) {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [filterCloser, setFilterCloser] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (search && !l.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !l.email?.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone?.includes(search)) return false
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (filterSource !== 'all' && l.lead_source !== filterSource) return false
      if (filterCloser !== 'all' && l.assigned_to !== filterCloser) return false
      return true
    })
  }, [leads, search, filterStatus, filterSource, filterCloser])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const openCreate = () => {
    setEditLead(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setForm({
      full_name: lead.full_name,
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      instagram: lead.instagram ?? '',
      facebook: lead.facebook ?? '',
      lead_source: lead.lead_source ?? '',
      assigned_to: lead.assigned_to ?? '',
      status: lead.status,
      notes: lead.notes ?? '',
      interested_offer: lead.interested_offer ?? '',
      budget: lead.budget?.toString() ?? '',
      country: lead.country ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      budget: form.budget ? parseFloat(form.budget) : null,
      assigned_to: form.assigned_to || null,
      created_by: currentUserId,
    }

    if (editLead) {
      const { data, error } = await supabase.from('leads').update(payload).eq('id', editLead.id).select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, role)').single()
      if (error) { toast.error(error.message) } else {
        setLeads(prev => prev.map(l => l.id === editLead.id ? data : l))
        await supabase.from('activities').insert({ type: 'lead_updated', description: `Updated lead: ${form.full_name}`, user_id: currentUserId, lead_id: editLead.id })
        toast.success('Lead updated')
        setModalOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('leads').insert(payload).select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, role)').single()
      if (error) { toast.error(error.message) } else {
        setLeads(prev => [data, ...prev])
        await supabase.from('activities').insert({ type: 'lead_created', description: `Created lead: ${form.full_name}`, user_id: currentUserId, lead_id: data.id })
        toast.success('Lead created')
        setModalOpen(false)
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete lead "${name}"?`)) return
    setDeleting(id)
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) { toast.error(error.message) } else {
      setLeads(prev => prev.filter(l => l.id !== id))
      toast.success('Lead deleted')
    }
    setDeleting(null)
  }

  const handleExport = () => {
    const data = filtered.map(l => ({
      name: l.full_name, phone: l.phone, email: l.email,
      status: l.status, source: l.lead_source, country: l.country,
      offer: l.interested_offer, budget: l.budget, created: l.created_at,
    }))
    exportToCSV(data as Record<string, unknown>[], 'leads')
    toast.success('Exported to CSV')
  }

  const closers = profiles.filter(p => p.role === 'closer' || p.role === 'admin')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} leads total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />New Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={v => { setFilterSource(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {currentUserRole === 'admin' && (
          <Select value={filterCloser} onValueChange={v => { setFilterCloser(v ?? 'all'); setPage(1) }}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Closer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All closers</SelectItem>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Offer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  {search || filterStatus !== 'all' ? 'No leads match your filters' : 'No leads yet. Create your first lead!'}
                </td></tr>
              )}
              {paginated.map(lead => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:text-primary transition-colors">
                      {lead.full_name}
                    </Link>
                    {lead.country && <p className="text-xs text-muted-foreground">{lead.country}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {lead.phone && (
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs transition-colors">
                          <MessageCircle className="w-3 h-3" />{lead.phone}
                        </a>
                      )}
                      {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${getStatusColor(lead.status)}`}>{lead.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lead.lead_source || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lead.interested_offer || '—'}</td>
                  <td className="px-4 py-3 text-xs">{(lead as Lead & { assignee?: Profile }).assignee?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(lead.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {lead.phone && (
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-400">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-3.5 h-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(lead)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {currentUserRole === 'admin' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(lead.id, lead.full_name)} disabled={deleting === lead.id}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLead ? 'Edit Lead' : 'New Lead'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1234567890" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="USA" />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input value={form.facebook} onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} placeholder="Profile URL" />
            </div>
            <div className="space-y-2">
              <Label>Lead Source</Label>
              <Select value={form.lead_source} onValueChange={v => setForm(f => ({ ...f, lead_source: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interested Offer</Label>
              <Input value={form.interested_offer} onChange={e => setForm(f => ({ ...f, interested_offer: e.target.value }))} placeholder="Course name" />
            </div>
            <div className="space-y-2">
              <Label>Budget ($)</Label>
              <Input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="500" type="number" />
            </div>
            {(currentUserRole === 'admin' || currentUserRole === 'partner') && (
              <div className="space-y-2 col-span-2">
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select closer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editLead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
