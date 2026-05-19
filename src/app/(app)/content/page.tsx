import { createClient } from '@/lib/supabase/server'
import { ContentClient } from './content-client'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: content }, { data: leadsWithCreative }] = await Promise.all([
    supabase.from('content_tracking').select('*').order('created_at', { ascending: false }),
    supabase.from('leads').select('ad_creative_id').not('ad_creative_id', 'is', null),
  ])

  const leadCounts: Record<string, number> = {}
  leadsWithCreative?.forEach(l => {
    if (l.ad_creative_id) leadCounts[l.ad_creative_id] = (leadCounts[l.ad_creative_id] || 0) + 1
  })

  return <ContentClient initialContent={content ?? []} leadCounts={leadCounts} currentUserId={user!.id} />
}
