import { useRef, useState } from 'react'
import './App.css'
import { findAllInstructions, runInstruction } from './api'
import type { CommandInformation, MachineData, MachineDataDiff } from './api'

function ConvertHexToNumber(hexDigits: string): number { return parseInt(hexDigits, 16); }

let dataLines: string[] = [];

function App() {
  const registers = Array.from({ length: 32 }, (_, i) => i);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commands, setCommands] = useState<CommandInformation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hexText, setHexText] = useState<string>("");
  const [instructionPosition, setInstructionPosition] = useState(0);
  const [statusText, setStatusText] = useState<string>();
  const [machineData, setMachineData] = useState<MachineData>({
    CommandToParse: commands[instructionPosition],
    PC: 0,
    DataSpace: new Array(2000).fill(0),
    SP: 2000,
    StatusRegister: { sregByte: 0 },
  });
  const [changedRegisters, setChangedRegisters] = useState<Set<number>>(new Set());

  const formatCommandBytes = (bytes: number[]) =>
    bytes.map((b) => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(' ');

  const formatCommandBits = (bytes: number[]) =>
    bytes.map((b) => b.toString(2).padStart(8, '0')).join(' ');

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

  const handleStepClick = async () => {
    let diff: MachineDataDiff;
    machineData.CommandToParse = commands[instructionPosition];
    diff = await runInstruction(machineData);

    if(diff.pc != null) machineData.PC = diff.pc;
    if(diff.sregByte != null) machineData.StatusRegister = diff.sregByte;
    if(diff.sp != null) machineData.SP = diff.sp;

    for(let i = 0; i < diff.dataChanges.length; i++)
    {
      if(machineData.DataSpace[diff.dataChanges[i].index] == diff.dataChanges[i].before) continue; // verification that there was a change

      machineData.DataSpace[diff.dataChanges[i].index] = diff.dataChanges[i].after;
    }
    setInstructionPosition(instructionPosition + 1);
    machineData.CommandToParse = commands[instructionPosition];
    ;
  };

  const handleConvertToInstructions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await findAllInstructions(dataLines);
      setCommands(result);
      setInstructionPosition(0);
      setMachineData((prev) => ({ ...prev, CommandToParse: result[0] }));
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
            <div className="code-block">
              <div className="code-heading">Hex File</div>
              <pre className="code-pre">{hexText}</pre>
            </div>
          )}
          {loading && <div className="code-status">Converting...</div>}
          {error && <div className="code-status error">{error}</div>}
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
              <span className="info-value">
                {commands[instructionPosition]?.CommandName ?? 'NONE'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Program Counter:</span>
              <span className="info-value">{machineData.PC}</span>
            </div>
          </div>
          <div className="register-grid-panel">
            {registers.map((registerNum) => (
              <div 
                key={registerNum} 
                className={`register-box-panel ${changedRegisters.has(registerNum) ? 'register-changed' : ''}`}
              >
                R{registerNum}: 0x{(machineData.DataSpace[registerNum] || 0).toString(16).padStart(2, '0').toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
