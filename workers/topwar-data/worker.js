const API = "https://api.github.com/repos/hiphop5782/topwar-json";
const ROOTS = new Set(["power", "realpower", "overall", "cross-pvp", "generated", "servers", "liondance", "kartz", "allianceDefense", "chunks"]);
const HISTORY_PATH = "_history/servers-7d.json";
const SHA = /^[a-f0-9]{40}$/;

function failure(code, stage, status) {
    return Object.assign(new Error(code), { diagnosticCode: code, stage, upstreamStatus: status });
}

function permittedPath(path) {
    const segments = path.split("/");
    if (segments.some(segment => !segment || segment.startsWith(".") || !/^[a-zA-Z0-9_.-]+$/.test(segment))) return false;
    const dataFile = /\.(json|part|txt|chunk)(?:[.-]?\d+)?$/.test(segments.at(-1));
    return path === "index.json" || path === "servers.json" || path === HISTORY_PATH || (segments.length > 1 && ROOTS.has(segments[0]) && dataFile);
}

function reply(body, status, origin, extra = {}) {
    const headers = new Headers({ "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff", ...extra });
    if (origin) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Accept, Content-Type");
    }
    return new Response(body, { status, headers });
}

async function github(path, env, raw = false, repo = "topwar-json") {
    const stage = raw ? "file" : path.startsWith("commits?") ? "history" : "head";
    let response;
    let target = new URL(`${API.replace(/topwar-json$/, repo)}/${path}`);
    const signal = AbortSignal.timeout(15000);
    try {
        for (let redirects = 0; ; redirects++) {
            response = await fetch(target.href, {
                headers: {
                    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                    Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
                    "User-Agent": "topwar-json-worker"
                },
                redirect: "manual",
                signal
            });
            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            const location = response.headers.get("Location");
            await response.body?.cancel();
            if (!location || redirects >= 3) throw failure("github_redirect_error", stage);
            target = new URL(location, target);
            if (target.origin !== "https://api.github.com" || target.username || target.password) throw failure("github_redirect_blocked", stage);
        }
    } catch (error) {
        if (error.diagnosticCode) throw error;
        throw failure(error?.name === "TimeoutError" ? "github_timeout" : "github_network_error", stage);
    }
    if (!response.ok) {
        const limited = response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0";
        await response.body?.cancel();
        const code = limited ? "github_rate_limited" : ({ 401: "github_unauthorized", 403: "github_forbidden", 404: "github_not_found", 422: "github_invalid_ref" }[response.status] || "github_upstream_error");
        throw failure(code, stage, response.status);
    }
    return response;
}

function file(path, ref, env, repo = "topwar-json") {
    return github(`contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`, env, true, repo);
}

function resolveSource(path) {
    const aliases = { "api/servers": "servers/servers-object-compact.json", "api/servers/compact": "servers/servers-object-compact.json", "api/servers/popular": "servers/servers-object-popular.json" };
    if (aliases[path]) return { repo: "topwar-json", path: aliases[path] };
    const power = /^api\/realpower\/([1-9][0-9]{0,5})$/.exec(path);
    if (power) return { repo: "topwar-json", path: `realpower/${power[1]}.json` };
    const dynamic = /^data\/(topwar-json|topwar-thief|topwar-reward-finder)\/(.+)$/.exec(path);
    return dynamic ? { repo: dynamic[1], path: dynamic[2] } : { repo: "topwar-json", path };
}

function permittedSource(repo, path) {
    if (repo === "topwar-json") return permittedPath(path);
    return path.startsWith("data/") && path.endsWith(".json") && path.split("/").every(segment => /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(segment));
}

// Cache keys exclude caller-supplied timestamps and never contain the GitHub token.
async function cached(cache, key, ttl, ctx, produce) {
    let hit;
    try { hit = await cache.match(key); } catch { throw failure("cache_read_error", "cache"); }
    if (hit) return hit;
    const response = await produce();
    const stored = new Response(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "text/plain; charset=utf-8", "Cache-Control": `public, max-age=${ttl}` } });
    ctx.waitUntil(cache.put(key, stored.clone()).catch(() => console.error("TopWar cache write failed")));
    return stored;
}

