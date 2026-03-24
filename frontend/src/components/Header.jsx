import { useState, useEffect } from 'react'
import { Zap, RefreshCw } from 'lucide-react'

export default function Header({ onRefresh, lastUpdated, refreshing }) {
  const [tick, setTick] = useState(0)
  const [countdown, setCountdown] = useState(30)

  // Count down to next auto-refresh
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { setTick(t => t + 1); return 30 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Trigger refresh when countdown resets
  useEffect(() => { if (tick > 0) onRefresh() }, [tick])

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,214,143,0.15)', border: '1px solid rgba(0,214,143,0.3)' }}
          >
            <Zap size={14} className="text-accent" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-display font-700 text-base tracking-tight" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
            Brand<span style={{ color: 'var(--accent)' }}>Pulse</span>
          </span>
          <span
            className="pill pill-muted hidden sm:inline-flex"
            style={{ fontSize: '10px', letterSpacing: '0.08em' }}
          >
            NYKAA · LIVE
          </span>
        </div>

        {/* Center: progress bar */}
        <div className="hidden md:flex flex-col items-center gap-1 flex-1 max-w-xs mx-8">
          <div
            className="w-full h-0.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${((30 - countdown) / 30) * 100}%`,
                background: 'var(--accent)',
                transition: 'width 1s linear',
                boxShadow: '0 0 6px rgba(0,214,143,0.5)',
              }}
            />
          </div>
          <span style={{ color: '#52525B', fontSize: '10px', fontFamily: 'Fira Code' }}>
            refresh in {countdown}s
          </span>
        </div>

        {/* Right: status + refresh button */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="live-dot" />
            <span style={{ color: '#71717A', fontSize: '12px', fontFamily: 'Fira Code' }}>
              {timeStr}
            </span>
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

      </div>
    </header>
  )
}
