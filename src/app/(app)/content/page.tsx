import { createClient } from '@/lib/supabase/server'
import { ContentClient } from './content-client'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: content } = await supabase
    .from('content_tracking')
    .select('*')
    .order('created_at', { ascending: false })

  return <ContentClient initialContent={content ?? []} currentUserId={user!.id} />
}
