"use client"

import { useEffect, useState } from "react"

export default function NewPatient() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    appointmentDate: "",
    doctorId: "",
  })

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => setDoctors(data || []))
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()

    await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
      }),
    })

    setForm({ firstName: "", lastName: "", phone: "", email: "", appointmentDate: "", doctorId: "" })
    alert("Patient registered")
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Register Patient</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input className="w-full border p-2" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <input className="w-full border p-2" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <input className="w-full border p-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="w-full border p-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full border p-2" type="datetime-local" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />

        <select className="w-full border p-2" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
          <option value="">Select doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{`${d.firstName} ${d.lastName} — ${d.specialty}`}</option>
          ))}
        </select>

        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Register</button>
      </form>
    </div>
  )
}
