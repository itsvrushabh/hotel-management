// hotel-management/frontend/server.ts
// SPA server powered by Bun with client bundle compilation and API reverse proxy

const port = Number(process.env.PORT) || 3000;
const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8088';

// Build client bundle into dist
const buildResult = await Bun.build({
    entrypoints: ['./src/app.tsx'],
    outdir: './dist',
    target: 'browser',
    minify: process.env.NODE_ENV === 'production',
});

if (!buildResult.success) {
    console.error('Failed to bundle frontend:', buildResult.logs);
}

const indexHtml = await Bun.file('./index.html').text();

Bun.serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        // 1. Health check
        if (url.pathname === '/health') {
            return Response.json({ status: 'healthy', service: 'hotel-frontend' });
        }

        // 2. API proxy
        if (url.pathname.startsWith('/api/')) {
            const targetUrl = `${backendUrl}${url.pathname}${url.search}`;
            try {
                return await fetch(targetUrl, {
                    method: req.method,
                    headers: req.headers,
                    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
                });
            } catch (err: unknown) {
                return Response.json({ error: 'Backend unreachable', details: String(err) }, { status: 502 });
            }
        }

        // 3. Serve bundled JS files
        if (url.pathname === '/app.js' || url.pathname.endsWith('.js')) {
            const fileName = url.pathname === '/app.js' ? './dist/app.js' : `./dist${url.pathname}`;
            const file = Bun.file(fileName);
            if (await file.exists()) {
                return new Response(file, {
                    headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
                });
            }
        }

        // 4. Serve CSS files if any
        if (url.pathname.endsWith('.css')) {
            const file = Bun.file(`./dist${url.pathname}`);
            if (await file.exists()) {
                return new Response(file, {
                    headers: { 'Content-Type': 'text/css; charset=utf-8' },
                });
            }
        }

        // 5. SPA fallback HTML
        return new Response(indexHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    },
});

console.log(`Hotel Frontend running on http://0.0.0.0:${port} (proxied to ${backendUrl})`);
