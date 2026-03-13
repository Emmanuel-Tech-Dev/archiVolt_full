// src/pages/Ledger.jsx
import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Modal, message, Tooltip } from 'antd';
import { getLedger, deleteLedgerEntry, downloadFile } from '../api';

const PROVIDER_COLOR = {
    local: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
    supabase: { color: '#3ecfff', bg: 'rgba(62,207,255,0.08)', border: 'rgba(62,207,255,0.2)' },
    cloudinary: { color: '#ff6b35', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.2)' },
};

function ProviderTag({ provider }) {
    const style = PROVIDER_COLOR[provider] || {};
    return (
        <span style={{
            fontSize: 8, letterSpacing: '0.12em', padding: '2px 7px',
            border: `1px solid ${style.border || 'var(--border-dim)'}`,
            color: style.color || 'var(--text-dim)',
            background: style.bg || 'transparent',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
        }}>
            {provider}
        </span>
    );
}

function fmtSize(b) {
    if (!b) return '—';
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
    return `${b} B`;
}

function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Ledger() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [downloading, setDownloading] = useState({});
    const [deleting, setDeleting] = useState({});

    const fetchData = useCallback(async (p = page) => {
        setLoading(true);
        try {
            const res = await getLedger(pageSize, (p - 1) * pageSize);
            setData(res.data || []);
            setTotal(res.total || 0);
        } catch (err) {
            message.error(err.message || 'Failed to load ledger.');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => { fetchData(); }, [page]);

    const handleDownload = async (record) => {
        setDownloading(prev => ({ ...prev, [record.id]: true }));
        try {
            await downloadFile(record.id, record.filename);
            message.success(`Downloaded "${record.filename}"`);
        } catch (err) {
            message.error(err.message || 'Download failed.');
        } finally {
            setDownloading(prev => ({ ...prev, [record.id]: false }));
        }
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: 'Delete ledger entry?',
            content: (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    This removes <strong style={{ color: 'var(--text-primary)' }}>{record.filename}</strong> from the ledger.
                    Physical shard files on each provider are not deleted.
                </span>
            ),
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                setDeleting(prev => ({ ...prev, [record.id]: true }));
                try {
                    await deleteLedgerEntry(record.id);
                    message.success(`Entry #${record.id} deleted.`);
                    fetchData();
                } catch (err) {
                    message.error(err.message || 'Delete failed.');
                } finally {
                    setDeleting(prev => ({ ...prev, [record.id]: false }));
                }
            },
        });
    };

    const columns = [
        {
            title: '#',
            dataIndex: 'id',
            width: 52,
            render: (id) => (
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>#{id}</span>
            ),
        },
        {
            title: 'Filename',
            dataIndex: 'filename',
            filters: [
                {
                    text: 'Joe',
                    value: 'Joe',
                },
                {
                    text: 'Category 1',
                    value: 'Category 1',
                    children: [
                        {
                            text: 'Yellow',
                            value: 'Yellow',
                        },
                        {
                            text: 'Pink',
                            value: 'Pink',
                        },
                    ],
                },
                {
                    text: 'Category 2',
                    value: 'Category 2',
                    children: [
                        {
                            text: 'Green',
                            value: 'Green',
                        },
                        {
                            text: 'Black',
                            value: 'Black',
                        },
                    ],
                },
            ],
            filterMode: 'tree',
            filterSearch: true,
            onFilter: (value, record) => record.filename.includes(value),
            render: (name, record) => (
                <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 12, marginBottom: 2 }}>{name}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.05em' }}>{record.mime_type || '—'}</div>
                </div>
            ),
        },
        {
            title: 'Size',
            dataIndex: 'file_size',
            width: 90,
            defaultSortOrder: 'descend',
            sorter: (a, b) => a.file_size - b.file_size,
            render: (size) => (
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{fmtSize(size)}</span>
            ),
        },
        {
            title: 'Nodes',
            width: 200,
            //  tags: [shard_a_provider, shard_b_provider, shard_c_provider]

            render: (_, record) => (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <ProviderTag provider={record.shard_a_provider} />
                    <ProviderTag provider={record.shard_b_provider} />
                    <ProviderTag provider={record.shard_c_provider} />
                </div>
            ),
        },
        {
            title: 'Uploaded',
            dataIndex: 'created_at',
            width: 160,
            render: (ts) => (
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{fmtDate(ts)}</span>
            ),
        },
        {
            title: '',
            width: 140,
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>

                    <Button
                        size="small"
                        type="primary"
                        loading={downloading[record.id]}
                        onClick={() => handleDownload(record)}
                    >
                        Download
                    </Button>

                    <Button
                        size="small"
                        danger
                        loading={deleting[record.id]}
                        onClick={() => handleDelete(record)}
                    >
                        Delete
                    </Button>

                </div>
            ),
        },
    ];


    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
        },
        getCheckboxProps: record => ({
            disabled: record.name === 'Disabled User', // Column configuration not to be checked
            name: record.name,
        }),
    };

    return (
        <div style={{ padding: 32 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3em', marginBottom: 6 }}>
                        ARCHIVOLT · LEDGER
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        File Ledger
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                        {total} {total === 1 ? 'entry' : 'entries'}
                    </span>
                    <Tooltip title="Refetch data " placement='top'>
                        <Button onClick={() => fetchData()}>Refresh</Button>
                    </Tooltip>

                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'var(--color-bg-base)',
                // border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
            }}>
                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    rowSelection={{ type: "checkbox", ...rowSelection }}

                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        onChange: (p) => setPage(p),
                        showSizeChanger: false,
                        style: { padding: '16px 24px', margin: 0 },
                    }}
                    locale={{
                        emptyText: (
                            <div style={{ padding: '48px 0', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 12, }}>⬡</div>
                                <div style={{ fontSize: 11, letterSpacing: '0.1em' }}>
                                    NO FILES IN LEDGER
                                </div>
                                <div style={{ fontSize: 10, marginTop: 8 }}>
                                    Upload a file to get started
                                </div>
                            </div>
                        ),
                    }}
                />
            </div>
        </div>
    );
}