async function serve(path, revision, url, env, ctx) {
    const cache = caches.default;
    const key = suffix => new Request(`${url.origin}/__topwar_cache_v1/${suffix}`);
    if (path === HISTORY_PATH) {
        return cached(cache, key("history-7d"), 3600, ctx, async () => {
            const until = new Date(Date.now() - 7 * 86400000).toISOString();
            const commits = await (await github(`commits?sha=main&path=servers%2Fservers-object.json&until=${encodeURIComponent(until)}&per_page=1`, env)).json();
            if (!Array.isArray(commits)) throw failure("invalid_history", "history");
            if (commits.length === 0) return Response.json(null);
            const sha = commits[0]?.sha;
            if (!SHA.test(sha || "")) throw failure("invalid_history_sha", "history");
            return file("servers/servers-object.json", sha, env);
        });
    }

    let ref = revision.startsWith("git:") ? revision.slice(4) : null;
    if (ref !== null && !SHA.test(ref)) return null;
    if (!ref) {
        const response = await cached(cache, key("head-main"), 60, ctx, async () => {
            const commit = await (await github("commits/main", env)).json();
            if (!SHA.test(commit?.sha || "")) throw failure("invalid_head_sha", "head");
            return Response.json({ sha: commit.sha });
        });
        ref = (await response.json()).sha;
    }

    return cached(cache, key(`${ref}/${path}`), 86400, ctx, async () => {
        const response = await file(path, ref, env);
        if (path !== "index.json") return response;
        const index = await response.json();
        if (!index || typeof index !== "object" || !index.datasets) throw failure("invalid_data_index", "index");
        // Existing FE passes revision to every dataset and chunk request.
        return Response.json({ ...index, sourceRevision: index.revision, revision: `git:${ref}` });
    });
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin");
        const allowed = new Set(String(env.ALLOWED_ORIGINS || "https://www.progamer.info,https://datahub.progamer.info,https://sysout.co.kr,https://topwar.sysout.co.kr,https://www.sysout.co.kr,http://localhost:5656").split(",").map(value => value.trim()));
        const url = new URL(request.url);
        if (url.pathname === "/health" && request.method === "GET") return reply(JSON.stringify({ ok: true, service: "topwar-api" }), 200, allowed.has(origin) ? origin : null, { "Content-Type": "application/json" });
        if (!origin || !allowed.has(origin)) return reply("Forbidden", 403);
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) return reply("Method not allowed", 405, origin, { Allow: "GET, HEAD, OPTIONS" });

        let path;
        try { path = decodeURIComponent(url.pathname.slice(1)); } catch { return reply("Invalid path", 400, origin); }
        const source = resolveSource(path);
        path = source.path;
        if (!permittedSource(source.repo, path)) return reply("Not found", 404, origin);
        if (request.method === "OPTIONS") {
            const method = request.headers.get("Access-Control-Request-Method");
            const headers = (request.headers.get("Access-Control-Request-Headers") || "").toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
            if (!["GET", "HEAD"].includes(method) || headers.some(header => !["accept", "content-type"].includes(header))) return reply("Forbidden", 403, origin);
            return reply(null, 204, origin, { "Access-Control-Max-Age": "3600" });
        }
        if (!env.GITHUB_TOKEN) return reply("Server configuration error", 503, origin);
        try {
            // Optional binding: enable only after measuring normal bulk requests/shared IPs.
            if (env.DATA_RATE_LIMITER) {
                const { success } = await env.DATA_RATE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" });
                if (!success) return reply("Too many requests", 429, origin, { "Retry-After": "60" });
            }
            const response = source.repo === "topwar-json"
                ? await serve(path, url.searchParams.get("revision") || "", url, env, ctx)
                : await cached(caches.default, new Request(`${url.origin}/__topwar_cache_v1/${source.repo}/${path}`), 120, ctx, () => file(path, "main", env, source.repo));
            if (!response) return reply("Invalid revision", 400, origin);
            if (request.method === "HEAD") {
                // A cached response is a tee; waiting for cancellation can block until its sibling is consumed.
                response.body?.cancel().catch(() => {});
                return reply(null, 200, origin);
            }
            return reply(response.body, 200, origin, { "Content-Type": path.endsWith(".json") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8" });
        } catch (error) {
            const diagnostic = { error: error.diagnosticCode || (error instanceof SyntaxError ? "invalid_upstream_json" : "worker_processing_error"), stage: error.stage || "worker" };
            if (error.upstreamStatus) diagnostic.upstreamStatus = error.upstreamStatus;
            console.error("TopWar upstream failed:", JSON.stringify(diagnostic));
            return reply(JSON.stringify(diagnostic), 502, origin, { "Content-Type": "application/json; charset=utf-8" });
        }
    }
};
