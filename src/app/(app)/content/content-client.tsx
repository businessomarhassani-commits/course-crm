'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentTracking } from '@/types'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Star, Search, Trophy, Users } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const PLATFORMS = ['Instagram', 'Facebook', 'YouTube', 'TikTok', 'Google Ads', 'Email', 'Other']

interface Props {
  initialContent: ContentTracking[]
  leadCounts: Record<string, number>
  currentUserId: string
}

const emptyForm = { name: '', platform: '', ctr: '', cpl: '', roas: '', notes: '', is_winner: false }

export function ContentClient({ initialContent, leadCounts, currentUserId }: Props) {
  const supabase = createClient()
  const { t } = useLanguage()
  const [content, setContent] = useState(initialContent)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterWinner, setFilterWinner] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ContentTracking | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => content.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
    if (filterWinner && !c.is_winner) return false
    return true
  }), [content, search, filterPlatform, filterWinner])

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: ContentTracking) => {
    setEditItem(item)
    setForm({
      name: item.name, platform: item.platform ?? '',
      ctr: item.ctr?.toString() ?? '', cpl: item.cpl?.toString() ?? '',
      roas: item.roas?.toString() ?? '', notes: item.notes ?? '',
      is_winner: item.is_winner,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t.content.nameRequired); return }
    setSaving(true)
    const payload = {
      ...form,
      ctr: form.ctr ? parseFloat(form.ctr) : null,
      cpl: form.cpl ? parseFloat(form.cpl) : null,
      roas: form.roas ? parseFloat(form.roas) : null,
      platform: form.platform || null,
      created_by: currentUserId,
    }

    if (editItem) {
      const { data, error } = await supabase.from('content_tracking').update(payload).eq('id', editItem.id).select().single()
      if (error) { toast.error(error.message) } else {
        setContent(prev => prev.map(c => c.id === editItem.id ? data : c))
        toast.success(t.content.updated)
        setModalOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('content_tracking').insert(payload).select().single()
      if (error) { toast.error(error.message) } else {
        setContent(prev => [data, ...prev])
        toast.success(t.content.creativeAdded)
        setModalOpen(false)
      }
    }
    setSaving(false)
  }

  const toggleWinner = async (id: string, current: boolean) => {
    const { error } = await supabase.from('content_tracking').update({ is_winner: !current }).eq('id', id)
    if (error) { toast.error(error.message) } else {
      setContent(prev => prev.map(c => c.id === id ? { ...c, is_winner: !current } : c))
      toast.success(current ? t.content.removedFromWinners : t.content.markedAsWinner)
    }
  }

  const avgROAS = filtered.filter(c => c.roas).length
    ? (filtered.reduce((sum, c) => sum + (c.roas ?? 0), 0) / filtered.filter(c => c.roas).length).toFixed(1)
    : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.content.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} {t.content.creatives} · {t.content.avgROAS}: {avgROAS}x</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />{t.content.addCreative}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.content.searchCreatives} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterPlatform} onValueChange={v => setFilterPlatform(v ?? 'all')}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder={t.content.platform} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.content.allPlatforms}</SelectItem>
            {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={filterWinner ? 'default' : 'outline'} size="sm" onClick={() => setFilterWinner(!filterWinner)} className="h-9">
          <Trophy className="w-4 h-4 mr-2" />{t.content.winnersOnly}
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.content.noCreatives}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className={`cursor-pointer hover:border-border/80 transition-all ${item.is_winner ? 'border-yellow-500/50' : ''}`} onClick={() => openEdit(item)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.is_winner && <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                      <p className="font-medium truncate">{item.name}</p>
                    </div>
                    {item.platform && (
                      <Badge variant="outline" className="text-xs mt-1">{item.platform}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={e => { e.stopPropagation(); toggleWinner(item.id, item.is_winner) }}
                  >
                    <Star className={`w-4 h-4 ${item.is_winner ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-2 py-3 border-y border-border">
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-400">{item.ctr != null ? `${item.ctr}%` : '—'}</p>
                    <p className="text-xs text-muted-foreground">{t.content.ctr}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-orange-400">{item.cpl != null ? `$${item.cpl}` : '—'}</p>
                    <p className="text-xs text-muted-foreground">{t.content.cpl}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-400">{item.roas != null ? `${item.roas}x` : '—'}</p>
                    <p className="text-xs text-muted-foreground">{t.content.roas}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-purple-400 flex items-center justify-center gap-0.5">
                      <Users className="w-3 h-3" />{leadCounts[item.id] ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.content.leadsGenerated}</p>
                  </div>
                </div>

                {item.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{item.notes}</p>}
                <p className="text-xs text-muted-foreground mt-2">{formatDate(item.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? t.content.editCreative : t.content.addCreative}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>{t.content.nameStar}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VSL v3 - Instagram" />
            </div>
            <div className="space-y-2">
              <Label>{t.content.platform}</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder={t.content.selectPlatform} /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.content.ctr}</Label>
              <Input value={form.ctr} onChange={e => setForm(f => ({ ...f, ctr: e.target.value }))} placeholder="3.2" type="number" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>{t.content.cpl}</Label>
              <Input value={form.cpl} onChange={e => setForm(f => ({ ...f, cpl: e.target.value }))} placeholder="12.50" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>{t.content.roas}</Label>
              <Input value={form.roas} onChange={e => setForm(f => ({ ...f, roas: e.target.value }))} placeholder="4.2" type="number" step="0.1" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>{t.content.notes}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t.content.performanceNotes} rows={2} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="winner"
                checked={form.is_winner}
                onChange={e => setForm(f => ({ ...f, is_winner: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="winner" className="cursor-pointer">{t.content.markWinner}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t.content.saving : editItem ? t.content.updateBtn : t.content.addCreativeBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
