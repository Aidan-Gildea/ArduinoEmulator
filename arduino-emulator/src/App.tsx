import { useRef } from 'react'
import './App.css'

function App() {
  // Create array of 32 registers (R0 - R31)
  const registers = Array.from({ length: 32 }, (_, i) => i);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name);
      // Add your file handling logic here
      // For example, read the file:
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        console.log('File content:', content);
      };
      reader.readAsText(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="left-side-panel">
        <div className="code-actions-panel">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".hex"
            style={{ display: 'none' }}
          />
          <button className="upload-hex-file-button" onClick={handleButtonClick}>
            Upload Hex
          </button>
        </div>
        <div className="code-panel">

        </div>
      </div>
      <div className="right-side-panel">
        <div className="component-title-panel">
          Components
        </div>
        <div className="board-visual-panel">
          
        </div>
        <div className="data-panel">
          <div className="info-section">
            <div className="info-item">
              <span className="info-label">Hex Instruction:</span>
              <span className="info-value">0x0000</span>
            </div>
            <div className="info-item">
              <span className="info-label">Program Counter:</span>
              <span className="info-value">0x0000</span>
            </div>
          </div>
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
