import { useState } from 'react'
import './App.css'

function App() {
  // Create array of 32 registers (R0 - R31)
  const registers = Array.from({ length: 32 }, (_, i) => i);

  return (
    <>
      <div className="right-side-panel">
        <div className="component-title-panel">
          Components
        </div>
        <div className="board-visual-panel">
          
        </div>
        <div className="data-panel">
          <div className="register-grid-panel">
            {registers.map((registerNum) => (
              <div key={registerNum} className="register-box-panel">
                R{registerNum}: 0x00
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
