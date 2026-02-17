import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import Terminal from './components/Terminal'
import { getToken } from './lib/api'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (getToken()) {
      setAuthenticated(true)
    }
  }, [])

  if (!authenticated) {
    return <Auth onAuth={() => setAuthenticated(true)} />
  }

  return <Terminal />
}
