const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  if (!res.ok) throw new Error('Invalid password')
  const { token } = await res.json()
  setToken(token)
  return token
}

export async function loadQuestions() {
  const res = await fetch('/api/questions')
  if (!res.ok) throw new Error('Failed to load questions')
  return await res.json()
}

export async function getAiExplanation(question, options) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ question, options })
  })
  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      throw new Error('Unauthorized')
    }
    throw new Error('Failed to get explanation')
  }
  const { explanation } = await res.json()
  return explanation
}
