// Supabase Edge Function: send-invite
// Expects body: { email, token }
// Sends an invitation email with link `${INVITE_BASE_URL}/invite/<token>`
// Requires authenticated caller; only allows users with profiles.role = 'admin'

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const INVITE_BASE_URL = Deno.env.get('INVITE_BASE_URL') || 'https://vunderscore127.github.io/open-tuenti/'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@tu-dominio'

type InviteBody = {
  email?: string
  token?: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Missing Supabase env: SUPABASE_URL or SUPABASE_ANON_KEY' }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  })

  let payload: InviteBody
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const email = (payload.email || '').trim()
  const token = (payload.token || '').trim()
  if (!email || !token) return jsonResponse({ error: 'Missing email or token' }, 400)

  // Check caller is admin (using caller JWT with RLS)
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes?.user?.id
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileErr) return jsonResponse({ error: 'Profile check failed', detail: profileErr.message }, 401)
  if (!profile || profile.role !== 'admin') return jsonResponse({ error: 'Forbidden (admin required)' }, 403)

  // Optional: Verify invitation exists and matches email (via RPC with security definer)
  const { data: invitation, error: invErr } = await supabase.rpc('verify_invitation', { invite_token: token })
  if (invErr) return jsonResponse({ error: 'Invitation verification failed', detail: invErr.message }, 400)
  if (!invitation || invitation.status !== 'pending') return jsonResponse({ error: 'Invalid or non-pending invitation' }, 400)
  if (invitation.email && invitation.email !== email) return jsonResponse({ error: 'Invitation email mismatch' }, 400)

  const inviteUrl = `${INVITE_BASE_URL.replace(/\/$/, '')}/invite/${token}`

  // If no provider configured, return success with link so client can fallback
  if (!RESEND_API_KEY) {
    return jsonResponse({ ok: true, message: 'Email provider not configured. Share invite URL manually.', inviteUrl })
  }

  // Send email via Resend
  const sendPayload = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Tu invitación a Tuentis',
    html: `<p>Has sido invitado a Tuentis.</p><p>Para registrarte y aceptar la invitación, visita:</p><p><a href="${inviteUrl}">${inviteUrl}</a></p>`
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sendPayload)
  })

  if (!resp.ok) {
    const detail = await resp.text()
    return jsonResponse({ error: 'Email send failed', detail }, 500)
  }

  return jsonResponse({ ok: true })
})

