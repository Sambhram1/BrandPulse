import { useState } from 'react'
import {
  CheckCircle2, XCircle, Wand2, ChevronDown, ChevronUp,
  Play, Loader2, Hash, Lightbulb, Send,
} from 'lucide-react'
import { api } from '../api.js'

const REJECT_REASONS = ['Wrong tone', 'Off-brand', 'Bad timing', 'Too generic', 'Other']

function StatusBadge({ status }) {
  const map = {
    pending:     { label: 'Pending review',    cls: 'pill-muted' },
    approved:    { label: 'Approved',          cls: 'pill-accent' },
    video_ready: { label: 'Video ready',       cls: 'pill-accent' },
    rejected:    { label: 'Rejected',          cls: 'pill-danger' },
  }
  const { label, cls } = map[status] || map.pending
  return <span className={`pill ${cls}`}>{label}</span>
}

function ViralScore({ score }) {
  const color = score >= 90 ? '#00D68F' : score >= 80 ? '#F59E0B' : '#A1A1AA'
  const glow   = score >= 90 ? '0 0 12px rgba(0,214,143,0.4)' : 'none'
  return (
    <div
      className="font-display flex items-baseline gap-1"
      style={{ fontFamily: 'Syne' }}
    >
      <span style={{ fontSize: '38px', fontWeight: 800, color, lineHeight: 1, textShadow: glow }}>
        {score}
      </span>
      <span style={{ color: '#52525B', fontSize: '12px', fontFamily: 'Fira Code' }}>/100</span>
    </div>
  )
}

