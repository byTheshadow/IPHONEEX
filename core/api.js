// core/api.js
const API = (() => {
    let cachedModels = [];

    async function getConfig() {
        const baseUrl = await Store.getSetting('api_base_url', '');
        const apiKey = await Store.getSetting('api_key', '');
        const model = await Store.getSetting('api_model', '');
        return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey, model };
    }

    async function fetchModels() {
        const { baseUrl, apiKey } = await getConfig();
        if (!baseUrl) throw new Error('API Base URL not configured');
        try {
            const res = await fetch(`${baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            cachedModels = (data.data || data || []).map(m => ({ id: m.id, name: m.id }));
            return cachedModels;
        } catch (e) {
            Logger.error('Fetch models failed', e.message);
            throw e;
        }
    }

    function getCachedModels() { return cachedModels; }

    async function chat(messages, options = {}) {
        const { baseUrl, apiKey, model } = await getConfig();
        if (!baseUrl) throw new Error('API Base URL not configured');
        if (!model && !options.model) throw new Error('Model not selected');

        const body = {
            model: options.model || model,
            messages,
            temperature: options.temperature ?? 0.8,
            max_tokens: options.max_tokens ?? 4096,
            stream: options.stream ?? true,
            ...options.extraParams
        };

        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
            signal: options.signal
        });

        if (!res.ok) {
            const errText = await res.text();
            Logger.error(`API Error ${res.status}`, errText);
            throw new Error(`API Error ${res.status}: ${errText}`);
        }

        if (options.stream !== false) {
            return streamResponse(res, options.onToken, options.onDone);
        } else {
            const data = await res.json();
            return data.choices?.[0]?.message?.content || '';
        }
    }

    async function streamResponse(res, onToken, onDone) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const token = json.choices?.[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            if (onToken) onToken(token, fullText);
                        }
                    } catch {}
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') { Logger.error('Stream error', e.message); throw e; }
        }

        if (onDone) onDone(fullText);
        return fullText;
    }

    return { getConfig, fetchModels, getCachedModels, chat };
})();
