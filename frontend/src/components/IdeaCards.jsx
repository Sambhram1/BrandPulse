import { useState } from 'react'
import { ChevronDown, ChevronUp, Video, Hash, Lightbulb, ArrowRight, RotateCcw } from 'lucide-react'

function ViralRing({ score }) {
  const color = score >= 90 ? '#00D68F' : score >= 80 ? '#F59E0B' : '#8B5CF6'
  const glow  = score >= 90 ? '0 0 16px rgba(0,214,143,0.5)' : score >= 80 ? '0 0 16px rgba(245,158,11,0.4)' : 'none'
  const r = 26, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(${glow})`, transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="font-display text-center" style={{ fontFamily: 'Syne', zIndex: 1 }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '9px', color: '#52525B', fontFamily: 'Fira Code' }}>viral</div>
      </div>
    </div>
  )
}

function IdeaCard({ idea, index, onSelect, selected, loading }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const colors = ['var(--accent)', '#F59E0B', '#8B5CF6']
  const color  = colors[index] || 'var(--accent)'

  return (
    <div
      className="card flex flex-col transition-all duration-200"
      style={{
        cursor: 'pointer',
        border: selected ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.06)',
        boxShadow: selected ? `0 0 20px ${color}22` : 'none',
        animation: `slideUp 0.4s ease ${index * 100}ms both`,
      }}
      onClick={() => !loading && onSelect(idea)}
    >
      {/* Top color strip */}
      <div style={{ height: '3px', borderRadius: '16px 16px 0 0', background: selected
        ? `linear-gradient(90deg, ${color}, ${color}88)` : 'rgba(255,255,255,0.06)' }} />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Score + rank */}
        <div className="flex items-center gap-4">
          <ViralRing score={idea.viral_score} />
          <div>
            <div style={{ color: '#52525B', fontSize: '10px', fontFamily: 'Fira Code', letterSpacing: '0.08em' }}>
              OPTION {index + 1}
            </div>
            <div style={{ color: color, fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
              {idea.viral_score >= 90 ? '🔥 Top pick' : idea.viral_score >= 80 ? '⚡ Strong' : '✦ Solid'}
            </div>
          </div>
        </div>

        {/* Caption */}
        <p style={{ color: '#FAFAFA', fontSize: '14px', fontWeight: 500, lineHeight: '1.6', margin: 0 }}>
          {idea.caption}
        </p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5">
          {(idea.hashtags || []).map(tag => (
            <span key={tag} className="flex items-center gap-1"
              style={{ color: color, fontSize: '11px', fontFamily: 'Fira Code', opacity: 0.8 }}>
              <Hash size={9} />{tag.replace('#', '')}
            </span>
          ))}
        </div>

        {/* Rationale */}
        <div className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Lightbulb size={12} style={{ color: '#52525B', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: '#71717A', fontSize: '12px', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
            {idea.rationale}
          </p>
        </div>

        {/* Image prompt toggle */}
        <button
          className="flex items-center gap-1.5"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#52525B', width: 'fit-content' }}
          onClick={e => { e.stopPropagation(); setShowPrompt(v => !v) }}
        >
          {showPrompt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span style={{ fontSize: '11px', fontFamily: 'Fira Code' }}>
            {showPrompt ? 'hide' : 'show'} video prompt
          </span>
        </button>

        {showPrompt && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.2s ease' }}>
            <p style={{ color: '#52525B', fontSize: '11px', fontFamily: 'Fira Code', margin: 0, lineHeight: '1.7' }}>
              {idea.image_prompt}
            </p>
          </div>
        )}

        <div className="flex-1" />

        {/* Select button */}
        <button
          className="btn w-full justify-center"
          style={{
            background: selected ? `rgba(${index === 0 ? '0,214,143' : index === 1 ? '245,158,11' : '139,92,246'},0.15)` : 'rgba(255,255,255,0.05)',
            color:      selected ? color : '#A1A1AA',
            border:     `1px solid ${selected ? color + '44' : 'rgba(255,255,255,0.08)'}`,
            fontSize: '13px', fontWeight: 600,
          }}
          onClick={e => { e.stopPropagation(); !loading && onSelect(idea) }}
          disabled={loading}
        >
          {selected ? (loading ? '⏳ Submitting…' : '✓ Selected') : 'Select this idea'}
          {!selected && <ArrowRight size={13} />}
        </button>

      </div>
    </div>
  )
}

export default function IdeaCards({ brand, ideas, onSelectIdea, loading, onRegenerate, regenerating }) {
  const [selected, setSelected] = useState(null)

  function handleSelect(idea) {
    setSelected(idea)
    onSelectIdea(idea)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill pill-accent" style={{ fontSize: '10px' }}>AI GENERATED</span>
            <span className="pill pill-muted"  style={{ fontSize: '10px' }}>Groq · Llama 3.3 70B</span>
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ fontFamily: 'Syne', fontWeight: 800 }}>
            Pick your <span style={{ color: 'var(--accent)' }}>viral reel</span> concept
          </h1>
          <p style={{ color: '#71717A', fontSize: '14px', marginTop: '6px' }}>
            3 data-driven ideas for <strong style={{ color: '#FAFAFA' }}>{brand.name}</strong> — ranked by viral potential
          </p>
        </div>
        <button
          className="btn btn-ghost flex-shrink-0"
          style={{ fontSize: '12px', padding: '8px 14px' }}
          onClick={onRegenerate}
          disabled={regenerating}
        >
          <RotateCcw size={13} className={regenerating ? 'animate-spin' : ''} />
          Regenerate
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {ideas.map((idea, i) => (
          <IdeaCard
            key={i}
            idea={idea}
            index={i}
            onSelect={handleSelect}
            selected={selected === idea}
            loading={loading && selected === idea}
          />
        ))}
      </div>

      {/* Bottom hint */}
      {!selected && (
        <p className="text-center" style={{ color: '#52525B', fontSize: '12px', fontFamily: 'Fira Code' }}>
          Select an idea above → we'll generate a real 6-second Instagram Reel using fal.ai Veo3
        </p>
      )}
      {selected && loading && (
        <div className="text-center" style={{ color: 'var(--accent)', fontSize: '13px', fontFamily: 'Fira Code' }}>
          <Video size={16} style={{ display: 'inline', marginRight: '8px' }} />
          Submitting to fal.ai Veo3…
        </div>
      )}

    </div>
  )
}
