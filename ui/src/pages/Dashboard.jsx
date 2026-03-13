// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Button, Tooltip, Card } from 'antd';
import { getHealth, getLedger } from '../api';

const NODES = [
    { id: 'local', label: 'LOCAL DISK', icon: '⬡', color: '#00ff88', role: 'Shard A — i % 3 === 0' },
    { id: 'supabase', label: 'SUPABASE', icon: '◈', color: '#3ecfff', role: 'Shard B — i % 3 === 1' },
    { id: 'cloudinary', label: 'CLOUDINARY', icon: '◎', color: '#ff6b35', role: 'Shard C — i % 3 === 2' },
];

function StatusDot({ ok, checking }) {
    const color = checking ? '#ffd166' : ok ? '#00ff88' : '#ff4444';
    return (
        <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: checking ? 'pulse 0.8s infinite' : ok ? 'breathe 3s infinite' : 'none',
        }} />
    );
}

function NodeCard({ node, status = {} }) {
    const { ok, latency, checking } = status;
    return (
        <Card style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${ok ? node.color + '33' : checking ? '#ffffff11' : '#ff444422'}`,
            borderRadius: 'var(--radius)',
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.4s',
            animation: 'fadeUp 0.4s ease forwards',
        }}>
            {ok && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: `linear-gradient(90deg, transparent, ${node.color}66, transparent)`,
                }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 22, color: node.color, lineHeight: 1, marginBottom: 6 }}>{node.icon}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-primary)', fontWeight: 600 }}>{node.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 3, letterSpacing: '0.05em' }}>{node.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusDot ok={ok} checking={checking} />
                    <span style={{
                        fontSize: 9, letterSpacing: '0.15em', fontWeight: 700,
                        color: checking ? '#ffd166' : ok ? node.color : '#ff4444',
                    }}>
                        {checking ? 'SCANNING' : ok ? 'ONLINE' : status.ok === false ? 'OFFLINE' : 'IDLE'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 6 }}>LATENCY</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: ok ? node.color : 'var(--text-dim)', letterSpacing: '-0.02em' }}>
                        {checking ? '···' : latency != null ? `${latency}ms` : '—'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 6 }}>STATUS</div>
                    <div style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                        color: ok ? '#00ff88' : 'var(--text-dim)',
                    }}>
                        {checking ? 'Checking...' : ok ? 'Reachable' : status.ok === false ? 'Unreachable' : 'Not checked'}
                    </div>
                    {status.error && (
                        <Tooltip title={status.error}>
                            <div style={{ fontSize: 9, color: '#ff4444', marginTop: 4, cursor: 'help', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {status.error}
                            </div>
                        </Tooltip>
                    )}
                </div>
            </div>
        </Card>
    );
}

function MeshBar({ online, total }) {
    const pct = (online / total) * 100;
    const color = online === total ? '#00ff88' : online >= 2 ? '#ffd166' : '#ff4444';
    const label = online === total ? 'FULL REDUNDANCY' : online >= 2 ? 'DEGRADED — RECOVERABLE' : 'CRITICAL';

    return (
        <Card
        // title="Rthagagahgag h"
        >
            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius)',
                padding: '20px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 32,
            }}>
                <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 8 }}>MESH INTEGRITY</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em' }}>
                        {online}/{total} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>nodes</span>
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ height: 3, background: 'var(--border-dim)', borderRadius: 2, marginBottom: 10 }}>
                        <div style={{
                            height: '100%', width: `${pct}%`,
                            background: color,
                            borderRadius: 2,
                            boxShadow: `0 0 8px ${color}`,
                            transition: 'width 0.6s ease',
                        }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                        {online === total
                            ? 'All shards accessible. Zero-knowledge integrity confirmed.'
                            : online >= 2
                                ? 'File reconstruction possible via XOR parity recovery.'
                                : 'Insufficient shards to reconstruct files. Immediate action required.'}
                    </div>
                </div>
            </div>

        </Card>
    );
}

function StatCard({ label, value, accent }) {
    return (

        <Card style={{
            // background: 'var(--bg-surface)',
            // border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius)',
            padding: '20px 24px',
            animation: 'fadeUp 0.4s ease forwards',
        }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 10 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</div>

        </Card>

    );
}

export default function Dashboard() {
    const [nodeStatuses, setNodeStatuses] = useState({});
    const [checking, setChecking] = useState(false);
    const [lastScan, setLastScan] = useState(null);
    const [stats, setStats] = useState({ total: 0, size: 0 });

    const runHealthCheck = useCallback(async () => {
        if (checking) return;
        setChecking(true);
        setNodeStatuses(prev =>
            Object.fromEntries(NODES.map(n => [n.id, { ...prev[n.id], checking: true }]))
        );
        try {
            const data = await getHealth();
            setNodeStatuses(
                Object.fromEntries(
                    NODES.map(n => [n.id, { ...data.nodes[n.id], checking: false }])
                )
            );
            setLastScan(new Date());
        } catch {
            setNodeStatuses(
                Object.fromEntries(NODES.map(n => [n.id, { ok: false, checking: false, error: 'Request failed' }]))
            );
        }
        setChecking(false);
    }, [checking]);

    useEffect(() => {
        runHealthCheck();
        const iv = setInterval(runHealthCheck, 30000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        getLedger(100, 0).then(data => {
            const totalSize = (data.data || []).reduce((acc, f) => acc + (f.file_size || 0), 0);
            setStats({ total: data.total || 0, size: totalSize });
        }).catch(() => { });
    }, []);

    const onlineCount = NODES.filter(n => nodeStatuses[n.id]?.ok).length;

    const fmtBytes = (b) => {
        if (b >= 1e9) return `${(b / 1e9).toFixed(1)}GB`;
        if (b >= 1e6) return `${(b / 1e6).toFixed(1)}MB`;
        if (b >= 1e3) return `${(b / 1e3).toFixed(1)}KB`;
        return `${b}B`;
    };

    return (
        <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3em', marginBottom: 6 }}>
                        ARCHIVOLT · MESH CONTROL
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Node Dashboard
                    </h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <Button type="primary" onClick={runHealthCheck} loading={checking} style={{ marginBottom: 6 }}>
                        {checking ? 'Scanning...' : 'Scan Now'}
                    </Button>
                    {lastScan && (
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                            Last scan: {lastScan.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Mesh bar */}
            <div style={{ marginBottom: 20 }}>
                <MeshBar online={onlineCount} total={3} />
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                <StatCard label="TOTAL FILES" value={stats.total} accent="var(--accent-green)" />
                <StatCard label="DATA DISTRIBUTED" value={fmtBytes(stats.size)} accent="var(--accent-blue)" />
                <StatCard label="ACTIVE NODES" value={`${onlineCount} / 3`} accent={onlineCount === 3 ? 'var(--accent-green)' : onlineCount >= 2 ? 'var(--accent-yellow)' : '#ff4444'} />
            </div>

            {/* Node cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {NODES.map(node => (
                    <NodeCard key={node.id} node={node} status={nodeStatuses[node.id] || {}} />
                ))}
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 24, fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'center' }}>
                AUTO-REFRESH: 30s · BYTE-INTERLEAVE ARCHITECTURE · XOR PARITY RECOVERY
            </div>
        </div>
    );
}