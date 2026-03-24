import { TrendingUp, Users, Target, AlertTriangle, ArrowRight, Heart, MessageCircle, BarChart2 } from 'lucide-react'

function TrendBar({ tag, engagement, count, max }) {
  const pct = max > 0 ? (engagement / max) * 100 : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <span style={{ color: '#A1A1AA', fontSize: '12px', fontFamily: 'Fira Code', width: '140px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tag}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--accent), #00B377)',
            transition: 'width 0.8s ease',
            boxShadow: '0 0 6px rgba(0,214,143,0.3)',
          }}
        />
      </div>
      <span style={{ color: '#71717A', fontSize: '11px', fontFamily: 'Fira Code', width: '60px', textAlign: 'right', flexShrink: 0 }}>
        {engagement >= 1000 ? `${(engagement/1000).toFixed(1)}K` : engagement}
      </span>
      <span style={{ color: '#3F3F46', fontSize: '10px', width: '30px', textAlign: 'right', flexShrink: 0 }}>
        {count}p
      </span>
    </div>
  )
}

function PostCard({ post }) {
  const eng = post.likes + post.comments
  return (
    <div className="card-elevated p-4 rounded-2xl flex flex-col gap-3"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      {post.thumbnail && (
        <div className="w-full rounded-xl overflow-hidden bg-zinc-900" style={{ aspectRatio: '1/1' }}>
          <img src={post.thumbnail} alt="" className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none' }} />
        </div>
      )}
      <div>
        <p style={{ color: '#FAFAFA', fontSize: '12px', lineHeight: '1.5', margin: 0 }}
          className="line-clamp-3">
          {post.caption}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {(post.hashtags || []).slice(0, 3).map(t => (
          <span key={t} style={{ color: 'var(--accent)', fontSize: '10px', fontFamily: 'Fira Code' }}>{t}</span>
        ))}
      </div>
      <div className="flex items-center gap-4" style={{ color: '#71717A', fontSize: '11px' }}>
        <span className="flex items-center gap-1"><Heart size={11} /> {post.likes >= 1000 ? `${(post.likes/1000).toFixed(1)}K` : post.likes}</span>
        <span className="flex items-center gap-1"><MessageCircle size={11} /> {post.comments}</span>
        {post.post_url && (
          <a href={post.post_url} target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)', marginLeft: 'auto', fontSize: '10px' }}>
            View ↗
          </a>
        )}
      </div>
    </div>
  )
}

export default function TrendFeed({ brand, trends, onGenerate, generating }) {
  if (!trends) return null

  const topTags = trends.top_hashtags || []
  const maxEng  = topTags[0]?.avg_engagement || 1
  const posts   = (trends.posts || []).filter(p => p.caption)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill pill-accent" style={{ fontSize: '10px' }}>LIVE TRENDS</span>
            <span className="pill pill-muted" style={{ fontSize: '10px' }}>{trends.total_posts} posts analysed</span>
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ fontFamily: 'Syne', fontWeight: 800 }}>
            What's trending for <span style={{ color: 'var(--accent)' }}>{brand.name}</span>
          </h1>
          <p style={{ color: '#71717A', fontSize: '14px', marginTop: '6px' }}>
            Real-time Instagram data for your hashtags
          </p>
        </div>
        <button
          className="btn btn-approve flex-shrink-0"
          style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 700 }}
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? '⏳ Generating…' : <><Sparkles size={15} /> Generate Ideas</>}
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Posts analysed',     value: trends.total_posts,        color: 'var(--accent)', icon: BarChart2 },
          { label: 'Competitor posts',   value: trends.competitor_count,   color: '#F59E0B',       icon: Target },
          { label: 'Your brand posts',   value: trends.brand_post_count,   color: '#8B5CF6',       icon: Users },
          { label: 'Trending hashtags',  value: topTags.length,            color: '#F04747',       icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card p-4">
            <Icon size={16} style={{ color, marginBottom: '8px' }} />
            <div className="font-display text-2xl font-bold" style={{ fontFamily: 'Syne', color, fontWeight: 800 }}>{value}</div>
            <div style={{ color: '#71717A', fontSize: '11px', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Gap alert */}
      {trends.gap_hashtag && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-8"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderLeft: '3px solid #F59E0B' }}>
          <AlertTriangle size={16} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700, fontFamily: 'Fira Code', letterSpacing: '0.06em' }}>
              COMPETITOR GAP DETECTED
            </div>
            <p style={{ color: '#D4A853', fontSize: '13px', margin: '4px 0 0' }}>
              <strong style={{ color: '#F5C569', fontFamily: 'Fira Code' }}>{trends.gap_hashtag}</strong> has{' '}
              <strong style={{ color: '#F5C569' }}>{trends.gap_engagement?.toLocaleString() || 'high'}</strong> avg engagement —
              your brand has 0 posts there. This is your opportunity.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trending hashtags */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
            <h3 className="font-display font-bold text-sm" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
              Top Trending Hashtags
            </h3>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {topTags.slice(0, 8).map(({ tag, avg_engagement, count }) => (
              <TrendBar key={tag} tag={tag} engagement={avg_engagement} count={count} max={maxEng} />
            ))}
            {topTags.length === 0 && (
              <p style={{ color: '#52525B', fontSize: '12px', padding: '12px 0' }}>No trend data yet</p>
            )}
          </div>
        </div>

        {/* Recent posts grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={15} style={{ color: '#8B5CF6' }} />
            <h3 className="font-display font-bold text-sm" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
              Recent Posts
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {posts.slice(0, 6).map(post => (
              <PostCard key={post.post_id} post={post} />
            ))}
            {posts.length === 0 && (
              <div className="col-span-2 card p-6 text-center" style={{ color: '#52525B', fontSize: '13px' }}>
                Fetching real posts… mock data shown for demo
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Generate CTA */}
      <div className="mt-8 p-6 rounded-2xl text-center"
        style={{ background: 'rgba(0,214,143,0.05)', border: '1px solid rgba(0,214,143,0.15)' }}>
        <p style={{ color: '#A1A1AA', fontSize: '14px', marginBottom: '16px' }}>
          Based on these trends, Groq AI will generate 3 targeted Reel concepts for <strong style={{ color: '#FAFAFA' }}>{brand.name}</strong>
        </p>
        <button
          className="btn btn-approve"
          style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 700 }}
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? '⏳ Thinking with Groq…' : <><Sparkles size={16} /> Generate My Reel Ideas</>}
          {!generating && <ArrowRight size={16} />}
        </button>
      </div>

    </div>
  )
}

// tiny local import fix
function Sparkles({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/>
      <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z"/>
    </svg>
  )
}
