'use client'

import { useEffect } from 'react'

export default function CronPinger() {
  useEffect(() => {
    // Ping inmediatamente al cargar
    fetch('/api/cron-processor', { cache: 'no-store' }).catch(e => console.error("CronPinger error:", e))

    // Luego cada 60 segundos
    const interval = setInterval(() => {
      fetch('/api/cron-processor', { cache: 'no-store' }).catch(e => console.error("CronPinger error:", e))
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return null
}
