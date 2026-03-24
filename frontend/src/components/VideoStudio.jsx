import { useState, useEffect, useRef } from 'react'
import { Download, Copy, Check, RotateCcw, Play, Pause, Volume2, VolumeX, Hash, Sparkles } from 'lucide-react'
import { api } from '../api.js'

function GeneratingAnimation({ elapsed }) {
  const steps = [
    { at: 0,   label: 'Submitting to fal.ai Veo3…' },
    { at: 5,   label: 'Building scene from your prompt…' },
    { at: 15,  label: 'Rendering cinematic motion…' },
    { at: 30,  label: 'Applying 9:16 vertical frame…' },
    { at: 45,  label: 'Finalising video quality…' },
  ]
  const current = [...steps].reverse().find(s => elapsed >= s.at) || steps[0]

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6"
      style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        {[0, 1, 2].map(i => (
          <div key={i}
            style={{
              position: 'absolute',
              width: `${80 + i * 20}px`,
              height: `${80 + i * 20}px`,
              borderRadius: '50%',
              border: '1px solid rgba(0,214,143,0.2)',
              animation: `pulse ${1.5 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.3)' }}>
          <Sparkles size={28} style={{ color: 'var(--accent)' }} />
        </div>
      </div>

      <div className="text-center">
        <div className="font-display text-xl font-bold mb-2" style={{ fontFamily: 'Syne', fontWeight: 800 }}>
          Generating your reel…
        </div>
        <div style={{ color: 'var(--accent)', fontSize: '13px', fontFamily: 'Fira Code', marginBottom: '8px' }}>
          {current.label}
        </div>
        <div style={{ color: '#52525B', fontSize: '11px', fontFamily: 'Fira Code' }}>
          {elapsed}s elapsed · typically 30-90s
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min((elapsed / 90) * 100, 95)}%`,
            background: 'linear-gradient(90deg, var(--accent), #00B377)',
            transition: 'width 1s linear',
            boxShadow: '0 0 8px rgba(0,214,143,0.4)',
          }}
        />
      </div>

    </div>
  )
}

function VideoPlayer({ url, filename }) {
  const videoRef       = useRef(null)
  const [playing, setPlaying]   = useState(true)
  const [muted,   setMuted]     = useState(true)
  const [copied,  setCopied]    = useState(false)
  const [capCopied, setCapCopied] = useState(false)

  function togglePlay() {
    if (videoRef.current) {
      if (playing) videoRef.current.pause()
      else         videoRef.current.play()
      setPlaying(p => !p)
    }
  }

  function copyHashtags(hashtags) {
    navigator.clipboard.writeText(hashtags.join(' ')).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyCaption(caption) {
    navigator.clipboard.writeText(caption).then(() => {
      setCapCopied(true); setTimeout(() => setCapCopied(false), 2000)
    })
  }

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{
        maxWidth: '360px',
        margin: '0 auto',
        border: '1px solid rgba(0,214,143,0.2)',
        boxShadow: '0 0 40px rgba(0,214,143,0.1)',
      }}>
      <video
        ref={videoRef}
        src={url}
        autoPlay
        muted={muted}
        loop
        playsInline
        style={{ width: '100%', display: 'block', aspectRatio: '9/16', objectFit: 'cover', maxHeight: '500px' }}
      />
      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 p-3"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
        <button onClick={togglePlay}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button onClick={() => setMuted(m => !m)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontFamily: 'Fira Code', marginLeft: '4px' }}>
          fal.ai Veo3 · 9:16
        </span>
      </div>
    </div>
  )
}

