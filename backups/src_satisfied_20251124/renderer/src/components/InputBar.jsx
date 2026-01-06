import React, { useState, useEffect } from 'react';

const InputBar = ({ onParse, isLoading }) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onParse(url.trim());
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setUrl(text);
                onParse(text);
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            padding: '24px',
            marginBottom: '24px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)'
        }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
                <input
                    type="text"
                    className="input"
                    style={{ flex: 1, fontSize: '15px', padding: '12px 16px' }}
                    placeholder="Paste TikTok or YouTube link here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                />
                <button type="button" className="btn btn-secondary" onClick={handlePaste} disabled={isLoading} style={{ padding: '0 20px' }}>
                    Paste
                </button>
                <button type="submit" className="btn" disabled={isLoading} style={{ padding: '0 24px', fontSize: '15px' }}>
                    {isLoading ? 'Parsing...' : 'Parse Link'}
                </button>
            </form>
        </div>
    );
};

export default InputBar;
