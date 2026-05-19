'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student, StudentStatus } from '@/types'
import { toast } from 'sonner'
import { formatDate, formatMAD, getStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Trash2, Pencil, GraduationCap } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const STUDENT_STATUSES: StudentStatus[] = ['Active', 'Completed', 'Refunded']
const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Stripe', 'Partial', 'PayPal', 'Crypto']
const WEEKS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)

const emptyForm = {
  full_name: '', email: '', phone: '', amount_paid: '',
  payment_method: 'Bank Transfer', enrollment_date: '', status: 'Active' as StudentStatus,
  notes: '', attendance: {} as Record<string, boolean>,
}

interface Props {
  initialStudents: Student[]
  currentUserId: string
  currentUserRole: string
}

export function StudentsClient({ initialStudents, currentUserId, currentUserRole }: Props) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [students, setStudents] = useState(initialStudents)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => students.filter(s => {
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !s.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    return true
  }), [students, search, filterStatus])

  const totalMAD = filtered.reduce((sum, s) => sum + (s.amount_paid ?? 0), 0)
  const activeCount = students.filter(s => s.status === 'Active').length

  const openCreate = () => {
    setEditStudent(null)
    setForm(emptyForm)
    setProofFile(null)
    setModalOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditStudent(student)
    setForm({
      full_name: student.full_name,
      email: student.email ?? '',
      phone: student.phone ?? '',
      amount_paid: student.amount_paid?.toString() ?? '',
      payment_method: student.payment_method ?? 'Bank Transfer',
      enrollment_date: student.enrollment_date ?? '',
      status: student.status,
      notes: student.notes ?? '',
      attendance: student.attendance ?? {},
    })
    setProofFile(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error(t.students.nameRequired); return }
    setSaving(true)

    let proof_url: string | null = editStudent?.proof_url ?? null
    if (proofFile) {
      const ext = proofFile.name.split('.').pop()
      const path = `student-proofs/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('payments').upload(path, proofFile)
      if (uploadError) { toast.error(t.students.proofUploadFailed + uploadError.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('payments').getPublicUrl(path)
      proof_url = urlData.publicUrl
    }

    const payload = {
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      amount_paid: parseFloat(form.amount_paid) || 0,
      payment_method: form.payment_method,
      enrollment_date: form.enrollment_date || null,
      status: form.status,
      notes: form.notes || null,
      attendance: form.attendance,
      proof_url,
      created_by: currentUserId,
    }

    if (editStudent) {
      const { data, error } = await supabase.from('students').update(payload).eq('id', editStudent.id).select().single()
      if (error) { toast.error(error.message) } else {
        setStudents(prev => prev.map(s => s.id === editStudent.id ? data : s))
        toast.success(t.students.studentUpdated)
        setModalOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('students').insert(payload).select().single()
      if (error) { toast.error(error.message) } else {
        setStudents(prev => [data, ...prev])
        toast.success(t.students.studentAdded)
        setModalOpen(false)
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t.students.deleteConfirm.replace('{name}', name))) return
    setDeleting(id)
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) { toast.error(error.message) } else {
      setStudents(prev => prev.filter(s => s.id !== id))
      toast.success(t.students.studentDeleted)
    }
    setDeleting(null)
  }

  const toggleAttendance = (week: string) => {
    setForm(f => ({ ...f, attendance: { ...f.attendance, [week]: !f.attendance[week] } }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.students.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} {t.students.activeStudents} · {formatMAD(totalMAD)} collected
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />{t.students.addStudent}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.students.searchStudents} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder={t.students.allStatuses} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.students.allStatuses}</SelectItem>
            {STUDENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.students.colName}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.students.colStatus}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.students.colAmount}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.students.colEnrolled}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attendance</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t.students.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <GraduationCap className="w-8 h-8 text-muted-foreground/50" />
                    {t.students.noStudents}
                  </div>
                </td></tr>
              ) : (
                filtered.map(student => {
                  const attendedWeeks = Object.values(student.attendance ?? {}).filter(Boolean).length
                  const totalWeeks = Object.keys(student.attendance ?? {}).length
                  return (
                    <tr key={student.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{student.full_name}</p>
                        {student.email && <p className="text-xs text-muted-foreground">{student.email}</p>}
                        {student.phone && <p className="text-xs text-muted-foreground">{student.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(student.status)}`}>{student.status}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-400">{formatMAD(student.amount_paid)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {student.enrollment_date ? formatDate(student.enrollment_date) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {totalWeeks > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="flex gap-0.5">
                              {Object.entries(student.attendance ?? {}).slice(0, 8).map(([week, attended]) => (
                                <div key={week} className={`w-2 h-4 rounded-sm ${attended ? 'bg-green-500' : 'bg-muted'}`} title={week} />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground ml-1">{attendedWeeks}/{totalWeeks}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {student.proof_url && (
                            <a href={student.proof_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">{t.students.viewProof}</Button>
                            </a>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(student)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {currentUserRole === 'admin' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(student.id, student.full_name)} disabled={deleting === student.id}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editStudent ? t.students.editStudent : t.students.addStudent}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.students.fullName}</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ahmed Benali" />
            </div>
            <div className="space-y-2">
              <Label>{t.students.phone}</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+212600000000" />
            </div>
            <div className="space-y-2">
              <Label>{t.students.email}</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label>{t.students.enrollmentDate}</Label>
              <Input type="date" value={form.enrollment_date} onChange={e => setForm(f => ({ ...f, enrollment_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t.students.amountPaid}</Label>
              <Input value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} type="number" placeholder="5000" />
            </div>
            <div className="space-y-2">
              <Label>{t.students.paymentMethod}</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v ?? 'Bank Transfer' }))}>
                <SelectTrigger><SelectValue placeholder={t.students.selectMethod} /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.students.status}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as StudentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STUDENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.students.paymentProof}</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} className="h-9" />
              {proofFile && <p className="text-xs text-muted-foreground">{proofFile.name}</p>}
            </div>
            <div className="space-y-2 col-span-2">
              <Label>{t.students.notes}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t.students.notesPlaceholder} rows={2} />
            </div>

            {/* Weekly Attendance */}
            <div className="col-span-2 space-y-2">
              <Label>{t.students.attendance}</Label>
              <div className="grid grid-cols-4 gap-2">
                {WEEKS.map(week => (
                  <label key={week} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-border hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.attendance[week] ?? false}
                      onChange={() => toggleAttendance(week)}
                      className="rounded"
                    />
                    <span className="text-xs">{week}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t.students.saving : editStudent ? t.students.updateBtn : t.students.addStudentBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
