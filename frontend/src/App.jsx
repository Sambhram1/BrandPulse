import { useState } from 'react'
import { api } from './api.js'
import BrandSetup   from './components/BrandSetup.jsx'
import TrendFeed    from './components/TrendFeed.jsx'
import IdeaCards    from './components/IdeaCards.jsx'
import VideoStudio  from './components/VideoStudio.jsx'
import { Zap, ChevronRight } from 'lucide-react'

// ── Step indicator ─────────────────────────────────────────────────────────────
const STEPS = ['Brand Setup', 'Trend Analysis', 'Content Ideas', 'Video Studio']

function StepBar({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 px-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(9,9,11,0.7)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>

      {/* Logo */}
      <div className="hidden sm:flex items-center gap-2 mr-8">
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,214,143,0.15)', border: '1px solid rgba(0,214,143,0.3)' }}>
          <Zap size={12} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="font-display text-sm font-bold" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
          Brand<span style={{ color: 'var(--accent)' }}>Pulse</span>
        </span>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => {
          const done    = i < current
          const active  = i === current
          return (
            <div key={label} className="flex items-center gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: active ? 'rgba(0,214,143,0.12)' : done ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border:     active ? '1px solid rgba(0,214,143,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: active ? 'var(--accent)' : done ? 'rgba(0,214,143,0.3)' : 'rgba(255,255,255,0.08)',
                    fontSize: '9px', fontFamily: 'Fira Code', color: active ? '#09090B' : done ? 'var(--accent)' : '#52525B',
                    fontWeight: 700,
                  }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : done ? '#A1A1AA' : '#52525B',
                  display: window.innerWidth < 400 && !active ? 'none' : 'block',
                }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={12} style={{ color: '#3F3F46', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div
      className="toast-enter fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      style={{
        background: '#1C1C22',
        border: `1px solid ${type === 'error' ? 'rgba(240,71,71,0.4)' : 'rgba(0,214,143,0.3)'}`,
        borderRadius: '12px', padding: '12px 20px',
        color: type === 'error' ? '#F04747' : '#FAFAFA',
        fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
      }}
    >
      {msg}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [step,        setStep]       = useState(0)
  const [brand,       setBrand]      = useState(null)
  const [trends,      setTrends]     = useState(null)
  const [ideas,       setIdeas]      = useState([])
  const [jobId,       setJobId]      = useState(null)
  const [selectedIdea, setSelectedIdea] = useState(null)

  const [loadingTrends,   setLoadingTrends]   = useState(false)
  const [loadingIdeas,    setLoadingIdeas]     = useState(false)
  const [loadingVideo,    setLoadingVideo]     = useState(false)
  const [regenerating,    setRegenerating]     = useState(false)

  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Step 1 → 2: save brand + fetch trends
  async function handleBrandComplete(config) {
    setBrand(config)
    setLoadingTrends(true)
    try {
      await api.saveBrand(config)
      showToast('Brand saved! Fetching live Instagram trends…')
      const t = await api.getTrends(config)
      setTrends(t)
      setStep(1)
    } catch (e) {
      showToast(e.message || 'Failed to fetch trends', 'error')
    } finally {
      setLoadingTrends(false)
    }
  }

  // Step 2 → 3: generate ideas
  async function handleGenerateIdeas() {
    setLoadingIdeas(true)
    try {
      const result = await api.generateIdeas(brand, trends)
      setIdeas(result.ideas || [])
      setStep(2)
      showToast('3 reel concepts generated by Groq Llama 3.3 70B!')
    } catch (e) {
      showToast(e.message || 'Idea generation failed', 'error')
    } finally {
      setLoadingIdeas(false)
    }
  }

  // Regenerate ideas
  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const result = await api.generateIdeas(brand, trends)
      setIdeas(result.ideas || [])
      showToast('New ideas generated!')
    } catch (e) {
      showToast(e.message || 'Failed', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  // Step 3 → 4: select idea + start video
  async function handleSelectIdea(idea) {
    setSelectedIdea(idea)
    setLoadingVideo(true)
    try {
      const result = await api.startVideo(idea, brand)
      setJobId(result.job_id)
      setStep(3)
      showToast('Video generation started on fal.ai Veo3!')
    } catch (e) {
      showToast(e.message || 'Failed to start video', 'error')
    } finally {
      setLoadingVideo(false)
    }
  }

  // Start over
  function handleStartOver() {
    setStep(0); setBrand(null); setTrends(null)
    setIdeas([]); setJobId(null); setSelectedIdea(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090B' }}>

      {/* Step bar (hidden on step 0 which is full-screen) */}
      {step > 0 && <StepBar current={step} />}

      {/* Pages */}
      {step === 0 && (
        <BrandSetup onComplete={handleBrandComplete} />
      )}

      {step === 1 && brand && (
        <TrendFeed
          brand={brand}
          trends={trends}
          onGenerate={handleGenerateIdeas}
          generating={loadingIdeas}
        />
      )}

      {step === 2 && (
        <IdeaCards
          brand={brand}
          ideas={ideas}
          onSelectIdea={handleSelectIdea}
          loading={loadingVideo}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />
      )}

      {step === 3 && (
        <VideoStudio
          jobId={jobId}
          brand={brand}
          idea={selectedIdea}
          onStartOver={handleStartOver}
        />
      )}

      {/* Loading overlay for trend fetch */}
      {loadingTrends && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="card p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.3)' }}>
              <Zap size={28} style={{ color: 'var(--accent)' }} className="animate-pulse" />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-lg mb-1" style={{ fontFamily: 'Syne' }}>
                Fetching live trends
              </div>
              <div style={{ color: '#71717A', fontSize: '13px' }}>
                Scanning Instagram for your hashtags via Apify…
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

    </div>
  )
}
