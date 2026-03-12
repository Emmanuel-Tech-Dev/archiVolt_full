// src/pages/Upload.jsx
import { useState, useRef, useCallback } from 'react';
import { Button, message } from 'antd';
import { uploadFile } from '../api';

const ACCEPTED = '*';
const MAX_MB = 50;

function ShardResult({ shards }) {
    const items = [
        { key: 'a', label: 'LOCAL DISK', color: '#00ff88', icon: '⬡' },
        { key: 'b', label: 'SUPABASE', color: '#3ecfff', icon: '◈' },
        { key: 'c', label: 'CLOUDINARY', color: '#ff6b35', icon: '◎' },
        { key: 'p', label: 'PARITY', color: '#ffd166', icon: '⊕' },
    ];

    return (
        <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 16 }}>
                SHARD DISTRIBUTION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {items.map(item => {
                    const shard = shards[item.key];
                    if (!shard) return null;
                    return (
                        <div key={item.key} style={{
                            background: 'var(--bg-elevated)',
                            border: `1px solid ${item.color}22`,
                            borderRadius: 'var(--radius)',
                            padding: '14px 16px',
                            animation: 'fadeUp 0.4s ease forwards',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
                                <span style={{ fontSize: 9, color: item.color, letterSpacing: '0.15em', fontWeight: 600 }}>
                                    {item.label}
                                </span>
                                {shard.role === 'parity' && (
                                    <span style={{ fontSize: 8, color: '#ffd166', marginLeft: 'auto', letterSpacing: '0.1em' }}>XOR</span>
                                )}
                            </div>
                            <div style={{
                                fontSize: 9, color: 'var(--text-dim)',
                                wordBreak: 'break-all', lineHeight: 1.6,
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {shard.key}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ProgressBar({ progress }) {
    return (
        <div style={{ margin: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.15em' }}>UPLOADING & SHARDING</span>
                <span style={{ fontSize: 9, color: 'var(--accent-green)' }}>{progress}%</span>
            </div>
            <div style={{ height: 2, background: 'var(--border-dim)', borderRadius: 1 }}>
                <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--accent-green)',
                    boxShadow: '0 0 8px var(--accent-green)',
                    borderRadius: 1,
                    transition: 'width 0.2s ease',
                }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: 'var(--text-dim)' }}>
                {progress < 100
                    ? 'Transferring bytes to server...'
                    : 'Distributing shards across nodes...'}
            </div>
        </div>
    );
}

export default function Upload() {
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const inputRef = useRef();

    const handleFile = useCallback((f) => {
        if (f.size > MAX_MB * 1024 * 1024) {
            message.error(`File exceeds ${MAX_MB}MB limit.`);
            return;
        }
        setFile(f);
        setResult(null);
        setProgress(0);
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const onInputChange = (e) => {
        const f = e.target.files[0];
        if (f) handleFile(f);
    };

    const handleUpload = async () => {
        if (!file || uploading) return;
        setUploading(true);
        setProgress(0);
        setResult(null);
        try {
            const data = await uploadFile(file, setProgress);
            setResult(data.file);
            message.success(`"${file.name}" distributed across 3 nodes.`);
        } catch (err) {
            message.error(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
    };

    const fmtSize = (b) => {
        if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
        if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
        return `${b} B`;
    };

    return (
        <div style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3em', marginBottom: 6 }}>
                    ARCHIVOLT · DISTRIBUTE
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Upload File
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 8, lineHeight: 1.7 }}>
                    Files are split into 3 interleaved byte shards and distributed across Local, Supabase, and Cloudinary.
                    A XOR parity shard is stored locally for fault recovery.
                </p>
            </div>

            {/* Drop zone */}
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                    border: `1px dashed ${dragging ? 'var(--color-accent)' : file ? 'var(--color-accent)' : 'var(--color-accent-light)'}`,
                    borderRadius: 'var(--radius)',
                    background: dragging ? 'var(--color-bg-base)' : 'var(--color-bg-elevated)',
                    padding: '48px 32px',
                    textAlign: 'center',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED}
                    onChange={onInputChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                />

                {!file ? (
                    <>
                        <div style={{ fontSize: 32, marginBottom: 16, color: 'var(--text-dim)' }}>⬡</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Drop a file here or click to browse
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                            MAX {MAX_MB}MB · ALL FILE TYPES
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 24, marginBottom: 12, color: 'var(--accent-green)' }}>◈</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, fontWeight: 600 }}>
                            {file.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                            {fmtSize(file.size)} · {file.type || 'unknown type'}
                        </div>
                    </>
                )}
            </div>

            {/* Progress */}
            {uploading && <ProgressBar progress={progress} />}

            {/* Actions */}
            {file && !uploading && !result && (
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <Button type="primary" onClick={handleUpload} style={{ flex: 1 }}>
                        Distribute File
                    </Button>
                    <Button onClick={reset}>Clear</Button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{
                    marginTop: 28,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--accent-green)22',
                    borderRadius: 'var(--radius)',
                    padding: 24,
                    animation: 'fadeUp 0.4s ease',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 9, color: 'var(--accent-green)', letterSpacing: '0.2em' }}>
                            ✓ DISTRIBUTED SUCCESSFULLY
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>ID: #{result.id}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {result.filename}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{fmtSize(result.size)}</div>

                    <ShardResult shards={result.shards} />

                    <Button onClick={reset} style={{ marginTop: 24, width: '100%' }}>
                        Upload Another File
                    </Button>
                </div>
            )}
        </div>
    );
}