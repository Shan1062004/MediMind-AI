"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPatients(data)
        } else {
          // API returned an object (likely { error })
          setPatients([])
          setError(data?.error ? String(data.error) : "Unexpected response from /api/patients")
          console.error("/api/patients response:", data)
        }
      })
      .catch((e) => {
        setError(String(e))
        setPatients([])
      })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link href="/dashboard/patients/new" className="px-3 py-2 bg-blue-600 text-white rounded">Register Patient</Link>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <table className="w-full border">
        <thead>
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Phone</th>
            <th className="p-2 text-left">Appointment</th>
            <th className="p-2 text-left">Doctor</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.firstName} {p.lastName}</td>
              <td className="p-2">{p.phone}</td>
              <td className="p-2">{new Date(p.appointmentDate).toLocaleString()}</td>
              <td className="p-2">{p.doctor ? `${p.doctor.firstName} ${p.doctor.lastName}` : "-"}</td>
            </tr>
          ))}
          {patients.length === 0 && (
            <tr>
              <td className="p-2" colSpan={4}>No patients found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
