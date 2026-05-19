'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, Profile } from '@/types'
import { toast } from 'sonner'
import { formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, CheckCircle2, Circle, AlertCircle, Calendar, User } from 'lucide-react'

interface Props {
  initialTasks: (Task & { assignee?: Pick<Profile, 'id' | 'full_name'> | null; leads?: { id: string; full_name: string } | null })[]
  leads: { id: string; full_name: string }[]
  profiles: Pick<Profile, 'id' | 'full_name' | 'role' | 'email'>[]
  currentUserId: string
  currentUserRole: string
}

const emptyForm = { title: '', description: '', assigned_to: '', due_date: '', lead_id: '' }

export function TasksClient({ initialTasks, leads, profiles, currentUserId, currentUserRole }: Props) {
  const supabase = createClient()
  const [tasks, setTasks] = useState(initialTasks)
  const [tab, setTab] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const now = new Date()

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (tab === 'mine') return t.assigned_to === currentUserId
      if (tab === 'overdue') return !t.completed && t.due_date && new Date(t.due_date) < now
      if (tab === 'pending') return !t.completed
      return true
    })
  }, [tasks, tab, currentUserId])

  const toggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
    if (error) { toast.error(error.message) } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
      toast.success(completed ? 'Task reopened' : 'Task completed!')
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      assigned_to: form.assigned_to || currentUserId,
      lead_id: form.lead_id || null,
      due_date: form.due_date || null,
      created_by: currentUserId,
      completed: false,
    }
    const { data, error } = await supabase.from('tasks').insert(payload).select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), leads(id, full_name)').single()
    if (error) { toast.error(error.message) } else {
      setTasks(prev => [data, ...prev])
      await supabase.from('activities').insert({ type: 'task_created', description: `Task created: ${form.title}`, user_id: currentUserId })
      toast.success('Task created')
      setModalOpen(false)
      setForm(emptyForm)
    }
    setSaving(false)
  }

  const getUrgency = (task: Task) => {
    if (task.completed) return 'completed'
    if (!task.due_date) return 'normal'
    const due = new Date(task.due_date)
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'overdue'
    if (diff < 1) return 'urgent'
    if (diff < 3) return 'soon'
    return 'normal'
  }

  const urgencyConfig = {
    overdue: { label: 'Overdue', class: 'border-l-red-500' },
    urgent: { label: 'Due Today', class: 'border-l-orange-500' },
    soon: { label: 'Due Soon', class: 'border-l-yellow-500' },
    normal: { label: '', class: 'border-l-border' },
    completed: { label: '', class: 'border-l-green-500' },
  }

  const counts = {
    all: tasks.length,
    mine: tasks.filter(t => t.assigned_to === currentUserId).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < now).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Follow-ups</h1>
          <p className="text-muted-foreground text-sm mt-1">{counts.pending} pending tasks</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />New Task
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="mine">My Tasks ({counts.mine})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-400">Overdue ({counts.overdue})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {tab === 'overdue' ? 'No overdue tasks!' : 'No tasks found. Create your first task!'}
            </CardContent>
          </Card>
        ) : (
          filtered.map(task => {
            const urgency = getUrgency(task)
            const config = urgencyConfig[urgency]
            return (
              <Card key={task.id} className={cn('border-l-4 transition-all hover:shadow-md', config.class)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <button onClick={() => toggleComplete(task.id, task.completed)} className="mt-0.5 flex-shrink-0">
                    {task.completed
                      ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                      : <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('font-medium', task.completed && 'line-through text-muted-foreground')}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {config.label && (
                          <Badge variant="outline" className={cn('text-xs', urgency === 'overdue' && 'bg-red-500/20 text-red-400 border-red-500/30', urgency === 'urgent' && 'bg-orange-500/20 text-orange-400 border-orange-500/30', urgency === 'soon' && 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>
                            {config.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(task.due_date)}
                        </span>
                      )}
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />{task.assignee.full_name}
                        </span>
                      )}
                      {task.leads && (
                        <span className="text-primary">{task.leads.full_name}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Follow up with John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task details..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link to Lead (optional)</Label>
              <Select value={form.lead_id} onValueChange={v => setForm(f => ({ ...f, lead_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No lead</SelectItem>
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create Task'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