export default function VideoStudio({ jobId, brand, idea, onStartOver }) {
  const [job,     setJob]     = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [copied,  setCopied]  = useState(false)

  // Poll video status
  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const j = await api.getVideoStatus(jobId)
        setJob(j)
      } catch (e) { console.error(e) }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [jobId])

  // Elapsed timer
  useEffect(() => {
    if (job?.status === 'ready') return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [job?.status])

  const isReady    = job?.status === 'ready' && !!job?.video_url
  const isFailed   = job?.status === 'failed' || job?.status === 'no_key'
  const videoUrl   = job?.video_url
  const ideaData   = idea || job?.idea || {}
  const hashtags   = ideaData.hashtags || []
  const caption    = ideaData.caption  || ''
  const filename   = `${(brand?.name || 'reel').replace(/\s+/g,'_').toLowerCase()}_reel.mp4`

  function copyCaption() {
    navigator.clipboard.writeText(`${caption}\n\n${hashtags.join(' ')}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill pill-accent" style={{ fontSize: '10px' }}>
              {isReady ? '✓ VIDEO READY' : '⏳ GENERATING'}
            </span>
            {job?.is_mock && <span className="pill pill-muted" style={{ fontSize: '10px' }}>demo preview</span>}
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ fontFamily: 'Syne', fontWeight: 800 }}>
            {isReady ? 'Your reel is ready 🎬' : 'Creating your reel…'}
          </h1>
        </div>
        <button className="btn btn-ghost" onClick={onStartOver} style={{ fontSize: '12px' }}>
          <RotateCcw size={13} /> New reel
        </button>
      </div>

      {!isReady && !isFailed && <GeneratingAnimation elapsed={elapsed} />}

      {isFailed && (
        <div className="flex flex-col items-center justify-center py-16 gap-5 max-w-md mx-auto text-center"
          style={{ animation: 'fadeIn 0.4s ease' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(240,71,71,0.1)', border: '1px solid rgba(240,71,71,0.2)' }}>
            <Video size={28} style={{ color: '#F04747' }} />
          </div>
          <div>
            <div className="font-display text-xl font-bold mb-2" style={{ fontFamily: 'Syne' }}>
              Video generation failed
            </div>
            <div style={{ color: '#71717A', fontSize: '13px', lineHeight: '1.6' }}>
              {job?.status === 'no_key'
                ? 'fal.ai API key is not configured. Add your key to config.py to generate real videos.'
                : `fal.ai error: ${job?.error || 'Unknown error. Check the terminal for details.'}`
              }
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <a href="https://fal.ai/dashboard/billing" target="_blank" rel="noreferrer"
              className="btn btn-approve" style={{ textDecoration: 'none' }}>
              Top up fal.ai balance ↗
            </a>
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer"
              className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              Get Replicate key (free) ↗
            </a>
          </div>
          <div className="card p-4 w-full text-left">
            <div style={{ color: '#A1A1AA', fontSize: '11px', fontWeight: 600, marginBottom: '8px', fontFamily: 'Fira Code' }}>
              VIDEO PROMPT (for manual generation)
            </div>
            <p style={{ color: '#71717A', fontSize: '12px', fontFamily: 'Fira Code', lineHeight: '1.7', margin: 0 }}>
              {ideaData.image_prompt}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onStartOver}>
            <RotateCcw size={13} /> Try again
          </button>
        </div>
      )}

      {isReady && videoUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Video */}
          <VideoPlayer url={videoUrl} filename={filename} />

          {/* Actions + caption */}
          <div className="flex flex-col gap-5">

            {/* Download button */}
            <a
              href={api.downloadUrl(jobId)}
              download={filename}
              className="btn btn-approve w-full justify-center"
              style={{ padding: '16px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
                       boxShadow: '0 0 20px rgba(0,214,143,0.2)' }}
            >
              <Download size={18} />
              Download Reel (.mp4)
            </a>

            <p style={{ color: '#52525B', fontSize: '11px', textAlign: 'center', fontFamily: 'Fira Code' }}>
              Save to your device → upload directly to Instagram Reels
            </p>

            {/* Caption card */}
            {caption && (
              <div className="card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: '#A1A1AA', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em' }}>
                    CAPTION
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={copyCaption}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy all'}
                  </button>
                </div>
                <p style={{ color: '#FAFAFA', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                  {caption}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {hashtags.map(tag => (
                    <span key={tag} className="flex items-center gap-1"
                      style={{ color: 'var(--accent)', fontSize: '12px', fontFamily: 'Fira Code' }}>
                      <Hash size={10} />{tag.replace('#','')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Steps reminder */}
            <div className="card-elevated p-4 rounded-2xl">
              <div style={{ color: '#71717A', fontSize: '12px', marginBottom: '10px', fontWeight: 600 }}>
                Upload steps:
              </div>
              {[
                'Save the .mp4 to your phone or computer',
                'Open Instagram → Reels → + New',
                'Select the downloaded video',
                'Paste the caption and hashtags',
                'Post!',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs"
                    style={{ background: 'rgba(0,214,143,0.1)', color: 'var(--accent)', fontSize: '10px', fontFamily: 'Fira Code' }}>
                    {i + 1}
                  </div>
                  <span style={{ color: '#A1A1AA', fontSize: '12px', lineHeight: '1.4' }}>{step}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
