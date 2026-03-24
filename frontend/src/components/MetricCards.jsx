import { TrendingUp, Crosshair, Sparkles, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function AnimatedNumber({ value }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const target = Number(value) || 0
    const start = displayed
    const duration = 800
    const startTime = performance.now()

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(start + (target - start) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <span>{displayed}</span>
}

const CARDS = [
  {
    key: 'trending',
    label: 'Trending Topics',
    icon: TrendingUp,
    color: 'var(--accent)',
    dimColor: 'rgba(0,214,143,0.08)',
    borderColor: 'rgba(0,214,143,0.15)',
    desc: 'hashtags tracked live',
  },
  {
    key: 'gaps',
    label: 'Competitor Gaps',
    icon: Crosshair,
    color: '#F59E0B',
    dimColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.15)',
    desc: 'territories uncontested',
  },
  {
    key: 'suggestions',
    label: 'AI Suggestions',
    icon: Sparkles,
    color: '#8B5CF6',
    dimColor: 'rgba(139,92,246,0.08)',
    borderColor: 'rgba(139,92,246,0.15)',
    desc: 'pending review',
  },
  {
    key: 'videos',
    label: 'Videos Generated',
    icon: Video,
    color: '#F04747',
    dimColor: 'rgba(240,71,71,0.08)',
    borderColor: 'rgba(240,71,71,0.15)',
    desc: 'reels ready to post',
  },
]

export default function MetricCards({ metrics }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {CARDS.map(({ key, label, icon: Icon, color, dimColor, borderColor, desc }) => (
        <div
          key={key}
          className="card p-5 flex flex-col gap-3"
          style={{ animationDelay: `${CARDS.findIndex(c => c.key === key) * 60}ms` }}
        >
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: dimColor, border: `1px solid ${borderColor}` }}
          >
            <Icon size={17} style={{ color }} />
          </div>

          {/* Number */}
          <div>
            <div
              className="font-display text-3xl font-bold leading-none mb-1"
              style={{ fontFamily: 'Syne', color, fontWeight: 800 }}
            >
              <AnimatedNumber value={metrics?.[key] ?? 0} />
            </div>
            <div style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 500 }}>
              {label}
            </div>
            <div style={{ color: '#52525B', fontSize: '11px', marginTop: '2px' }}>
              {desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
