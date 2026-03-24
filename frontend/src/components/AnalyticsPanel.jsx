import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Brain, TrendingUp } from 'lucide-react'

const BAR_COLORS = {
  Pending:     '#3F3F46',
  Approved:    '#00D68F',
  'Video Ready': '#00B377',
  Rejected:    '#F04747',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1C1C22',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '12px',
      color: '#FAFAFA',
      fontFamily: 'Fira Code',
    }}>
      <div style={{ color: '#A1A1AA', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: payload[0].fill, fontWeight: 600 }}>
        {payload[0].value} suggestion{payload[0].value !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export default function AnalyticsPanel({ stats }) {
  const data = [
    { name: 'Pending',      value: stats?.pending     ?? 0 },
    { name: 'Approved',     value: stats?.approved    ?? 0 },
    { name: 'Video Ready',  value: stats?.video_ready ?? 0 },
    { name: 'Rejected',     value: stats?.rejected    ?? 0 },
  ]

  const approveRate = stats?.approve_rate ?? 0
  const avgViral    = stats?.avg_viral_score_approved ?? 0
  const total       = stats?.total ?? 0

  return (
    <div className="card p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <Brain size={15} style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <div className="font-display font-700 text-sm" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
              Model Learning
            </div>
            <div style={{ color: '#52525B', fontSize: '11px' }}>
              Every approval trains the next generation cycle
            </div>
          </div>
        </div>
        <span className="pill pill-purple" style={{ fontSize: '10px' }}>
          {total} total
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart */}
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} layout="vertical" barCategoryGap="30%">
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#3F3F46', fontSize: 10, fontFamily: 'Fira Code' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={72}
                tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'DM Sans' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {data.map(entry => (
                  <Cell key={entry.name} fill={BAR_COLORS[entry.name] || '#3F3F46'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-4 justify-center">
          <div
            className="p-4 rounded-2xl flex flex-col gap-1"
            style={{ background: 'rgba(0,214,143,0.06)', border: '1px solid rgba(0,214,143,0.1)' }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ color: '#71717A', fontSize: '11px' }}>Approve rate</span>
            </div>
            <div
              className="font-display"
              style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}
            >
              {approveRate.toFixed(0)}<span style={{ fontSize: '16px' }}>%</span>
            </div>
          </div>

          {avgViral > 0 && (
            <div
              className="p-4 rounded-2xl flex flex-col gap-1"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}
            >
              <span style={{ color: '#71717A', fontSize: '11px' }}>Avg viral score (approved)</span>
              <div
                className="font-display"
                style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}
              >
                {avgViral.toFixed(0)}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
