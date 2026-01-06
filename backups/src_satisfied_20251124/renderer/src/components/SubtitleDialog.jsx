import React, { useState, useEffect } from 'react';

const SubtitleDialog = ({ isOpen, onClose, videoInfo, onDownload }) => {
    const [subtitles, setSubtitles] = useState([]);
    const [selectedLangs, setSelectedLangs] = useState([]);
    const [format, setFormat] = useState('srt');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && videoInfo) {
            loadSubtitles();
        }
    }, [isOpen, videoInfo]);

    const loadSubtitles = async () => {
        setLoading(true);
        try {
            const subs = await window.api.getSubtitlesList(videoInfo.webpage_url);
            setSubtitles(subs);
            console.log('[SubtitleDialog] Loaded subtitles:', subs);
        } catch (error) {
            console.error('[SubtitleDialog] Failed to load subtitles:', error);
            setSubtitles([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = (code) => {
        setSelectedLangs(prev =>
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code]
        );
    };

    const handleDownload = () => {
        if (selectedLangs.length === 0) {
            alert('Please select at least one language');
            return;
        }

        const hasAutoSubs = subtitles.some(s => selectedLangs.includes(s.code) && s.auto);
        onDownload({
            languages: selectedLangs,
            format,
            autoSubs: hasAutoSubs
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ padding: '16px 24px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Download Subtitles</h2>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                            Loading subtitles...
                        </div>
                    ) : subtitles.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                            No subtitles available for this video
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Search Languages</label>
                                <input
                                    type="text"
                                    placeholder="Type to search (e.g., English, Chinese, 中文)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Select Languages ({subtitles.filter(sub =>
                                        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        sub.code.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).length} available)
                                </label>
                                <div style={{
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    background: 'var(--bg-card)'
                                }}>
                                    {subtitles
                                        .filter(sub =>
                                            sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            sub.code.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(sub => (
                                            <div
                                                key={sub.code}
                                                onClick={() => toggleLanguage(sub.code)}
                                                style={{
                                                    padding: '10px',
                                                    marginBottom: '5px',
                                                    background: selectedLangs.includes(sub.code) ? 'var(--primary-light)' : 'var(--bg-input)',
                                                    border: '1px solid ' + (selectedLangs.includes(sub.code) ? 'var(--primary-color)' : 'transparent'),
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLangs.includes(sub.code)}
                                                    readOnly
                                                    style={{ cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                                                />
                                                <span>{sub.name}</span>
                                                {sub.auto && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>🤖 Auto</span>}
                                            </div>
                                        ))}
                                    {subtitles.filter(sub =>
                                        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        sub.code.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                                No languages match your search
                                            </div>
                                        )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Format</label>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {['srt', 'vtt', 'ass', 'txt'].map(fmt => (
                                        <label key={fmt} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                            <input
                                                type="radio"
                                                name="format"
                                                value={fmt}
                                                checked={format === fmt}
                                                onChange={(e) => setFormat(e.target.value)}
                                                style={{ accentColor: 'var(--primary-color)' }}
                                            />
                                            <span style={{ fontSize: '14px' }}>{fmt.toUpperCase()}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    {subtitles.length > 0 && (
                        <button
                            className="btn"
                            onClick={handleDownload}
                            disabled={selectedLangs.length === 0}
                            style={{
                                opacity: selectedLangs.length === 0 ? 0.5 : 1,
                                cursor: selectedLangs.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Download Selected
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubtitleDialog;
