"use client"

import { useEffect, useState } from "react"

export default function NewDoctor() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    specialty: "",
  })

  const [clinicId, setClinicId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((c) => {
        if (Array.isArray(c) && c.length) setClinicId(c[0].id)
      })
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()

    await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        age: Number(form.age),
        clinicId: clinicId,
      }),
    })

    setForm({ firstName: "", lastName: "", age: "", specialty: "" })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <input
        placeholder="First Name"
        value={form.firstName}
        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        className="border p-2 w-full"
      />
      <input
        placeholder="Last Name"
        value={form.lastName}
        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        className="border p-2 w-full"
      />
      <input
        placeholder="Age"
        type="number"
        value={form.age}
        onChange={(e) => setForm({ ...form, age: e.target.value })}
        className="border p-2 w-full"
      />
      <input
        placeholder="Specialty"
        value={form.specialty}
        onChange={(e) => setForm({ ...form, specialty: e.target.value })}
        className="border p-2 w-full"
      />

      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Add Doctor
      </button>
    </form>
  )
}
