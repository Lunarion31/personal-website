export async function onRequestPost({request, env}) {
  const headers = {'Cache-Control': 'no-store'};
  if (request.headers.get('Origin') !== new URL(request.url).origin) return new Response('Forbidden', {status: 403, headers});
  if (!env.VISITORS) return Response.json({error: 'not_configured'}, {status: 503, headers});
  const existing = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)lunarion_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const token = existing || crypto.randomUUID();
  try {
    const results = await env.VISITORS.batch([
      env.VISITORS.prepare('INSERT INTO visitors (token) VALUES (?) ON CONFLICT(token) DO NOTHING').bind(token),
      env.VISITORS.prepare('SELECT number FROM visitors WHERE token = ?').bind(token)
    ]);
    const number = results[1].results[0]?.number;
    if (!Number.isSafeInteger(number)) throw new Error('Invalid counter');
    headers['Set-Cookie'] = `lunarion_visitor=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`;
    return Response.json({number}, {headers});
  } catch {
    return Response.json({error: 'unavailable'}, {status: 503, headers});
  }
}
