/**
 * Edge Function: push-subscribe
 *
 * Saves a push subscription for the authenticated user.
 * Called by the frontend after obtaining a PushSubscription.
 *
 * Runtime: Deno (Supabase Edge Functions)
 */

import { createClient } from 'jsr:@supabase/supabase-js@^2'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Auth: verify JWT ───────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { endpoint?: string; p256dh?: string; auth?: string; device_label?: string }
  try {
    body = await req.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { endpoint, p256dh, auth: authKey, device_label } = body

  if (!endpoint || !p256dh || !authKey) {
    return new Response(JSON.stringify({ error: 'Missing required subscription fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Basic endpoint validation
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:') throw new Error('Endpoint must be HTTPS')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid endpoint URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Upsert subscription ────────────────────────────────────────────────────
  const { error: upsertError } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth: authKey,
        device_label: device_label ?? null,
        revoked_at: null,  // clear revocation if re-subscribing same endpoint
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  if (upsertError) {
    console.error('[push-subscribe] Upsert error:', upsertError.message)
    return new Response(JSON.stringify({ error: 'Failed to save subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
