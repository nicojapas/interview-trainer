export async function onRequestPost(context) {
  const { password } = await context.request.json()
  const validPassword = context.env.AUTH_PASSWORD

  if (!validPassword) {
    return new Response(JSON.stringify({ error: 'Auth not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (password !== validPassword) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Simple token: base64(password:timestamp)
  const token = btoa(`${password}:${Date.now()}`)

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
