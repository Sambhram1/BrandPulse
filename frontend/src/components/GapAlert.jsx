import { AlertTriangle, ArrowRight } from 'lucide-react'

export default function GapAlert({ gap }) {
  if (!gap) return null

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl mb-6"
      style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderLeft: '3px solid #F59E0B',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        >
          <AlertTriangle size={15} style={{ color: '#F59E0B' }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700, fontFamily: 'Fira Code', letterSpacing: '0.06em' }}>
              COMPETITOR GAP
            </span>
            <span className="pill pill-amber" style={{ fontSize: '10px' }}>
              {gap.dominance}% captured
            </span>
          </div>
          <p style={{ color: '#D4A853', fontSize: '13px', margin: 0, marginTop: '2px' }}>
            <strong style={{ color: '#F5C569' }}>{gap.competitor}</strong> dominating{' '}
            <strong style={{ color: '#F5C569', fontFamily: 'Fira Code' }}>{gap.hashtag}</strong>
            {' '}— Nykaa has 0 posts. Targeting now.
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5 pill pill-amber">
        <span>Act now</span>
        <ArrowRight size={11} />
      </div>
    </div>
  )
}
