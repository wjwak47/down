/**
 * AI Service - Unified AI API wrapper
 * Supports Gemini, OpenAI, and other providers
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// AI Provider types
const AI_PROVIDERS = {
    GEMINI: 'gemini',
    OPENAI: 'openai',
    DOUBAO: 'doubao',
    DEEPSEEK: 'deepseek',
    LOCAL: 'local'
};

// Default system prompts
const PROMPTS = {
    CHAT: `You are a professional short-video content analyst. Analyze the provided video transcript and answer user questions about it.

Key capabilities:
- Identify hooks, buildup, climax, and call-to-action
- Analyze content structure and storytelling techniques
- Suggest improvements and optimizations
- Generate catchy titles and variations

Always respond in the same language as the user's question.`,

    ANALYSIS: `Analyze the following video transcript and identify its structure:

1. **Hook** (前3秒): The opening hook technique and its effectiveness
2. **Buildup** (内容铺垫): Key points that build interest
3. **Climax** (高潮): The main payoff or revelation
4. **CTA** (行动引导): Call-to-action at the end

Respond in JSON format:
{
  "hook": { "text": "...", "technique": "...", "effectiveness": "..." },
  "buildup": [{ "text": "...", "purpose": "..." }],
  "climax": { "text": "...", "technique": "..." },
  "ending": { "text": "...", "call_to_action": "..." },
  "suggestions": ["..."]
}`
};

class AIService {
    constructor() {
        this.provider = AI_PROVIDERS.GEMINI;
        this.geminiClient = null;
        this.apiKeys = {
            gemini: null,
            openai: null,
            doubao: null,
            deepseek: null
        };
        this.localUrl = 'http://localhost:1234';
    }

    /**
     * Initialize with API key
     */
    init(provider, apiKey) {
        this.provider = provider;

        if (provider === AI_PROVIDERS.GEMINI && apiKey) {
            this.apiKeys.gemini = apiKey;
            this.geminiClient = new GoogleGenerativeAI(apiKey);
        } else if (apiKey) {
            this.apiKeys[provider] = apiKey;
        }
    }

    /**
     * Set API key for a provider
     */
    setApiKey(provider, key) {
        this.apiKeys[provider] = key;
        if (provider === AI_PROVIDERS.GEMINI && key) {
            this.geminiClient = new GoogleGenerativeAI(key);
        }
    }

    /**
     * Set the active provider
     */
    setProvider(provider) {
        this.provider = provider;
    }

    /**
     * Chat with AI about content
     * @param {string} content - The transcript/content to analyze
     * @param {Array} messages - Chat history [{role: 'user'|'assistant', content: '...'}]
     * @param {string} userMessage - Current user message
     * @returns {Promise<string>} AI response
     */
    async chat(content, messages, userMessage) {
        const systemPrompt = PROMPTS.CHAT + `\n\n【Content to analyze】:\n${content.substring(0, 5000)}`;

        if (this.provider === AI_PROVIDERS.GEMINI) {
            return this.chatWithGemini(systemPrompt, messages, userMessage);
        } else if (this.provider === AI_PROVIDERS.DOUBAO) {
            return this.chatWithDoubao(systemPrompt, messages, userMessage);
        } else if (this.provider === AI_PROVIDERS.OPENAI) {
            return this.chatWithOpenAI(systemPrompt, messages, userMessage);
        } else if (this.provider === AI_PROVIDERS.DEEPSEEK) {
            return this.chatWithDeepSeek(systemPrompt, messages, userMessage);
        } else if (this.provider === AI_PROVIDERS.LOCAL) {
            return this.chatWithLocal(systemPrompt, messages, userMessage);
        }

        throw new Error(`Unsupported provider: ${this.provider}`);
    }

    /**
     * Analyze content structure
     * @param {string} content - The transcript to analyze
     * @returns {Promise<Object>} Analysis result
     */
    async analyze(content) {
        const prompt = PROMPTS.ANALYSIS + `\n\n【Transcript】:\n${content}`;

        let response;
        if (this.provider === AI_PROVIDERS.GEMINI) {
            response = await this.generateWithGemini(prompt);
        } else if (this.provider === AI_PROVIDERS.OPENAI) {
            response = await this.generateWithOpenAI(prompt);
        } else {
            throw new Error(`Unsupported provider: ${this.provider}`);
        }

        // Try to parse JSON from response
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('[AIService] Failed to parse analysis JSON:', e);
        }

        return { raw: response };
    }

    /**
     * Chat with Gemini
     */
    async chatWithGemini(systemPrompt, messages, userMessage) {
        if (!this.geminiClient) {
            throw new Error('Gemini API key not configured');
        }

        const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Build history
        const history = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({
            history,
            generationConfig: {
                maxOutputTokens: 2048,
            },
        });

        // Add system prompt to first message
        const fullMessage = history.length === 0
            ? `${systemPrompt}\n\nUser: ${userMessage}`
            : userMessage;

        const result = await chat.sendMessage(fullMessage);
        return result.response.text();
    }

    /**
     * Generate with Gemini (single prompt)
     */
    async generateWithGemini(prompt) {
        if (!this.geminiClient) {
            throw new Error('Gemini API key not configured');
        }

        const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
    }

    /**
     * Chat with OpenAI-compatible API
     */
    async chatWithOpenAI(systemPrompt, messages, userMessage) {
        const apiKey = this.apiKeys.openai || this.apiKeys[this.provider];
        if (!apiKey) {
            throw new Error(`${this.provider} API key not configured`);
        }

        const baseUrl = this.provider === AI_PROVIDERS.DEEPSEEK
            ? 'https://api.deepseek.com/v1'
            : 'https://api.openai.com/v1';

        const openaiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.provider === AI_PROVIDERS.DEEPSEEK ? 'deepseek-chat' : 'gpt-4o-mini',
                messages: openaiMessages,
                max_tokens: 2048
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.choices[0].message.content;
    }

    /**
     * Generate with OpenAI (single prompt)
     */
    async generateWithOpenAI(prompt) {
        return this.chatWithOpenAI('', [], prompt);
    }

    /**
     * Chat with local LM Studio
     */
    async chatWithLocal(systemPrompt, messages, userMessage) {
        const openaiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(`${this.localUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: openaiMessages,
                max_tokens: 2048
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.choices[0].message.content;
    }

    /**
     * Chat with Doubao (豆包/火山引擎)
     */
    async chatWithDoubao(systemPrompt, messages, userMessage) {
        const apiKey = this.apiKeys.doubao;
        if (!apiKey) {
            throw new Error('豆包 API Key 未配置');
        }

        const doubaoMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ];

        // 火山引擎 API (豆包)
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'ep-20250115204215-dwd98',  // 豆包默认模型
                messages: doubaoMessages,
                max_tokens: 2048
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        return data.choices[0].message.content;
    }

    /**
     * Chat with DeepSeek
     */
    async chatWithDeepSeek(systemPrompt, messages, userMessage) {
        const apiKey = this.apiKeys.deepseek;
        if (!apiKey) {
            throw new Error('DeepSeek API Key not configured');
        }

        const deepseekMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
        ];

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: deepseekMessages,
                max_tokens: 2048
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        return data.choices[0].message.content;
    }

    /**
     * Check if local LM Studio is running
     */
    async checkLocalHealth() {
        try {
            const response = await fetch(`${this.localUrl}/v1/models`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Singleton instance
let aiServiceInstance = null;

export function getAIService() {
    if (!aiServiceInstance) {
        aiServiceInstance = new AIService();
    }
    return aiServiceInstance;
}

export { AIService, AI_PROVIDERS, PROMPTS };
export default AIService;
