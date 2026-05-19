'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, Note, Activity, Task, Profile, LeadStatus } from '@/types'
import { toast } from 'sonner'
import { formatDate, formatRelativeTime, getStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, DollarSign, BookOpen, CheckCircle2, Circle, AtSign, Globe } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Follow-up', 'Closed', 'No answer', 'Lost', 'Refund']

interface Props {
  lead: Lead & { assignee?: Profile }
  notes: (Note & { author?: Pick<Profile, 'full_name'> | null })[]
  activities: (Activity & { user?: Pick<Profile, 'full_name'> | null })[]
  tasks: (Task & { assignee?: Pick<Profile, 'full_name'> | null })[]
  profiles: Pick<Profile, 'id' | 'full_name' | 'role' | 'email'>[]
  currentUserId: string
  currentUserRole: string
}

export function LeadDetailClient({ lead: initialLead, notes: initialNotes, activities, tasks, profiles, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [lead, setLead] = useState(initialLead)
  const [notes, setNotes] = useState(initialNotes)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const updateStatus = async (status: LeadStatus) => {
    setUpdatingStatus(true)
    const { error } = await supabase.from('leads').update({ status }).eq('id', lead.id)
    if (error) { toast.error(error.message) } else {
      setLead(l => ({ ...l, status }))
      await supabase.from('activities').insert({ type: 'status_changed', description: `Status changed to ${status}`, user_id: currentUserId, lead_id: lead.id })
      toast.success(`Status updated to ${status}`)
    }
    setUpdatingStatus(false)
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    const { data, error } = await supabase.from('notes').insert({ lead_id: lead.id, content: noteText, created_by: currentUserId }).select('*, author:profiles(full_name)').single()
    if (error) { toast.error(error.message) } else {
      setNotes(prev => [data, ...prev])
      await supabase.from('activities').insert({ type: 'note_added', description: `Note added`, user_id: currentUserId, lead_id: lead.id })
      setNoteText('')
      toast.success('Note added')
    }
    setSavingNote(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{lead.full_name}</h1>
          <p className="text-muted-foreground text-sm">Added {formatDate(lead.created_at)}</p>
        </div>
        <Badge variant="outline" className={`${getStatusColor(lead.status)}`}>{lead.status}</Badge>
        {lead.phone && (
          <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4 mr-2" />WhatsApp
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">{lead.phone}</a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a>
                </div>
              )}
              {lead.instagram && (
                <div className="flex items-center gap-2 text-sm">
                  <AtSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{lead.instagram}</span>
                </div>
              )}
              {lead.facebook && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{lead.facebook}</span>
                </div>
              )}
              {lead.country && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{lead.country}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Deal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.interested_offer && (
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{lead.interested_offer}</span>
                </div>
              )}
              {lead.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>${lead.budget}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Source:</span> {lead.lead_source || '—'}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Assigned:</span> {lead.assignee?.full_name || '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={lead.status} onValueChange={v => updateStatus(v as LeadStatus)} disabled={updatingStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." rows={3} />
                <Button size="sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>
                  {savingNote ? 'Adding...' : 'Add Note'}
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <Card key={note.id}>
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {note.author?.full_name} · {formatRelativeTime(note.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground">{a.user?.full_name} · {formatRelativeTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks for this lead</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-4 flex items-start gap-3">
                        {task.completed
                          ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          : <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
                        <div>
                          <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.assignee?.full_name} {task.due_date && `· Due ${formatDate(task.due_date)}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
