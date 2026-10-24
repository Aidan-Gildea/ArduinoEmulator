import { useState } from 'react'

interface Props {
  onLogin: () => void
}

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fading, setFading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFading(true)
    setTimeout(onLogin, 280)
  }

  return (
    <div className="login-page">
      <div className="login-pcb" />
      <div className="login-corner login-corner-tl" />
      <div className="login-corner login-corner-tr" />
      <div className="login-corner login-corner-bl" />
      <div className="login-corner login-corner-br" />

      <div className={`login-card${fading ? ' login-card-out' : ''}`}>
        <div className="login-header">
          <img className="login-logo" src="/ArduinoEmulatorIconTrans.png" alt="" />
          <div className="login-title">
            <span className="login-brand">Arduino</span> Emulator
          </div>
          <div className="login-subtitle">AVR Instruction Debugger</div>
        </div>

        <div className="login-tab-row">
          <button
            type="button"
            className={`login-tab${mode === 'signin' ? ' active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab${mode === 'create' ? ' active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create Account
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="login-input"
              type="text"
              placeholder="enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="login-input"
              type="password"
              placeholder="enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          {mode === 'create' && (
            <div className="login-field login-field-animated">
              <label className="login-label" htmlFor="login-confirm">Confirm Password</label>
              <input
                id="login-confirm"
                className="login-input"
                type="password"
                placeholder="confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}
          <button type="submit" className="login-submit">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="login-status">
          <span className="login-led" />
          <span className="login-status-label">system ready</span>
        </div>
      </div>
    </div>
  )
}
