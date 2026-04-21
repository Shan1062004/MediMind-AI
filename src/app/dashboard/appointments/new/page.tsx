"use client"

import { useEffect, useState } from "react"

export default function NewAppointmentPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [appointmentDate, setAppointmentDate] = useState<string>("")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // only show patients who already have at least one appointment
          const withAppt = data.filter((p) => p.appointmentDate)
          setPatients(withAppt)
        } else {
          setPatients([])
        }
      })
      .catch(() => setPatients([]))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !appointmentDate) {
      setMessage("Select a patient and a date.")
      return
    }

    const existing = patients.find((p) => p.id === selectedId)
    if (!existing) {
      setMessage("Selected patient not found.")
      return
    }

    setLoading(true)
    setMessage(null)

    // create a new appointment by creating a new patient record copying contact info
    const payload = {
      firstName: existing.firstName,
      lastName: existing.lastName,
      phone: existing.phone,
      email: existing.email,
      doctorId: existing.doctorId ?? existing.doctor?.id ?? null,
      appointmentDate,
    }

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage("Appointment created successfully.")
        // clear date and optionally add to list
        setAppointmentDate("")
      } else {
        setMessage(data?.error || "Failed to create appointment.")
      }
    } catch (e) {
      setMessage(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">New Appointment for Existing Patient</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Select patient (existing)</label>
          <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value || null)} className="w-full border p-2 rounded">
            <option value="">— pick a patient —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.appointmentDate ? new Date(p.appointmentDate).toLocaleString() : 'no date'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New appointment date & time</label>
          <input type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-full border p-2 rounded" />
        </div>

        <div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Create Appointment'}</button>
        </div>

        {message && <div className="text-sm text-gray-700">{message}</div>}
      </form>
    </div>
  )
}
