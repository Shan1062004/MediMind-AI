"use client"

import { useEffect, useMemo, useState } from "react"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

export default function CalendarPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState<Date | Date[]>(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string>("")

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPatients(data)
        else setError(data?.error ? String(data.error) : "Failed to load appointments")
      })
      .catch((e) => setError(String(e)))
  }, [])

  function toLocalKey(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const p of patients) {
      if (!p.appointmentDate) continue

      // If a patient identity filter is set, only include matching records.
      if (selectedPatientId) {
        if (!p.id || p.id !== selectedPatientId) continue
      }

      const d = new Date(p.appointmentDate)
      const key = toLocalKey(d)
      map[key] = map[key] || []
      map[key].push(p)
    }
    return map
  }, [patients, selectedPatientId])

  function tileContent({ date, view }: { date: Date; view: string }) {
    if (view !== "month") return null
    const key = toLocalKey(date)
    const appts = grouped[key] || []
    if (appts.length === 0) return null

    // when a patient filter is active, color dots by past/future relative to today
    const todayKey = toLocalKey(new Date())
    return (
      <div className="mt-1 flex justify-center gap-1">
        {Array.from({ length: Math.min(3, appts.length) }).map((_, i) => {
          const isPast = key < todayKey
          const cls = selectedPatientId ? (isPast ? "bg-gray-400" : "bg-green-600") : "bg-blue-600"
          return <span key={i} className={`h-2 w-2 rounded-full ${cls} block`} />
        })}
      </div>
    )
  }

  function onClickDay(date: Date) {
    const key = toLocalKey(date)
    setSelectedDay(key)
    setValue(date)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="mb-4 max-w-md">
        <label className="block text-sm font-medium mb-1">Filter by patient</label>
        <div className="flex gap-2">
          <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="flex-1 border p-2 rounded">
            <option value="">All patients</option>
            {patients
              .filter((p) => p.id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.email ?? p.phone ?? p.id}</option>
              ))}
          </select>
          <button className="px-3 py-2 border rounded" onClick={() => setSelectedPatientId("")}>Clear</button>
        </div>
      </div>

      <div className="max-w-md">
        <Calendar onChange={setValue} value={value} tileContent={tileContent} onClickDay={onClickDay} />
      </div>

      <div className="mt-6">
        {selectedDay ? (
          <div>
            <h2 className="text-lg font-semibold mb-2">Appointments on {selectedDay}</h2>
            <ul className="space-y-2">
              {(grouped[selectedDay] || []).map((a: any) => {
                // construct local start-of-day for the selected date
                const [sy, sm, sd] = selectedDay.split("-").map((n) => Number(n))
                const selectedDateStart = new Date(sy, sm - 1, sd, 0, 0, 0)

                // Restrict history to the same patient identity.
                // Prefer stable identity: email -> phone -> exact name. Fall back to id (same record) only as last resort.
                let history: any[] = []
                if (a.email) {
                  history = patients.filter((p) => p.email && p.email === a.email && p.appointmentDate)
                } else if (a.phone) {
                  history = patients.filter((p) => p.phone && p.phone === a.phone && p.appointmentDate)
                } else if (a.firstName && a.lastName) {
                  history = patients.filter((p) => p.firstName === a.firstName && p.lastName === a.lastName && p.appointmentDate)
                } else if (a.id) {
                  // last-resort: will only match the same appointment record
                  history = patients.filter((p) => p.id === a.id && p.appointmentDate)
                }

                const withWhen = history.map((h) => ({ ...h, when: new Date(h.appointmentDate) }))

                // If the clicked appointment has a doctor, restrict prior appointments to the same doctor.
                const matchDoctor = (h: any) => {
                  if (a.doctor && a.doctor.id) {
                    return !!(h.doctor && h.doctor.id && h.doctor.id === a.doctor.id)
                  }
                  return true
                }

                const past = withWhen
                  .filter((h) => h.when.getTime() < selectedDateStart.getTime() && matchDoctor(h))
                  .sort((x, y) => y.when.getTime() - x.when.getTime())

                const future = withWhen
                  .filter((h) => h.when.getTime() >= selectedDateStart.getTime() && matchDoctor(h))
                  .sort((x, y) => x.when.getTime() - y.when.getTime())

                return (
                  <li key={a.id} className="p-3 border rounded">
                    <div className="font-semibold">{a.firstName} {a.lastName}</div>
                    <div className="text-sm text-gray-600">{new Date(a.appointmentDate).toLocaleString()}</div>
                    <div className="text-sm">Doctor: {a.doctor ? `${a.doctor.firstName} ${a.doctor.lastName}` : "-"}</div>
                    <div className="text-sm">Phone: {a.phone ?? "-"}</div>

                    {past.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-sm">Past appointments</div>
                        <ul className="mt-1 space-y-1">
                          {past.map((h: any) => (
                            <li key={h.id + String(h.when)} className="text-sm text-gray-700">
                              <span className="font-medium">{h.when.toLocaleString()}</span>
                              {h.doctor ? ` — ${h.doctor.firstName} ${h.doctor.lastName}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {future.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-sm">Other appointments</div>
                        <ul className="mt-1 space-y-1">
                          {future.map((h: any) => (
                            <li key={h.id + String(h.when)} className="text-sm text-gray-700">
                              <span className="font-medium">{h.when.toLocaleString()}</span>
                              {h.doctor ? ` — ${h.doctor.firstName} ${h.doctor.lastName}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                )
              })}
              {(!grouped[selectedDay] || grouped[selectedDay].length === 0) && <div>No appointments.</div>}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-gray-600 mt-4">Select a day to view appointments.</div>
        )}
      </div>
    </div>
  )
}
