import { useRef, useState } from 'react'
import './App.css'
import { findAllInstructions } from './api'
import type { CommandTemplate } from './api'

function ConvertHexToNumber(hexDigits: string): number { return parseInt(hexDigits, 16); }

let dataLines: string[] = [];
let instructionPosition = 0;

function App() {
  const registers = Array.from({ length: 32 }, (_, i) => i);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commands, setCommands] = useState<CommandTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hexText, setHexText] = useState<string>("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setHexText(content);
        setCommands([]);
        let lines: string[]  = content.split('\n');

        for(let i = 0; i < lines.length; i++) {

          let dataCountHex: string = lines[i].slice(1, 3);
          let dataCount: number = ConvertHexToNumber(dataCountHex);
          dataLines[i] = lines[i].slice(9, 9 + 2 * dataCount);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = "";
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleStepClick = () => {
    
    
    instructionPosition++;
  };

  const handleConvertToInstructions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await findAllInstructions(dataLines);
      setCommands(result);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to convert to instructions');
    } finally {
      setLoading(false);
    }
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
          <button className="code-actions-button" style={{width: '200px'}} onClick={handleConvertToInstructions}>
            Convert to Instructions
          </button>
          <button className="code-actions-button" onClick={handleStepClick}>
            Step
          </button>
          <button className="code-actions-button">
            Run
          </button>
        </div>
        <div className="code-panel">
          {hexText && (
            <div style={{ color: 'white', padding: '10px', textAlign: 'left' }}>
              <div style={{ marginBottom: '10px', fontWeight: 800 }}>Hex File</div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>{hexText}</pre>
            </div>
          )}
          {loading && <div style={{ color: 'white', padding: '10px' }}>Converting...</div>}
          {error && <div style={{ color: 'salmon', padding: '10px' }}>{error}</div>}
          {!loading && !error && commands.length > 0 && (
            <div style={{ color: 'white', padding: '10px', textAlign: 'left' }}>
              <div style={{ marginBottom: '10px', fontWeight: 800 }}>Instructions ({commands.length}):</div>
              <ol>
                {commands.map((c, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{c.identifier}</span>
                    {c.commandBytes?.length ? (
                      <>
                        <span style={{ fontFamily: 'monospace' }}>
                          {`  [${c.commandBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`}
                        </span>
                        <span style={{ fontFamily: 'monospace', marginLeft: 8, opacity: 0.85 }}>
                          {c.commandBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')}
                        </span>
                      </>
                    ) : null}
                    {typeof c.additionalBytesNeeded === 'number' ? (
                      <span style={{ opacity: 0.7 }}>{`  (+${c.additionalBytesNeeded} bytes)`}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          )}
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
