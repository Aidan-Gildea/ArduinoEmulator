import { useRef } from 'react'
import './App.css'



function ConvertHexToNumber(hexDigits: string): number { return parseInt(hexDigits, 16); }

function App() {
  const registers = Array.from({ length: 32 }, (_, i) => i);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        let lines: string[]  = content.split('\n');
        let dataLines: string[] = [];

        for(let i = 0; i < lines.length; i++) {

          let dataCountHex: string = lines[i].slice(1, 3);
          let dataCount: number = ConvertHexToNumber(dataCountHex);
          let dataLine: string = lines[i].slice(9, 9 + 2 * dataCount);
          console.log('Data Count', dataCount);
          console.log('Data Line:', dataLine)
          
        }
        console.log('File lines:', lines);
      };
      reader.readAsText(file);
    }
    event.target.value = "";
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
          <button className="code-actions-button" style={{width: '200px'}} onClick={handleButtonClick}>
            Upload Hex
          </button>
          <button className="code-actions-button">
            Step
          </button>
          <button className="code-actions-button">
            Run
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
