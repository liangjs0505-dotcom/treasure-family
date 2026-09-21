import { useState } from 'react'
import Login from '../Login'
import Register from '../Register'

interface Props {
  onLoggedIn: (username: string) => void
}

export default function Auth({ onLoggedIn }: Props) {
  const [page, setPage] = useState<'login' | 'register'>('login')

  if (page === 'register') {
    return (
      <Register
        onLoggedIn={onLoggedIn}
        onGoLogin={() => setPage('login')}
      />
    )
  }

  return (
    <Login
      onLoggedIn={onLoggedIn}
      onGoRegister={() => setPage('register')}
    />
  )
}