export default function SuggestionCard({ suggestion, index, onAction }) {
  const [state, setState]     = useState(suggestion.status || 'pending')
  const [videoUrl, setVideo]  = useState(suggestion.video_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [msg, setMsg]         = useState(null)

  const [showPrompt,  setShowPrompt]  = useState(false)
  const [showTweak,   setShowTweak]   = useState(false)
  const [showReject,  setShowReject]  = useState(false)
  const [tweakText,   setTweakText]   = useState(suggestion.caption)
  const [rejectReason, setRejectReason] = useState('')

  const sid = suggestion.suggestion_id

  async function handleApprove() {
    setLoading(true)
    setError(null)
    setState('approved')
    setMsg('Generating your video…')
    try {
      const res = await api.approve(sid)
      setState('video_ready')
      setVideo(res.video_url)
      setMsg(null)
      onAction?.()
    } catch (e) {
      setError(e.message)
      setState('pending')
      setMsg(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason) { setError('Please select a reason.'); return }
    setLoading(true)
    setError(null)
    try {
      await api.reject(sid, rejectReason)
      setState('rejected')
      setShowReject(false)
      setMsg(`Rejected: ${rejectReason}`)
      onAction?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setLoading(true)
    setError(null)
    try {
      await api.regenerate(tweakText)
      setMsg('New suggestions generating — refresh in 30s.')
      setShowTweak(false)
      onAction?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isRejected    = state === 'rejected'
  const isVideoReady  = state === 'video_ready'
  const isApproving   = state === 'approved' && loading
  const isPending     = state === 'pending'
  const isApproved    = state === 'approved' && !loading

  return (
    <div
      className="card flex flex-col"
      style={{
        animationDelay: `${index * 80}ms`,
        animation: 'slideUp 0.4s ease forwards',
        opacity: isRejected ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Top accent line based on viral score */}
      <div
        style={{
          height: '3px',
          borderRadius: '16px 16px 0 0',
          background: suggestion.viral_score >= 90
            ? 'linear-gradient(90deg, var(--accent), #00B377)'
            : suggestion.viral_score >= 80
              ? 'linear-gradient(90deg, #F59E0B, #D97706)'
              : 'rgba(255,255,255,0.08)',
        }}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <ViralScore score={suggestion.viral_score} />
          <StatusBadge status={state} />
        </div>

        {/* Caption */}
        <p style={{
          color: '#FAFAFA',
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '1.6',
          margin: 0,
        }}>
          {suggestion.caption}
        </p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5">
          {(suggestion.hashtags || []).map(tag => (
            <span
              key={tag}
              className="pill"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#71717A',
                fontSize: '11px',
                fontFamily: 'Fira Code',
              }}
            >
              <Hash size={9} />
              {tag.replace('#', '')}
            </span>
          ))}
        </div>

        {/* Rationale */}
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Lightbulb size={13} style={{ color: '#52525B', flexShrink: 0, marginTop: '1px' }} />
          <p style={{ color: '#71717A', fontSize: '12px', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
            {suggestion.rationale}
          </p>
        </div>

        {/* Image prompt toggle */}
        <button
          className="flex items-center gap-1.5 w-fit"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#52525B' }}
          onClick={() => setShowPrompt(v => !v)}
        >
          {showPrompt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span style={{ fontSize: '11px', fontFamily: 'Fira Code' }}>
            {showPrompt ? 'hide' : 'show'} image prompt
          </span>
        </button>

        {showPrompt && (
          <div
            className="p-3 rounded-xl"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <p style={{ color: '#52525B', fontSize: '11px', fontFamily: 'Fira Code', margin: 0, lineHeight: '1.7' }}>
              {suggestion.image_prompt}
            </p>
          </div>
        )}

        {/* Spacer to push actions to bottom */}
        <div className="flex-1" />

        {/* ── Video player ──────────────────────────────────────────────────── */}
        {isVideoReady && videoUrl && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <div className="flex items-center gap-2 mb-2">
              <Play size={12} style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--accent)', fontSize: '11px', fontFamily: 'Fira Code', fontWeight: 600 }}>
                VIDEO READY
              </span>
            </div>
            <video
              src={videoUrl}
              autoPlay
              muted
              loop
              controls
              playsInline
              style={{ borderRadius: '12px', maxHeight: '280px', border: '1px solid rgba(0,214,143,0.2)' }}
            />
          </div>
        )}

        {/* ── Generating spinner ─────────────────────────────────────────────── */}
        {(isApproving || isApproved) && !isVideoReady && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(0,214,143,0.06)', border: '1px solid rgba(0,214,143,0.15)' }}
          >
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600 }}>
                Generating video…
              </div>
              <div style={{ color: '#52525B', fontSize: '11px', fontFamily: 'Fira Code' }}>
                fal.ai Veo3 · ~45 seconds
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons (pending only) ─────────────────────────────────── */}
        {isPending && !isRejected && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-approve flex-1" onClick={handleApprove} disabled={loading}>
                {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Approve + Video
              </button>
              <button
                className="btn btn-tweak"
                onClick={() => { setShowTweak(v => !v); setShowReject(false) }}
                disabled={loading}
              >
                <Wand2 size={13} />
                Tweak
              </button>
              <button
                className="btn btn-reject"
                onClick={() => { setShowReject(v => !v); setShowTweak(false) }}
                disabled={loading}
              >
                <XCircle size={13} />
                Reject
              </button>
            </div>

            {/* Tweak panel */}
            {showTweak && (
              <div className="flex flex-col gap-2" style={{ animation: 'slideUp 0.2s ease' }}>
                <textarea
                  className="input-base"
                  rows={3}
                  value={tweakText}
                  onChange={e => setTweakText(e.target.value)}
                  placeholder="Edit caption seed…"
                />
                <button className="btn btn-tweak w-fit" onClick={handleRegenerate} disabled={loading}>
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Regenerate with this seed
                </button>
              </div>
            )}

            {/* Reject panel */}
            {showReject && (
              <div className="flex flex-col gap-2" style={{ animation: 'slideUp 0.2s ease' }}>
                <select
                  className="input-base"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                >
                  <option value="" disabled>Select reason…</option>
                  {REJECT_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button className="btn btn-reject w-fit" onClick={handleReject} disabled={loading || !rejectReason}>
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                  Confirm reject
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Feedback message ──────────────────────────────────────────────── */}
        {msg && (
          <div
            className="pill"
            style={{
              background: 'rgba(0,214,143,0.08)',
              color: 'var(--accent)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              fontFamily: 'DM Sans',
              animation: 'fadeIn 0.2s ease',
              display: 'block',
            }}
          >
            {msg}
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              background: 'rgba(240,71,71,0.08)',
              color: '#F04747',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            ⚠ {error}
          </div>
        )}

      </div>
    </div>
  )
}
