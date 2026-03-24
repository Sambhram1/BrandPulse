const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Brand
  saveBrand:   (config)         => req('/brand',     { method: 'POST', body: JSON.stringify(config) }),
  getBrand:    ()               => req('/brand'),

  // Trends
  getTrends:   (brand)          => req('/trends',    { method: 'POST', body: JSON.stringify(brand) }),

  // Ideas
  generateIdeas: (brand, trends) => req('/generate', { method: 'POST', body: JSON.stringify({ brand, trends }) }),

  // Video
  startVideo:  (idea, brand)    => req('/video',     { method: 'POST', body: JSON.stringify({ idea, brand }) }),
  getVideoStatus: (jobId)       => req(`/video/${jobId}`),
  downloadUrl: (jobId)          => `${BASE}/download/${jobId}`,
}
