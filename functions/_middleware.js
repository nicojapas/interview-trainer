export async function onRequest(context) {
  const url = new URL(context.request.url)

  // Skip auth for login endpoint
  if (url.pathname === '/api/auth') {
    return await context.next()
  }

  // Require auth for other API endpoints
  if (url.pathname.startsWith('/api/')) {
    const authHeader = context.request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.substring(7)

    try {
      // Simple validation: decode and check if password matches
      const decoded = atob(token)
      const [password] = decoded.split(':')

      if (password !== context.env.AUTH_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  return await context.next()
}
