// src/pages/Settings.jsx
import { useState } from 'react';
import { Button, message } from 'antd';

const CONFIG_ITEMS = [
    {
        section: 'DATABASE',
        items: [
            { key: 'DB_HOST', label: 'Host', placeholder: 'localhost', type: 'text' },
            { key: 'DB_PORT', label: 'Port', placeholder: '3306', type: 'text' },
            { key: 'DB_USER', label: 'User', placeholder: 'root', type: 'text' },
            { key: 'DB_PASSWORD', label: 'Password', placeholder: '••••••••', type: 'password' },
            { key: 'DB_NAME', label: 'Database', placeholder: 'archivolt', type: 'text' },
        ],
    },
    {
        section: 'SUPABASE',
        color: '#3ecfff',
        items: [
            { key: 'SUPA_URL', label: 'Project URL', placeholder: 'https://xxx.supabase.co', type: 'text' },
            { key: 'SUPA_KEY', label: 'Service Role Key', placeholder: 'eyJ...', type: 'password' },
        ],
    },
    {
        section: 'CLOUDINARY',
        color: '#ff6b35',
        items: [
            { key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloud Name', placeholder: 'my-cloud', type: 'text' },
            { key: 'CLOUDINARY_API_KEY', label: 'API Key', placeholder: '123456789', type: 'text' },
            { key: 'CLOUDINARY_API_SECRET', label: 'API Secret', placeholder: 'abc123...', type: 'password' },
        ],
    },
];

const SHARD_INFO = [
    { label: 'Shard A', provider: 'Local Disk', formula: 'i % 3 === 0', color: '#00ff88', icon: '⬡' },
    { label: 'Shard B', provider: 'Supabase', formula: 'i % 3 === 1', color: '#3ecfff', icon: '◈' },
    { label: 'Shard C', provider: 'Cloudinary', formula: 'i % 3 === 2', color: '#ff6b35', icon: '◎' },
    { label: 'Parity P', provider: 'Local Disk', formula: 'A ⊕ B ⊕ C', color: '#ffd166', icon: '⊕' },
];

function Field({ item, value, onChange, show, onToggle }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{
                display: 'block', fontSize: 9,
                color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 6,
            }}>
                {item.label}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    type={item.type === 'password' && !show ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => onChange(item.key, e.target.value)}
                    placeholder={item.placeholder}
                    style={{
                        flex: 1,
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        padding: '8px 12px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
                />
                {item.type === 'password' && (
                    <button
                        onClick={onToggle}
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-dim)',
                            color: 'var(--text-dim)',
                            borderRadius: 'var(--radius)',
                            padding: '0 12px',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.1em',
                        }}
                    >
                        {show ? 'HIDE' : 'SHOW'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function Settings() {
    const [values, setValues] = useState({});
    const [visible, setVisible] = useState({});

    const handleChange = (key, val) => setValues(prev => ({ ...prev, [key]: val }));
    const toggleVisible = (key) => setVisible(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSave = () => {
        message.info('Settings are managed via your .env file on the server. Restart the server after changes.');
    };

    return (
        <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3em', marginBottom: 6 }}>
                    ARCHIVOLT · CONFIG
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Settings
                </h1>
                <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: 'rgba(255,209,102,0.06)',
                    border: '1px solid rgba(255,209,102,0.2)',
                    borderRadius: 'var(--radius)',
                    fontSize: 10, color: '#ffd166', lineHeight: 1.7,
                }}>
                    ⚠ These values are for reference only. Configuration is managed via your <code style={{ fontFamily: 'var(--font-mono)' }}>.env</code> file on the server.
                    Restart the server after making changes.
                </div>
            </div>

            {/* Config sections */}
            {CONFIG_ITEMS.map(section => (
                <div key={section.section} style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius)',
                    marginBottom: 16,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border-dim)',
                        background: 'var(--bg-elevated)',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        {section.color && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: section.color, boxShadow: `0 0 6px ${section.color}` }} />
                        )}
                        <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {section.section}
                        </span>
                    </div>
                    <div style={{ padding: '20px 20px 4px' }}>
                        {section.items.map(item => (
                            <Field
                                key={item.key}
                                item={item}
                                value={values[item.key] || ''}
                                onChange={handleChange}
                                show={visible[item.key]}
                                onToggle={() => toggleVisible(item.key)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <Button type="primary" onClick={handleSave} style={{ marginBottom: 48 }}>
                Save Reference
            </Button>

            {/* Architecture info */}
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 16 }}>
                    SHARD ARCHITECTURE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {SHARD_INFO.map(s => (
                        <div key={s.label} style={{
                            background: 'var(--bg-surface)',
                            border: `1px solid ${s.color}22`,
                            borderRadius: 'var(--radius)',
                            padding: '16px 18px',
                            display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                            <div style={{ fontSize: 20, color: s.color, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize: 10, color: s.color, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 3 }}>
                                    {s.label}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>{s.provider}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                    {s.formula}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* System info */}
            <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 16 }}>
                    SYSTEM INFO
                </div>
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius)',
                    padding: '16px 20px',
                }}>
                    {[
                        ['API Endpoint', 'http://localhost:3000'],
                        ['Architecture', '3-shard byte interleave + XOR parity'],
                        ['Max Upload Size', '50 MB'],
                        ['Fault Tolerance', 'Single node failure (RAID-5 equivalent)'],
                        ['Recovery Strategy', 'Silent XOR parity reconstruction'],
                    ].map(([k, v]) => (
                        <div key={k} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0', borderBottom: '1px solid var(--border-dim)',
                            fontSize: 11,
                        }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.1em' }}>{k.toUpperCase()}</span>
                            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}