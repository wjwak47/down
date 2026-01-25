import { useState, useEffect, useRef } from 'react';

/**
 * AI Chat Dialog Component
 * A modal dialog for chatting with AI about content
 */
export default function AIChatDialog({
    isOpen,
    onClose,
    content,
    title = 'AI Assistant',
    onAnalyze
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Initial greeting on open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: `Hello! I've read this content and I'm ready to help. You can ask me questions like:\n\n• What are the highlights of this content?\n• How can I improve the opening hook?\n• Generate 3 catchy titles for me\n• Who is the target audience?`
            }]);
        }
    }, [isOpen]);

    // Reset when content changes
    useEffect(() => {
        setMessages([]);
    }, [content]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await window.api.aiChat({
                content,
                messages: messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0),
                userMessage: input.trim()
            });

            if (response.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `❌ Error: ${response.error || 'Failed to get response'}`
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-2xl h-[600px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                            <span className="material-symbols-outlined text-xl">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">psychology</span>
                                Based on content + knowledge base
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                {/* Messages Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-black/20"
                >
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${msg.role === 'user'
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                : 'bg-indigo-600 border-indigo-500 text-white'
                                }`}>
                                <span className="material-symbols-outlined text-base">
                                    {msg.role === 'user' ? 'person' : 'smart_toy'}
                                </span>
                            </div>

                            {/* Bubble */}
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user'
                                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tr-sm'
                                : 'bg-indigo-50 dark:bg-indigo-900/10 text-slate-800 dark:text-slate-100 border border-indigo-100 dark:border-indigo-800/30 rounded-tl-sm'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-base text-white">smart_toy</span>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 rounded-tl-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-base animate-spin text-slate-400">progress_activity</span>
                                <span className="text-xs text-slate-400">AI is thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your question... (Shift+Enter for new line)"
                            className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[50px] max-h-[150px]"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={`absolute right-2 bottom-2 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${input.trim() && !isLoading
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">send</span>
                        </button>
                    </div>
                    <div className="mt-2 flex justify-between items-center px-1">
                        <p className="text-[10px] text-slate-400">
                            AI may generate inaccurate information. Verify important facts.
                        </p>
                        {onAnalyze && (
                            <button
                                onClick={() => { onClose(); onAnalyze(); }}
                                className="text-[11px] text-slate-400 hover:text-indigo-500 transition-colors"
                            >
                                Switch to Deep Analysis →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
