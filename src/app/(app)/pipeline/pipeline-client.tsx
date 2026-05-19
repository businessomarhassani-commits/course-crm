'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { Lead, LeadStatus } from '@/types'
import { toast } from 'sonner'
import { getStatusColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, DollarSign, User } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

const PIPELINE_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Follow-up', 'Closed', 'Lost']

const COLUMN_COLORS: Record<string, string> = {
  New: 'border-t-blue-500',
  Contacted: 'border-t-purple-500',
  Interested: 'border-t-yellow-500',
  'Follow-up': 'border-t-orange-500',
  Closed: 'border-t-green-500',
  Lost: 'border-t-red-500',
}

interface Props {
  initialLeads: (Lead & { assignee?: { id: string; full_name: string | null } | null })[]
  currentUserId: string
  currentUserRole: string
}

function DraggableCard({ lead }: { lead: Lead & { assignee?: { id: string; full_name: string | null } | null } }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none ${isDragging ? 'opacity-40' : ''}`}
    >
      <LeadCard lead={lead} />
    </div>
  )
}

function LeadCard({ lead }: { lead: Lead & { assignee?: { id: string; full_name: string | null } | null } }) {
  return (
    <Card className="mb-2 cursor-grab active:cursor-grabbing hover:border-border/80 transition-colors group">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm font-medium hover:text-primary transition-colors leading-tight"
            onClick={e => e.stopPropagation()}
          >
            {lead.full_name}
          </Link>
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-shrink-0"
            >
              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-400">
                <MessageCircle className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
        </div>
        {lead.interested_offer && (
          <p className="text-xs text-muted-foreground mb-1 truncate">{lead.interested_offer}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {lead.budget && (
              <span className="flex items-center gap-0.5 text-xs text-green-400">
                <DollarSign className="w-3 h-3" />{lead.budget}
              </span>
            )}
            {lead.assignee && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <User className="w-3 h-3" />{lead.assignee.full_name?.split(' ')[0]}
              </span>
            )}
          </div>
          {lead.country && <span className="text-xs text-muted-foreground">{lead.country}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function DroppableColumn({ status, leads }: { status: LeadStatus; leads: (Lead & { assignee?: { id: string; full_name: string | null } | null })[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const colorClass = COLUMN_COLORS[status]

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      <div className={`rounded-t-lg border border-b-0 border-border bg-card px-3 py-2.5 flex items-center justify-between border-t-2 ${colorClass}`}>
        <span className="text-sm font-semibold">{status}</span>
        <Badge variant="outline" className="text-xs px-1.5 py-0">{leads.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] rounded-b-lg border border-border bg-muted/20 p-2 transition-colors ${isOver ? 'bg-primary/5 border-primary/30' : ''}`}
      >
        {leads.length === 0 && (
          <div className={`h-20 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed rounded-md transition-colors ${isOver ? 'border-primary/40 text-primary' : 'border-border'}`}>
            Drop here
          </div>
        )}
        {leads.map(lead => (
          <DraggableCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  )
}

export function PipelineClient({ initialLeads, currentUserId, currentUserRole }: Props) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const groupedLeads = PIPELINE_STATUSES.reduce((acc, status) => {
    acc[status] = leads.filter(l => l.status === status)
    return acc
  }, {} as Record<LeadStatus, typeof leads>)

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return
    const leadId = active.id as string
    const newStatus = over.id as LeadStatus

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) return
    if (!PIPELINE_STATUSES.includes(newStatus)) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
    if (error) {
      toast.error(error.message)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: lead.status } : l))
    } else {
      await supabase.from('activities').insert({ type: 'status_changed', description: `Status changed to ${newStatus}`, user_id: currentUserId, lead_id: leadId })
      toast.success(`${t.pipeline.statusUpdated} ${newStatus}`)
    }
  }

  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.pipeline.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.pipeline.subtitle} · {leads.length} leads</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {PIPELINE_STATUSES.map(status => (
              <DroppableColumn
                key={status}
                status={status}
                leads={groupedLeads[status] ?? []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && <LeadCard lead={activeLead} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
