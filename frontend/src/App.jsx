import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Globe2,
  RefreshCw,
  Server,
  TriangleAlert,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const formatTime = (value) => {
  if (!value) return 'Waiting for first check'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  }).format(new Date(value))
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function MetricCard({ label, value, detail, icon: Icon, tone = '' }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.8} /></div>
      <p className="metric-label">{label}</p>
      <div className="metric-value">{value}</div>
      <p className="metric-detail">{detail}</p>
    </article>
  )
}

function StatusBadge({ status }) {
  const isUp = status === 'UP'
  const isPending = status === 'PENDING'
  return (
    <span className={`status-badge ${isUp ? 'is-up' : isPending ? 'is-pending' : 'is-down'}`}>
      <span className="status-dot" />{isPending ? 'CHECKING' : status}
    </span>
  )
}

function App() {
  const [services, setServices] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  async function loadDashboard() {
    try {
      const [serviceResponse, historyResponse] = await Promise.all([
        fetch('/services'), fetch('/history?limit=60'),
      ])
      if (!serviceResponse.ok || !historyResponse.ok) throw new Error('Could not load monitoring data from the server.')
      const [serviceData, historyData] = await Promise.all([
        serviceResponse.json(), historyResponse.json(),
      ])
      setServices(serviceData.services)
      setEvents(historyData.events)
      setLastUpdated(new Date())
      setError('')
    } catch (exception) {
      setError(exception.message || 'Unable to reach the API. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  async function runHealthCheck() {
    setChecking(true)
    setError('')
    try {
      const response = await fetch('/check', { method: 'POST' })
      if (!response.ok) throw new Error('The health check could not be completed.')
      await response.json()
      await loadDashboard()
    } catch (exception) {
      setError(exception.message || 'Unable to run a health check.')
    } finally {
      setChecking(false)
    }
  }

  const upCount = services.filter((service) => service.status === 'UP').length
  const downCount = services.filter((service) => service.status === 'DOWN').length
  const measured = services.filter((service) => service.response_time_ms != null)
  const average = measured.length
    ? Math.round(measured.reduce((total, service) => total + service.response_time_ms, 0) / measured.length)
    : null
  const chartData = [...events].reverse().map((event) => ({
    time: formatTime(event.checked_at),
    response: event.response_time_ms,
    service: event.name,
    status: event.status,
  }))

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Pulse dashboard home">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.1} /></span>
          <span className="brand-name">pulse<span>.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switcher"><span className="workspace-avatar">O</span><span>Observability</span><ChevronDown size={15} /></button>
        <div className="nav-label">MONITORING</div>
        <a className="nav-item active" href="#overview"><Activity size={17} /><span>Overview</span><span className="nav-indicator" /></a>
        <a className="nav-item" href="#services"><Server size={17} /><span>Services</span><span className="nav-count">{services.length || '—'}</span></a>
        <a className="nav-item" href="#events"><Clock3 size={17} /><span>Event log</span></a>
        <div className="sidebar-bottom">
          <div className="system-status"><span className="status-dot" /><span>Monitoring active</span></div>
          <div className="sidebar-footer"><span>API HEALTH MONITOR</span><span>v1.0.0</span></div>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Monitoring</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-meta"><span className="live-indicator"><span className="status-dot" />LIVE</span><span className="topbar-divider" /><span>Updated {formatTime(lastUpdated)}</span><button className="icon-button" onClick={loadDashboard} aria-label="Refresh dashboard" title="Refresh dashboard"><RefreshCw size={16} /></button></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">SYSTEM OVERVIEW</div><h1>API health</h1><p className="page-description">Real-time availability and performance across your endpoints.</p></div>
            <button className="run-button" onClick={runHealthCheck} disabled={checking}>
              <RefreshCw size={15} className={checking ? 'spin' : ''} />{checking ? 'Checking services' : 'Run health check'}
            </button>
          </div>

          {error && <div className="error-banner" role="alert"><TriangleAlert size={17} /><span>{error}</span><button onClick={loadDashboard}>Retry</button></div>}

          <section className="metrics-grid" aria-label="Service summary">
            <MetricCard label="Total services" value={loading ? '—' : services.length} detail="Configured endpoints" icon={Globe2} />
            <MetricCard label="Operational" value={loading ? '—' : upCount} detail={loading ? 'Awaiting data' : `${upCount} of ${services.length} responding`} icon={ArrowUpRight} tone="green" />
            <MetricCard label="Unreachable" value={loading ? '—' : downCount} detail={loading ? 'Awaiting data' : downCount ? 'Needs attention' : 'All services available'} icon={ArrowDownRight} tone={downCount ? 'red' : 'muted'} />
            <MetricCard label="Avg. response time" value={loading || average == null ? '—' : `${average} ms`} detail="Latest check across services" icon={Clock3} tone="amber" />
          </section>

          <section className="content-grid">
            <article className="panel chart-panel">
              <div className="panel-heading"><div><div className="panel-title">Response time</div><div className="panel-subtitle">Recorded health checks · milliseconds</div></div><div className="chart-legend"><span className="legend-dot" />Latency</div></div>
              {loading ? <div className="chart-state">Loading monitoring history…</div> : chartData.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                      <defs><linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b7ef68" stopOpacity={0.2} /><stop offset="95%" stopColor="#b7ef68" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke="#272d28" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#757d75', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={35} />
                      <YAxis tick={{ fill: '#757d75', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}`} />
                      <Tooltip contentStyle={{ background: '#1a1f1b', border: '1px solid #333b34', borderRadius: 5, color: '#eff2ec', fontSize: 12 }} formatter={(value, _, item) => [`${value} ms`, item.payload.service]} labelStyle={{ color: '#9aa198', marginBottom: 5 }} />
                      <Area type="monotone" dataKey="response" stroke="#b7ef68" strokeWidth={2} fill="url(#latencyFill)" activeDot={{ r: 4, fill: '#b7ef68', stroke: '#172017', strokeWidth: 2 }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="chart-state"><Activity size={22} /><span>No monitoring history yet</span><small>Run a health check to start collecting response times.</small></div>}
              <div className="chart-footer"><span><span className="footer-dot" />Each point represents one endpoint check</span><span>{events.length} checks recorded</span></div>
            </article>

            <article className="panel availability-panel">
              <div className="panel-heading"><div><div className="panel-title">Availability</div><div className="panel-subtitle">Based on recorded checks</div></div><CircleHelp size={15} className="help-icon" title="Uptime is calculated from all checks stored in this database." /></div>
              <div className="availability-list">
                {loading ? <div className="small-state">Loading services…</div> : services.map((service) => (
                  <div className="availability-row" key={service.service_id}><span className={`availability-dot ${service.status === 'UP' ? 'green' : service.status === 'DOWN' ? 'red' : ''}`} /><div className="availability-copy"><span>{service.name}</span><small>{service.uptime_percent}% observed uptime</small></div><span className="availability-percent">{service.uptime_percent}%</span></div>
                ))}
              </div>
              <div className="availability-note"><Check size={14} /><span>Uptime reflects all checks stored locally.</span></div>
            </article>
          </section>

          <section className="panel services-panel" id="services">
            <div className="panel-heading table-heading"><div><div className="panel-title">Monitored services <span className="title-count">{services.length}</span></div><div className="panel-subtitle">Endpoint status and latest check results</div></div><span className="table-live"><span className="status-dot" />LIVE STATUS</span></div>
            <div className="table-scroll"><table><thead><tr><th>SERVICE</th><th>STATUS</th><th>HTTP</th><th>RESPONSE TIME</th><th>UPTIME</th><th>LAST CHECKED</th></tr></thead><tbody>
              {loading ? <tr><td colSpan="6" className="table-state">Loading services…</td></tr> : services.map((service) => (
                <tr key={service.service_id}><td><div className="service-cell"><span className="service-icon"><Globe2 size={16} /></span><span className="service-name-wrap"><strong>{service.name}</strong><small>{service.url.replace(/^https?:\/\//, '')}</small></span></div></td><td><StatusBadge status={service.status} /></td><td className="mono code-cell">{service.status_code ?? '—'}</td><td className="mono">{service.response_time_ms == null ? '—' : `${service.response_time_ms} ms`}</td><td className="mono uptime-cell">{service.uptime_percent}%</td><td className="last-checked">{formatDate(service.last_checked)}{service.error && <small className="row-error" title={service.error}>{service.error}</small>}</td></tr>
              ))}
              {!loading && !services.length && <tr><td colSpan="6" className="table-state">No services returned by the API.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span><span className="footer-dot" />Status is updated when a health check completes</span><span>{services.length} endpoints monitored</span></div>
          </section>

          <section className="panel events-panel" id="events">
            <div className="panel-heading table-heading"><div><div className="panel-title">Recent events</div><div className="panel-subtitle">Latest health checks from SQLite history</div></div><span className="events-count">{events.length} events</span></div>
            {loading ? <div className="event-state">Loading recent events…</div> : events.length ? <div className="events-list">{events.slice(0, 8).map((event) => (
              <div className="event-row" key={event.id}><span className={`event-indicator ${event.status === 'UP' ? 'green' : 'red'}`}>{event.status === 'UP' ? <Check size={12} /> : <TriangleAlert size={12} />}</span><div className="event-message"><strong>{event.name}</strong><span>{event.status === 'UP' ? `Responded with HTTP ${event.status_code}` : event.error || 'Service is unreachable'}</span></div><span className="event-latency mono">{event.response_time_ms} ms</span><time>{formatDate(event.checked_at)}</time></div>
            ))}</div> : <div className="event-state"><Activity size={20} /><span>No events recorded yet</span><small>Monitoring results will appear here.</small></div>}
          </section>

          <footer className="page-footer"><span>Pulse API Monitor</span><span>Data served by your local FastAPI instance <span className="footer-separator">·</span> SQLite storage</span></footer>
        </div>
      </section>
    </main>
  )
}

export default App