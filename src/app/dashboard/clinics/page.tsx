"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data) => setClinics(data || []))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clinics</h1>

      <div className="space-y-3">
        {clinics.map((c) => (
          <Link key={c.id} href={`/dashboard/clinics/${c.id}`} className="block p-4 border rounded hover:shadow">
            <div className="font-semibold">{c.name}</div>
            {c.address && <div className="text-sm text-muted-foreground">{c.address}</div>}
          </Link>
        ))}
        {clinics.length === 0 && <div>No clinics found.</div>}
      </div>
    </div>
  )
}
