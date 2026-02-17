import { useState } from 'react'
import { login } from '../lib/api'

export default function Auth({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(password)
      onAuth()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#0f0'
    }}>
      <form onSubmit={handleSubmit} style={{
        padding: '2rem',
        border: '2px solid #0f0',
        borderRadius: '4px'
      }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Interview Trainer</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#000',
            border: '1px solid #0f0',
            color: '#0f0',
            fontFamily: 'Courier New, monospace',
            fontSize: '1rem'
          }}
        />
        {error && <p style={{ color: '#f00', marginTop: '0.5rem' }}>{error}</p>}
        <button type="submit" style={{
          marginTop: '1rem',
          width: '100%',
          padding: '0.5rem',
          background: '#0f0',
          border: 'none',
          color: '#000',
          cursor: 'pointer',
          fontFamily: 'Courier New, monospace',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}>
          Login
        </button>
      </form>
    </div>
  )
}
