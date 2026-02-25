import { useRef, useState } from 'react'
import './App.css'
import { findAllInstructions, runInstruction, compileCode } from './api'
import type { CommandInformation, MachineData, MachineDataDiff } from './api'

function ConvertHexToNumber(hexDigits: string): number { return parseInt(hexDigits, 16); }

let dataLines: string[] = [];

type PlacedComponent = {
  id: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

function App() 
{
  const registers = Array.from({ length: 32 }, (_, i) => i);
  const componentSlots = Array.from({ length: 72 }, (_, i) => i + 1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<'writeCode' | 'uploadHex'>('uploadHex');
  const [codeInput, setCodeInput] = useState<string>('#include <Arduino.h>\n\nvoid setup() \n{  \n\n}\n\nvoid loop()\n{\n\n}  ');
  const [commands, setCommands] = useState<CommandInformation[]>([]);
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>([]);
  const [resizeTarget, setResizeTarget] = useState<{ id: number; width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hexText, setHexText] = useState<string>("");
  const [instructionPosition, setInstructionPosition] = useState(0);
  const [machineData, setMachineData] = useState<MachineData>(
  {
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

  if (file) 
  {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setHexText(content);
      setCommands([]);
      setInstructionPosition(0);
      setChangedRegisters(new Set());
      setMachineData({
        CommandToParse: { CommandName: 'NONE', CommandBytes: [] },
        PC: 0,
        DataSpace: new Array(2000).fill(0),
        SP: 2000,
        StatusRegister: { sregByte: 0 },
      });
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

    console.log(`Diff Change Length ${diff.dataChanges.length}`);

    let changedRegistersSet: Set<number> = new Set<number>;

    for(let i = 0; i < diff.dataChanges.length; i++) // Code cannot register a change properly. 
    {
      //if(machineData.DataSpace[diff.dataChanges[i].index] == diff.dataChanges[i].before) continue; // verification that there was a change

      if(diff.dataChanges[i].index <= 31)
      {
        changedRegistersSet.add(diff.dataChanges[i].index);
      }

      console.log(`Data Space Change at ${diff.dataChanges[i].index}`);
      machineData.DataSpace[diff.dataChanges[i].index] = diff.dataChanges[i].after;
    }
    setChangedRegisters(changedRegistersSet);
    setInstructionPosition(instructionPosition + 1);
    machineData.CommandToParse = commands[instructionPosition];
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

  const handleCompileCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await compileCode(codeInput);
      console.log('Compilation result:', result);
      // TODO: Handle the compilation result (e.g., display hex output)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to compile code');
    } finally {
      setLoading(false);
    }
  };

  const handleLedDragStart = (event: React.DragEvent<HTMLImageElement>) => {
    event.dataTransfer.setData('componentType', 'LED');
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropZoneDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDropInZone = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const componentType = event.dataTransfer.getData('componentType');
    if (componentType !== 'LED') return;

    const dropZoneRect = event.currentTarget.getBoundingClientRect();
    const iconSize = 150;

    const rawX = event.clientX - dropZoneRect.left - iconSize / 2;
    const rawY = event.clientY - dropZoneRect.top - iconSize / 2;

    const x = Math.max(0, Math.min(rawX, dropZoneRect.width - iconSize));
    const y = Math.max(0, Math.min(rawY, dropZoneRect.height - iconSize));

    const defaultSize = 150;
    setPlacedComponents((prev) => [
      ...prev,
      { id: Date.now() + prev.length, x, y, width: defaultSize, height: defaultSize },
    ]);
  };

  const handlePlacedComponentMouseDown = (id: number, event: React.MouseEvent<HTMLImageElement>) => {
    event.preventDefault();

    const dropZoneElement = dropZoneRef.current;
    if (!dropZoneElement) return;

    const component = placedComponents.find((item) => item.id === id);
    if (!component) return;

    const dropZoneRect = dropZoneElement.getBoundingClientRect();
    const iconSize = 150;
    const pointerOffsetX = event.clientX - (dropZoneRect.left + component.x);
    const pointerOffsetY = event.clientY - (dropZoneRect.top + component.y);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const latestDropZoneRect = dropZoneElement.getBoundingClientRect();

      const nextX = moveEvent.clientX - latestDropZoneRect.left - pointerOffsetX;
      const nextY = moveEvent.clientY - latestDropZoneRect.top - pointerOffsetY;

      const clampedX = Math.max(0, Math.min(nextX, latestDropZoneRect.width - iconSize));
      const clampedY = Math.max(0, Math.min(nextY, latestDropZoneRect.height - iconSize));

      setPlacedComponents((prev) =>
        prev.map((item) => (item.id === id ? { ...item, x: clampedX, y: clampedY } : item))
      );
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const latestDropZoneRect = dropZoneElement.getBoundingClientRect();

      const isInsideDropZone =
        upEvent.clientX >= latestDropZoneRect.left &&
        upEvent.clientX <= latestDropZoneRect.right &&
        upEvent.clientY >= latestDropZoneRect.top &&
        upEvent.clientY <= latestDropZoneRect.bottom;

      if (!isInsideDropZone) {
        setPlacedComponents((prev) => prev.filter((item) => item.id !== id));
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handlePlacedComponentDoubleClick = (id: number, event: React.MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    const comp = placedComponents.find((c) => c.id === id);
    if (!comp) return;
    setResizeTarget({ id: comp.id, width: comp.width ?? 150, height: comp.height ?? 150 });
  };

  const [selectedComponentId, setSelectedComponentId] = useState<number | null>(null);
  const resizingRef = useRef<any>(null);

  const startResize = (e: React.MouseEvent, handle: string, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    const comp = placedComponents.find((c) => c.id === id);
    const dropZone = dropZoneRef.current;
    if (!comp || !dropZone) return;

    const dropRect = dropZone.getBoundingClientRect();
    resizingRef.current = {
      id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: comp.x,
      startTop: comp.y,
      startWidth: comp.width ?? 150,
      startHeight: comp.height ?? 150,
      dropRect,
    };

    const onMove = (moveEvent: MouseEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const dx = moveEvent.clientX - r.startX;
      const dy = moveEvent.clientY - r.startY;
      let newLeft = r.startLeft;
      let newTop = r.startTop;
      let newWidth = r.startWidth;
      let newHeight = r.startHeight;

      const minSize = 8;

      switch (r.handle) {
        case 'nw':
          newLeft = Math.max(0, Math.min(r.startLeft + dx, r.startLeft + r.startWidth - minSize));
          newTop = Math.max(0, Math.min(r.startTop + dy, r.startTop + r.startHeight - minSize));
          newWidth = Math.max(minSize, r.startWidth - (newLeft - r.startLeft));
          newHeight = Math.max(minSize, r.startHeight - (newTop - r.startTop));
          break;
        case 'n':
          newTop = Math.max(0, Math.min(r.startTop + dy, r.startTop + r.startHeight - minSize));
          newHeight = Math.max(minSize, r.startHeight - (newTop - r.startTop));
          break;
        case 'ne':
          newTop = Math.max(0, Math.min(r.startTop + dy, r.startTop + r.startHeight - minSize));
          newWidth = Math.max(minSize, r.startWidth + dx);
          newHeight = Math.max(minSize, r.startHeight - (newTop - r.startTop));
          break;
        case 'e':
          newWidth = Math.max(minSize, r.startWidth + dx);
          break;
        case 'se':
          newWidth = Math.max(minSize, r.startWidth + dx);
          newHeight = Math.max(minSize, r.startHeight + dy);
          break;
        case 's':
          newHeight = Math.max(minSize, r.startHeight + dy);
          break;
        case 'sw':
          newLeft = Math.max(0, Math.min(r.startLeft + dx, r.startLeft + r.startWidth - minSize));
          newWidth = Math.max(minSize, r.startWidth - (newLeft - r.startLeft));
          newHeight = Math.max(minSize, r.startHeight + dy);
          break;
        case 'w':
          newLeft = Math.max(0, Math.min(r.startLeft + dx, r.startLeft + r.startWidth - minSize));
          newWidth = Math.max(minSize, r.startWidth - (newLeft - r.startLeft));
          break;
      }

      // clamp to drop zone bounds
      newLeft = Math.max(0, Math.min(newLeft, r.dropRect.width - newWidth));
      newTop = Math.max(0, Math.min(newTop, r.dropRect.height - newHeight));

      setPlacedComponents((prev) => prev.map((p) => (p.id === r.id ? { ...p, x: Math.round(newLeft), y: Math.round(newTop), width: Math.round(newWidth), height: Math.round(newHeight) } : p)));
    };

    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const clearSelection = () => {
    setSelectedComponentId(null);
    setResizeTarget(null);
  };

  const applyResize = () => {
    if (!resizeTarget) return;
    setPlacedComponents((prev) => prev.map((p) => (p.id === resizeTarget.id ? { ...p, width: resizeTarget.width, height: resizeTarget.height } : p)));
    setResizeTarget(null);
  };

  const cancelResize = () => setResizeTarget(null);

  const handleCodeEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();

    const indent = '  ';

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (!event.shiftKey) {
      const updated = `${codeInput.slice(0, start)}${indent}${codeInput.slice(end)}`;
      setCodeInput(updated);
      requestAnimationFrame(() => {
        const nextCursor = start + indent.length;
        textarea.selectionStart = nextCursor;
        textarea.selectionEnd = nextCursor;
      });
      return;
    }

    const lineStart = codeInput.lastIndexOf('\n', start - 1) + 1;
    const lineEndIndex = codeInput.indexOf('\n', end);
    const lineEnd = lineEndIndex === -1 ? codeInput.length : lineEndIndex;

    const block = codeInput.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    let offset = 0;
    const lineAdjustments: { start: number; removed: number }[] = [];

    const outdented = lines
      .map((line) => {
        const currentLineStart = lineStart + offset;
        let removed = 0;
        let updatedLine = line;

        if (line.startsWith(indent)) {
          removed = indent.length;
          updatedLine = line.slice(indent.length);
        } else if (line.startsWith('\t')) {
          removed = 1;
          updatedLine = line.slice(1);
        }

        lineAdjustments.push({ start: currentLineStart, removed });
        offset += line.length + 1;

        return updatedLine;
      })
      .join('\n');

    const adjustPosition = (position: number) => {
      const deduction = lineAdjustments.reduce((total, lineInfo) => {
        if (position <= lineInfo.start || lineInfo.removed === 0) {
          return total;
        }

        const charsIntoLine = position - lineInfo.start;
        return total + Math.min(lineInfo.removed, charsIntoLine);
      }, 0);

      return position - deduction;
    };

    const updated = `${codeInput.slice(0, lineStart)}${outdented}${codeInput.slice(lineEnd)}`;
    setCodeInput(updated);
    requestAnimationFrame(() => {
      const nextStart = Math.max(lineStart, adjustPosition(start));
      const nextEnd = Math.max(nextStart, adjustPosition(end));
      textarea.selectionStart = nextStart;
      textarea.selectionEnd = nextEnd;
    });
  };

  return (
    <>
      <div className="left-side-panel">
        <div className="left-tab-row">
          <button
            className={`left-tab-button ${activeLeftTab === 'writeCode'}`}
            onClick={() => setActiveLeftTab('writeCode')}
          >
            Write Code
          </button>
          <button
            className={`left-tab-button ${activeLeftTab === 'uploadHex'}`}
            onClick={() => setActiveLeftTab('uploadHex')}
          >
            Upload Hex
          </button>
        </div>

        <div className="left-main-panel">
          {activeLeftTab === 'writeCode' ? (
            <>
              <div className="code-actions-panel">
                <button className="code-actions-button" style={{width: '200px'}} onClick={handleCompileCode}>
                  Compile Code
                </button>
                <button className="code-actions-button" style={{width: '200px'}}>
                  Run Code
                </button>
              </div>
              <div className="code-editor-panel">
                <textarea
                  className="code-editor-textarea"
                  placeholder="Write your code here..."
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value)}
                  onKeyDown={handleCodeEditorKeyDown}
                />
              </div>
            </>
          ) : (
            <>
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
              {(hexText || loading || error || commands.length > 0) && (
                <div className="code-panel">
                  {hexText && (
                    <div className="code-block">
                      <div className="code-heading">Hex File</div>
                      <pre className="code-pre">{hexText}</pre>
                    </div>
                  )}
                  {loading && <div className="code-status">Converting...</div>}
                  {error && <div className="code-status error">{error}</div>}

                  <div className="code-block">
                    {commands.map((command, index) => (
                      <div key={index} className="instruction-item">
                        <div className="instruction-name">
                          {`Instruction Name: ${command.CommandName}`}
                        </div>
                        <div className="instruction-bytes">
                          {`Command Bytes: ${formatCommandBytes(command.CommandBytes)}`}
                        </div>
                        <div className="instruction-bits">
                          {`Command Bits: ${formatCommandBits(command.CommandBytes)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="right-side-panel">
          <div className="instruction-display">
            <div className="instruction-title">{commands[instructionPosition]?.CommandName ?? 'NONE'}</div>
            <div className="instruction-bytes-small">{formatCommandBytes(commands[instructionPosition]?.CommandBytes ?? [])}</div>
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
                <div key={registerNum} className={`register-box-panel ${changedRegisters.has(registerNum) ? 'register-changed' : ''}`}>
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
