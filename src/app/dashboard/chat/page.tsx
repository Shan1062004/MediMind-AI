"use client"

import React, { useEffect, useRef, useState } from 'react'

type MaybeString = string | null

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
]

const SpeechPage = () => {
  const [interimText, setInterimText] = useState('')
  const [finalisedText, setFinalisedText] = useState<string[]>([])
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<MaybeString>(null)
  const [aiResponse, setAiResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  const [sessionRemaining, setSessionRemaining] = useState<number>(0)
  const [manualInput, setManualInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [language, setLanguage] = useState(LANGUAGES[0].code)

  const recognitionRef = useRef<any>(null)
  const shouldRestartRef = useRef(false)

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const startListening = () => {
    // start a session when pressing Start if none exists
    ;(async () => {
      if (!sessionId) await startSession()
    })()
    setError(null)

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) {
      setError("This browser doesn't support the Web Speech API. Try Chrome, Edge, or Safari.")
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = language
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        shouldRestartRef.current = true
        setListening(true)
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            const text = result[0].transcript.trim()
            setFinalisedText(prev => [text, ...prev])
            setInterimText('')
            sendToAI(text)
          } else {
            interim += result[0].transcript
          }
        }
        setInterimText(interim)
      }

      recognition.onerror = (ev: any) => {
        setError(ev.error || 'Recognition error')
      }

      recognition.onend = () => {
        setListening(false)
        if (shouldRestartRef.current) {
          setTimeout(() => {
            try {
              recognition.start()
            } catch (e) {
              // ignore
            }
          }, 200)
        }
      }

      recognition.start()
    } catch (err: any) {
      setError(String(err))
    }
  }

  const endSessionLocal = () => {
    // stop local session and listening immediately without calling server
    setSessionId(null)
    setSessionExpiresAt(null)
    setSessionRemaining(0)
    // stop speech recognition if running
    try { recognitionRef.current?.stop() } catch (e) { /* ignore */ }
    shouldRestartRef.current = false
    setListening(false)
  }

  const stopListening = () => {
    shouldRestartRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch (e) {
      console.error(e)
    }
    setListening(false)
  }

  const copyLatest = async () => {
    const text = finalisedText[0] || interimText || ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch (e) {
      setError('Failed to copy to clipboard')
    }
  }

  const clearAll = () => {
    setInterimText('')
    setFinalisedText([])
    setError(null)
    setAiResponse('')
  }

  const sendToAI = async (text: string) => {
    if (!text || loading) return

    setLoading(true)
    setAiResponse('')

    // Append the user's message to the local conversation
    const outgoingMessages = messages.concat({ role: 'user', content: text })
    setMessages(outgoingMessages)

    try {
      const bodyPayload: any = { messages: outgoingMessages }
      if (sessionId) bodyPayload.sessionId = sessionId

      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })
      const data = await res.json()

      if (!res.ok) {
        const err = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || JSON.stringify(data?.error ?? data)
        setError(`AI error: ${err}`)
        // on error, remove the last user message we optimistically added
        setMessages(prev => prev.slice(0, -1))
      } else {
        const output = data.output || ''
        setAiResponse(output)
        setMessages(prev => prev.concat({ role: 'assistant', content: output }))
        setManualInput('')
      }
    } catch (err) {
      setError('AI request failed')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const startSession = async () => {
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        setSessionId(data.sessionId)
        setSessionExpiresAt(data.expiresAt)
      }
    } catch (e) {
      setError('Failed to start session')
    }
  }

  const startAll = async () => {
    try {
      if (!sessionId) await startSession()
    } catch (e) {
      // ignore
    }
    if (!listening) startListening()
  }

  const endSession = async () => {
    if (!sessionId) return
    try {
      await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId }),
      })
    } catch (e) {
      // ignore
    }
    setSessionId(null)
    setSessionExpiresAt(null)
    setSessionRemaining(0)
  }

  // Session countdown
  useEffect(() => {
    if (!sessionExpiresAt) {
      setSessionRemaining(0)
      return
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((sessionExpiresAt - Date.now()) / 1000))
      setSessionRemaining(rem)
      if (rem <= 0) {
        // session expired -> stop everything locally
        endSessionLocal()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sessionExpiresAt])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = Math.floor(secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const renderAiResponse = (text: string) => {
    if (!text) return <em>—</em>

    // Split by fenced code blocks ```code```
    const parts = text.split(/```/)

    return parts.map((part, idx) => {
      // odd indexes are code blocks
      if (idx % 2 === 1) {
        return (
          <pre key={idx} style={{ background: '#0f1724', color: '#e6eef8', padding: 12, overflow: 'auto' }}>
            <code>{part.trim()}</code>
          </pre>
        )
      }

      // non-code text: split into paragraphs
      const paragraphs = part.split(/\n\n+/).map(p => p.trim()).filter(Boolean)

      return (
        <div key={idx}>
          {paragraphs.map((p, i) => {
            // detect simple bullet lists
            const lines = p.split(/\n+/).map(l => l.trim()).filter(Boolean)
            const isBullet = lines.every(l => l.startsWith('- ') || l.startsWith('* ') || /^\d+\./.test(l))

            if (isBullet && lines.length > 1) {
              const isOrdered = /^\d+\./.test(lines[0])
              return isOrdered ? (
                <ol key={i} style={{ margin: '8px 0 12px 20px' }}>
                  {lines.map((ln, k) => <li key={k}>{ln.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '')}</li>)}
                </ol>
              ) : (
                <ul key={i} style={{ margin: '8px 0 12px 20px' }}>
                  {lines.map((ln, k) => <li key={k}>{ln.replace(/^[-*]\s*/, '')}</li>)}
                </ul>
              )
            }

            // otherwise render paragraph with line breaks preserved
            return (
              <p key={i} style={{ margin: '8px 0' }}>
                {lines.map((ln, k) => (
                  <span key={k}>
                    {ln}
                    {k < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            )
          })}
        </div>
      )
    })
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1>Speech To Text — Live Demo</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={startListening} disabled={listening} style={{ padding: '8px 12px' }}>Start</button>
        <button onClick={stopListening} disabled={!listening} style={{ padding: '8px 12px' }}>Stop</button>
        <button onClick={startSession} disabled={!!sessionId} style={{ padding: '8px 12px' }}>Start 10m Session</button>
        <button onClick={endSession} disabled={!sessionId} style={{ padding: '8px 12px' }}>End Session</button>
        <button onClick={copyLatest} style={{ padding: '8px 12px' }}>Copy Latest</button>
        <button onClick={clearAll} style={{ padding: '8px 12px' }}>Clear</button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <strong>Session:</strong>
            <span style={{ marginLeft: 8 }}>{sessionId ? `${formatTime(sessionRemaining)} remaining` : 'No active session'}</span>
          </div>
          <div>
            <label style={{ marginRight: 8 }}>Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      <div style={{ marginBottom: 12 }}>
        <strong>Status:</strong>
        <span style={{ marginLeft: 8 }}>{listening ? 'Listening…' : 'Idle'}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Interim:</strong>
        <div style={{ minHeight: 36, padding: 12, background: '#fff', border: '1px solid #eee' }}>
          {interimText || <em>—</em>}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Finalised:</strong>
        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', padding: 8, background: '#fafafa' }}>
          {finalisedText.length === 0
            ? <div style={{ color: '#666' }}><em>No results yet</em></div>
            : (
              <ol>
                {finalisedText.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
              </ol>
            )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Manual Input (for testing):</strong>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="Type text here to send to the AI"
            style={{ flex: 1, minHeight: 64, padding: 8 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => sendToAI(manualInput)}
              disabled={!manualInput || loading}
              style={{ padding: '8px 12px' }}
            >Send to AI</button>
            <button onClick={() => setManualInput('')} style={{ padding: '8px 12px' }}>Clear</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>AI Response:</strong>
        <div style={{ minHeight: 60, padding: 12, background: '#eef6ff', border: '1px solid #cfe3ff' }}>
          {loading ? <em>Thinking...</em> : renderAiResponse(aiResponse)}
        </div>
      </div>

      <p style={{ color: '#666' }}>Live demo uses the browser's Web Speech API (no package required). Works best in Chrome/Edge/Safari.</p>
    </div>
  )
}

export default SpeechPage
