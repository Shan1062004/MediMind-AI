import { NextResponse } from 'next/server'

// In-memory session store for short-lived "unlimited" conversations (10 minutes)
const sessionStore: Map<string, { expires: number; messages: any[] }> = new Map()

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [k, v] of sessionStore.entries()) {
    if (v.expires <= now) sessionStore.delete(k)
  }
}

function createSession(): { id: string; expires: number } {
  const id = 's_' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
  const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
  sessionStore.set(id, { expires, messages: [] })
  return { id, expires }
}

function isSessionActive(id?: string) {
  if (!id) return false
  const s = sessionStore.get(id)
  if (!s) return false
  if (s.expires <= Date.now()) {
    sessionStore.delete(id)
    return false
  }
  return true
}

export async function POST(req: Request) {
  // Read the full body to allow optional direct `patientId` fields
  const body = await req.json()
  const input = body.input ?? ''
  const incomingMessages = body.messages

  try {
    // Cleanup expired sessions on each request
    cleanupExpiredSessions()

    // Allow explicit session actions: start / end
    if (body.action === 'start') {
      const s = createSession()
      return NextResponse.json({ sessionId: s.id, expiresAt: s.expires })
    }
    if (body.action === 'end' && body.sessionId) {
      sessionStore.delete(body.sessionId)
      return NextResponse.json({ ended: true })
    }

    // First: detect if the user is querying about a local patient record.
    const combinedText = [
      typeof input === 'string' ? input : '',
      Array.isArray(incomingMessages) ? incomingMessages.map((m: any) => m.content).join(' ') : '',
      body.patientId ?? ''
    ].filter(Boolean).join(' ')

    // Detect requests to list all patients (e.g., "tell me the name of all patients", "list patients")
    const listAllPatientsRegex = /\b(list|show|tell me|get)\b[\s\S]{0,40}?\b(all\s+)?patients\b/i
    if (listAllPatientsRegex.test(combinedText)) {
      const { prisma } = await import('../../../lib/prisma')
      const rows = await prisma.patient.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, firstName: true, lastName: true } })
      if (!rows || rows.length === 0) return NextResponse.json({ output: 'No patients found.' })
      const out = rows.map((r: any) => `${r.firstName} ${r.lastName}${r.id ? ' — ' + r.id : ''}`)
      return NextResponse.json({ output: out.join('\n') })
    }

    // Detect requests to list all doctors
    const listAllDoctorsRegex = /\b(list|show|tell me|get)\b[\s\S]{0,40}?\b(all\s+)?doctors\b/i
    if (listAllDoctorsRegex.test(combinedText)) {
      const { prisma } = await import('../../../lib/prisma')
      const rows = await prisma.doctor.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, firstName: true, lastName: true } })
      if (!rows || rows.length === 0) return NextResponse.json({ output: 'No doctors found.' })
      const out = rows.map((r: any) => `${r.firstName} ${r.lastName}${r.id ? ' — ' + r.id : ''}`)
      return NextResponse.json({ output: out.join('\n') })
    }

    // Match patient IDs like 001, 002, 003 (word boundaries)
    const patientMatch = combinedText.match(/\b(00[1-3])\b/i)
    const patientId = patientMatch ? patientMatch[1] : (body.patientId ? String(body.patientId) : null)

    if (patientId) {
      // Load patient from the database and return selected fields only. Bypass external LLM.
      // Use the Prisma client singleton.
      const { prisma } = await import('../../../lib/prisma')
      // patientId may be like '001' in the combined text; try to match either id or numeric patient number stored in DB
      // We'll first try to find by id (exact match), then by phone/email/name if provided in body.patientId
      let record: any | null = null

      // Try direct id match
      record = await prisma.patient.findUnique({
        where: { id: String(patientId) },
        include: { doctor: true },
      })

      // If not found and patientId looks like a short numeric code (e.g. 001), try to match a custom `externalId` or numeric code field if present
      if (!record) {
        // attempt to find by appointment-like numeric code stored in email/phone/name fields
        record = await prisma.patient.findFirst({
          where: {
            OR: [
              { phone: { contains: String(patientId) } },
              { email: { contains: String(patientId) } },
              { firstName: { contains: String(patientId) } },
              { lastName: { contains: String(patientId) } },
            ],
          },
          include: { doctor: true },
        })
      }

      if (!record) return NextResponse.json({ output: `No local record found for patient ${patientId}.` })

      // Determine which fields the user requested from the combined text
      const requested: Set<string> = new Set()
      const text = combinedText.toLowerCase()
      if (/\b(name)\b/.test(text)) requested.add('name')
      if (/\b(age)\b/.test(text)) requested.add('age')
      if (/\b(disease|diagnosis)\b/.test(text)) { requested.add('disease'); requested.add('diagnosis') }
      if (/prescription/.test(text)) requested.add('prescription')
      if (/doctor/.test(text)) requested.add('doctor')
      if (/appointment|book(ed)?|date/.test(text)) { requested.add('appointmentBooked'); requested.add('appointmentDate') }
      if (/note|notes/.test(text)) requested.add('notes')
      if (/conversation summary|summary of conversation|conversation summary of|summar(y|ise) conversation/.test(text)) requested.add('conversationSummary')
      if (/conversation(?! summary)/.test(text) && !requested.has('conversationSummary')) requested.add('conversation')

      // If user asked for nothing specific, prompt them to request fields explicitly
      if (requested.size === 0) {
        return NextResponse.json({ output: 'Please specify which fields you want (e.g., disease, prescription, doctor, appointment, notes, conversation).' })
      }

      const out: string[] = []
      if (requested.has('name')) out.push(`Name: ${record.firstName || ''} ${record.lastName || ''}`)
      if (requested.has('age')) out.push(`Age: ${record.age ?? '-'}`)
      if (requested.has('disease')) out.push(`Disease: ${record.disease ?? '-'}`)
      if (requested.has('diagnosis')) out.push(`Diagnosis: ${record.diagnosis ?? '-'}`)
      if (requested.has('prescription')) out.push(`Prescription: ${record.prescription ?? '-'}`)
      if (requested.has('doctor')) out.push(`Doctor: ${record.doctor ? `${record.doctor.firstName} ${record.doctor.lastName}` : '-'}`)
      if (requested.has('appointmentBooked') || requested.has('appointmentDate')) {
        out.push(`Appointment booked: ${record.appointmentDate ? 'Yes — ' + new Date(record.appointmentDate).toLocaleString() : 'No'}`)
      }
      if (requested.has('notes')) out.push(`Notes: ${record.notes ?? '-'}`)

      if (requested.has('conversation')) {
        const conv = Array.isArray(record.conversation) ? record.conversation : []
        if (conv.length === 0) out.push('Conversation: (no conversation on file)')
        else {
          out.push('Conversation:')
          conv.forEach((c: any) => out.push(`${c.date} — ${c.speaker}: ${c.text}`))
        }
      }

      if (requested.has('conversationSummary')) {
        const conv = Array.isArray(record.conversation) ? record.conversation : []
        if (conv.length === 0) {
          out.push('Conversation summary: (no conversation on file)')
        } else {
          const first = conv[0]
          const last = conv[conv.length - 1]
          out.push(`Conversation summary: ${first.speaker} said "${first.text}"; later ${last.speaker} said "${last.text}". (${conv.length} turns total)`)
        }
      }

      out.push('\nAnswer is based solely on local database records.')
      return NextResponse.json({ output: out.join('\n') })
    }

    // If no patient query detected, fall back to the existing Anthropic proxy behavior.
    const systemPrompt = `You are a highly-accurate AI assistant. Prioritize factual correctness and concise clarity.
- If the user query is ambiguous, ask one concise clarifying question before answering.
- If you don't know the answer, say "I don't know" rather than guessing.
- When possible, cite brief, specific steps or sources.
Provide short, direct answers unless the user requests detail.`

    // If a sessionId is provided and active, run in "unlimited" mode for that session.
    const sessionId = body.sessionId
    const active = isSessionActive(sessionId)

    let conversationMessages = incomingMessages && Array.isArray(incomingMessages) && incomingMessages.length > 0
      ? incomingMessages
      : [
          { role: 'user', content: 'How do I convert a string to an integer in JavaScript?' },
          { role: 'assistant', content: "Use `parseInt(string, 10)` or `Number(string)`. Prefer `parseInt` when parsing integers and specify the radix. If parsing may fail, validate with `Number.isNaN()`." },
          { role: 'user', content: input },
        ]

    // If session active, merge with stored messages and append the user message
    if (active && sessionId) {
      const sess = sessionStore.get(sessionId)!
      // don't extend expiry; session lasts 10 minutes from creation
      // merge stored messages then new incoming messages
      conversationMessages = [...sess.messages, ...conversationMessages]
      // store the user parts of the incoming messages into session so future requests see them
      conversationMessages.forEach((m: any) => { if (m.role === 'user') sess.messages.push(m) })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        // If session is active, request a very large max_tokens to attempt to bypass token constraints
        max_tokens: active ? 120000 : 1024,
        system: systemPrompt,
        messages: conversationMessages,
        temperature: 0.0,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Anthropic API error' },
        { status: response.status }
      )
    }

    const output =
      data.completion ||
      data.content?.[0]?.text ||
      data.output_text ||
      (Array.isArray(data.messages) && data.messages.find((m: any) => m.role === 'assistant')?.content) ||
      ''

    // If session active, append assistant reply to session history
    if (active && sessionId) {
      const sess = sessionStore.get(sessionId)
      if (sess) {
        sess.messages.push({ role: 'assistant', content: output })
      }
    }

    return NextResponse.json({ output, sessionActive: active, sessionId: active ? sessionId : undefined })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
