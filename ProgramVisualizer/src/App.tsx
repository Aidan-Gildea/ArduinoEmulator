import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {

  return (
    <>
      <div className="registers-panel">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className="register-box">
            <div className="r-label">R{i + 1}</div>
            <div className="r-value">0x00</div>
          </div>
        ))}
      </div>
      <div>
        <a href="https://vite.dev" target="_blank">
        </a>
        <a href="https://react.dev" target="_blank">
        </a>
      </div>
      
      <div className="card">
        <p>
        </p>
      </div>
      <p className="read-the-docs">
      </p>
    </>
  )
}

export default App
