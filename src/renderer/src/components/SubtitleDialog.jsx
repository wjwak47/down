import React, { useState, useEffect } from 'react';

const SubtitleDialog = ({ isOpen, onClose, videoInfo, onDownload, availableSubtitles }) => {
    const [subtitles, setSubtitles] = useState([]);
    const [selectedLangs, setSelectedLangs] = useState([]);
    const [format, setFormat] = useState('srt');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && videoInfo) {
            loadSubtitles();
        }
        // Reset state when dialog closes
        if (!isOpen) {
            setSelectedLangs([]);
            setSearchQuery('');
            setError(null);
        }
    }, [isOpen, videoInfo, availableSubtitles]);

    const loadSubtitles = async () => {
        setLoading(true);
        setError(null);
        try {
            // First try to use availableSubtitles prop if provided (from videoInfo)
            if (availableSubtitles && Object.keys(availableSubtitles).length > 0) {
                // Convert the subtitles object to list format
                const subsList = Object.entries(availableSubtitles).map(([key, value]) => ({
                    code: key,
                    name: value.label || key,
                    auto: value.isAuto || false,
                    formats: value.formats || []
                }));
                setSubtitles(subsList);
                console.log('[SubtitleDialog] Using availableSubtitles prop:', subsList);
            } else {
                // Fallback to API call
                const subs = await window.api.getSubtitlesList(videoInfo.webpage_url);
                setSubtitles(subs || []);
                console.log('[SubtitleDialog] Loaded subtitles from API:', subs);
            }
        } catch (err) {
            console.error('[SubtitleDialog] Failed to load subtitles:', err);
            setError('Failed to load subtitles. Please try again.');
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

    // Filter subtitles based on search query
    const filteredSubtitles = subtitles.filter(sub =>
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Separate manual and auto subtitles for better organization
    const manualSubtitles = filteredSubtitles.filter(sub => !sub.auto);
    const autoSubtitles = filteredSubtitles.filter(sub => sub.auto);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ padding: '16px 24px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Download Subtitles</h2>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <svg className="animate-spin" style={{ width: '32px', height: '32px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24">
                                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            Loading subtitles...
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--error-color, #ef4444)' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <svg style={{ width: '48px', height: '48px', margin: '0 auto', opacity: 0.6 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <p style={{ marginBottom: '16px' }}>{error}</p>
                            <button 
                                onClick={loadSubtitles}
                                className="btn btn-secondary"
                                style={{ padding: '8px 16px' }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : subtitles.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <svg style={{ width: '48px', height: '48px', margin: '0 auto', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                </svg>
                            </div>
                            <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No subtitles available</p>
                            <p style={{ fontSize: '14px', opacity: 0.8 }}>This video doesn't have any subtitles or captions.</p>
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
                                    Select Languages ({filteredSubtitles.length} available
                                    {manualSubtitles.length > 0 && autoSubtitles.length > 0 && 
                                        ` • ${manualSubtitles.length} manual, ${autoSubtitles.length} auto`
                                    })
                                </label>
                                <div style={{
                                    maxHeight: '250px',
                                    overflowY: 'auto',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    background: 'var(--bg-card)'
                                }}>
                                    {/* Manual subtitles section */}
                                    {manualSubtitles.length > 0 && (
                                        <>
                                            {autoSubtitles.length > 0 && (
                                                <div style={{ 
                                                    fontSize: '12px', 
                                                    color: 'var(--text-secondary)', 
                                                    marginBottom: '8px',
                                                    fontWeight: 500,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    Manual Subtitles
                                                </div>
                                            )}
                                            {manualSubtitles.map(sub => (
                                                <SubtitleItem 
                                                    key={sub.code} 
                                                    sub={sub} 
                                                    selected={selectedLangs.includes(sub.code)}
                                                    onToggle={() => toggleLanguage(sub.code)}
                                                />
                                            ))}
                                        </>
                                    )}
                                    
                                    {/* Auto-generated captions section */}
                                    {autoSubtitles.length > 0 && (
                                        <>
                                            {manualSubtitles.length > 0 && (
                                                <div style={{ 
                                                    fontSize: '12px', 
                                                    color: 'var(--text-secondary)', 
                                                    marginTop: '16px',
                                                    marginBottom: '8px',
                                                    fontWeight: 500,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    Auto-Generated Captions
                                                </div>
                                            )}
                                            {autoSubtitles.map(sub => (
                                                <SubtitleItem 
                                                    key={sub.code} 
                                                    sub={sub} 
                                                    selected={selectedLangs.includes(sub.code)}
                                                    onToggle={() => toggleLanguage(sub.code)}
                                                />
                                            ))}
                                        </>
                                    )}
                                    
                                    {filteredSubtitles.length === 0 && searchQuery && (
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
                            Download Selected ({selectedLangs.length})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Subtitle item component for cleaner rendering
const SubtitleItem = ({ sub, selected, onToggle }) => (
    <div
        onClick={onToggle}
        style={{
            padding: '10px 12px',
            marginBottom: '5px',
            background: selected ? 'var(--primary-light)' : 'var(--bg-input)',
            border: '1px solid ' + (selected ? 'var(--primary-color)' : 'transparent'),
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
            checked={selected}
            readOnly
            style={{ cursor: 'pointer', accentColor: 'var(--primary-color)' }}
        />
        <span style={{ flex: 1 }}>{sub.name}</span>
        {sub.auto && (
            <span style={{ 
                fontSize: '11px', 
                color: 'var(--text-secondary)', 
                background: 'rgba(255,255,255,0.1)', 
                padding: '2px 8px', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span>🤖</span>
                <span>Auto</span>
            </span>
        )}
    </div>
);

export default SubtitleDialog;
