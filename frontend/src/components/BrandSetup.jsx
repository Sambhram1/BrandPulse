import { useState } from 'react'
import { Sparkles, Plus, X, ArrowRight, Zap } from 'lucide-react'

const TONE_OPTIONS = [
  'Bold & Edgy', 'Luxury & Refined', 'Playful & Fun',
  'Educational', 'Sustainable & Conscious', 'Empowering',
  'Minimalist & Clean', 'Youthful & Gen-Z',
]

const INDUSTRY_OPTIONS = [
  'Beauty & Skincare', 'Fashion & Apparel', 'Food & Beverage',
  'Fitness & Wellness', 'Tech & Gadgets', 'Home & Lifestyle',
  'Travel & Hospitality', 'Education', 'Other',
]

function TagInput({ value, onChange, placeholder }) {
  const [text, setText] = useState('')

  function add() {
    const val = text.trim().replace(/^#/, '')
    if (val && !value.includes(`#${val}`)) {
      onChange([...value, `#${val}`])
    }
    setText('')
  }

  function remove(tag) {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-xl min-h-[52px]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 pill pill-accent" style={{ fontSize: '12px' }}>
          {tag}
          <button onClick={() => remove(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        placeholder={value.length === 0 ? placeholder : '+ add more'}
        style={{
          background: 'none', border: 'none', outline: 'none', color: '#FAFAFA',
          fontSize: '13px', fontFamily: 'DM Sans', minWidth: '120px', flex: 1,
        }}
      />
      {text && (
        <button onClick={add} className="pill pill-muted" style={{ fontSize: '11px', cursor: 'pointer', border: 'none' }}>
          <Plus size={10} /> add
        </button>
      )}
    </div>
  )
}

export default function BrandSetup({ onComplete }) {
  const [form, setForm] = useState({
    name:        '',
    industry:    'Beauty & Skincare',
    tone:        '',
    audience:    '',
    competitors: [],
    hashtags:    [],
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: '' })) }

  function validate() {
    const e = {}
    if (!form.name.trim())    e.name     = 'Brand name is required'
    if (!form.tone)           e.tone     = 'Pick a tone'
    if (!form.audience.trim()) e.audience = 'Describe your audience'
    if (form.hashtags.length === 0) e.hashtags = 'Add at least one hashtag'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      await onComplete(form)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,214,143,0.08), transparent)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,214,143,0.15)', border: '1px solid rgba(0,214,143,0.3)' }}>
          <Zap size={15} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="font-display text-xl font-bold" style={{ fontFamily: 'Syne', fontWeight: 800 }}>
          Brand<span style={{ color: 'var(--accent)' }}>Pulse</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-xl card p-8" style={{ boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold mb-2" style={{ fontFamily: 'Syne', fontWeight: 800 }}>
            Set up your brand
          </h1>
          <p style={{ color: '#71717A', fontSize: '14px' }}>
            Tell us about your brand — we'll find trending content gaps and generate your viral reel.
          </p>
        </div>

        <div className="flex flex-col gap-5">

          {/* Name + Industry row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                BRAND NAME *
              </label>
              <input
                className="input-base"
                placeholder="e.g. Nykaa"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                style={{ borderColor: errors.name ? 'rgba(240,71,71,0.5)' : undefined }}
              />
              {errors.name && <p style={{ color: '#F04747', fontSize: '11px', marginTop: '4px' }}>{errors.name}</p>}
            </div>
            <div>
              <label style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                INDUSTRY
              </label>
              <select className="input-base" value={form.industry} onChange={e => set('industry', e.target.value)}>
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Brand tone */}
          <div>
            <label style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              BRAND TONE *
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => set('tone', t)}
                  className="pill"
                  style={{
                    cursor: 'pointer', border: 'none',
                    background: form.tone === t ? 'rgba(0,214,143,0.2)' : 'rgba(255,255,255,0.05)',
                    color:      form.tone === t ? 'var(--accent)' : '#71717A',
                    boxShadow:  form.tone === t ? '0 0 0 1px rgba(0,214,143,0.4)' : 'none',
                    transition: 'all 0.15s ease',
                    fontSize:   '12px',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {errors.tone && <p style={{ color: '#F04747', fontSize: '11px', marginTop: '4px' }}>{errors.tone}</p>}
          </div>

          {/* Target audience */}
          <div>
            <label style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              TARGET AUDIENCE *
            </label>
            <textarea
              className="input-base"
              rows={2}
              placeholder="e.g. Indian women 18-35, digitally native, values authenticity and sustainability"
              value={form.audience}
              onChange={e => set('audience', e.target.value)}
              style={{ borderColor: errors.audience ? 'rgba(240,71,71,0.5)' : undefined }}
            />
            {errors.audience && <p style={{ color: '#F04747', fontSize: '11px', marginTop: '4px' }}>{errors.audience}</p>}
          </div>

          {/* Hashtags */}
          <div>
            <label style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              YOUR KEY HASHTAGS * <span style={{ color: '#52525B', fontWeight: 400 }}>(press Enter after each)</span>
            </label>
            <TagInput
              value={form.hashtags}
              onChange={v => set('hashtags', v)}
              placeholder="#SustainableBeauty, #IndianSkincare…"
            />
            {errors.hashtags && <p style={{ color: '#F04747', fontSize: '11px', marginTop: '4px' }}>{errors.hashtags}</p>}
          </div>

          {/* Competitors */}
          <div>
            <label style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              COMPETITORS <span style={{ color: '#52525B', fontWeight: 400 }}>(optional)</span>
            </label>
            <TagInput
              value={form.competitors}
              onChange={v => set('competitors', v.map(c => c.replace('#', '')))}
              placeholder="#Mamaearth, #Plum…"
            />
          </div>

          {/* Submit */}
          <button
            className="btn btn-approve w-full justify-center mt-2"
            style={{ padding: '14px', fontSize: '15px', fontWeight: 700 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <span className="animate-spin inline-block">⏳</span>
              : <><Sparkles size={16} /> Analyse Trends &amp; Generate Ideas</>
            }
            {!loading && <ArrowRight size={16} style={{ marginLeft: 'auto' }} />}
          </button>

        </div>
      </div>

      <p style={{ color: '#3F3F46', fontSize: '11px', marginTop: '24px', fontFamily: 'Fira Code' }}>
        Powered by Groq · fal.ai · Apify · Databricks
      </p>
    </div>
  )
}
