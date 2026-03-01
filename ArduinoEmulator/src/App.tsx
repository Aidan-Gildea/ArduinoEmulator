import { useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import './App.css'
import { findAllInstructions, runInstruction, compileCode } from './api'
import type { CommandInformation, MachineData, MachineDataDiff } from './api'

function ConvertHexToNumber(hexDigits: string): number { return parseInt(hexDigits, 16); }

let dataLines: string[] = [];

function ParseHexDataLines(hexContent: string): string[] {
  const lines = hexContent.split(/\r?\n/);
  const parsedDataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith(':')) continue;

    const dataCountHex = line.slice(1, 3);
    const recordTypeHex = line.slice(7, 9);

    const dataCount = ConvertHexToNumber(dataCountHex);
    const recordType = ConvertHexToNumber(recordTypeHex);

    if (Number.isNaN(dataCount) || Number.isNaN(recordType)) continue;
    if (recordType !== 0 || dataCount <= 0) continue;

    const data = line.slice(9, 9 + (2 * dataCount));
    if (data.length === 2 * dataCount) {
      parsedDataLines.push(data);
    }
  }

  return parsedDataLines;
}

const arduinoCompletionLabels = [
  'pinMode',
  'digitalWrite',
  'digitalRead',
  'analogRead',
  'analogWrite',
  'delay',
  'millis',
  'Serial.begin',
  'Serial.print',
  'Serial.println',
  'setup',
  'loop'
];

function App() 
{
  const registers = Array.from({ length: 32 }, (_, i) => i);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<'writeCode' | 'uploadHex'>('uploadHex');
  const [activeCodePanelTab, setActiveCodePanelTab] = useState<'hex' | 'instructions' | 'unknown' | 'errors'>('hex');
  const [codeInput, setCodeInput] = useState<string>('#include <Arduino.h>\n\nvoid setup() \n{  \n\n}\n\nvoid loop()\n{\n\n}  ');
  const [isMonacoConfigured, setIsMonacoConfigured] = useState(false);
  const [commands, setCommands] = useState<CommandInformation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [hexText, setHexText] = useState<string>("");
  const [instructionPosition, setInstructionPosition] = useState(0);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);
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

  const unknownInstructions = commands.filter((command) => command.CommandName === 'NO COMMAND FOUND');

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
      dataLines = ParseHexDataLines(content);

      if (dataLines.length === 0) {
        setErrorMessages(['No instruction data records found in HEX file.']);
        setActiveCodePanelTab('errors');
      } else {
        setErrorMessages([]);
        setActiveCodePanelTab('hex');
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
      setErrorMessages([]);

      if (dataLines.length === 0) {
        throw new Error('No HEX instruction data available. Upload or compile code first.');
      }

      const result = await findAllInstructions(dataLines);
      setCommands(result);
      setInstructionPosition(0);
      setMachineData((prev) => ({ ...prev, CommandToParse: result[0] }));
      setActiveCodePanelTab('instructions');
    } catch (e: any) {
      setErrorMessages([e?.message ?? 'Failed to convert to instructions']);
      setActiveCodePanelTab('errors');
    } finally {
      setLoading(false);
    }
  };

  const handleCompileCode = async () => {
    try {
      setLoading(true);
      setErrorMessages([]);
      const result = await compileCode(codeInput);

      if (result.errors.length > 0 || !result.hexText) {
        setErrorMessages(result.errors.length > 0 ? result.errors : ['Failed to compile code']);
        setActiveCodePanelTab('errors');
        return;
      }

      setHexText(result.hexText);
      setInstructionPosition(0);
      setChangedRegisters(new Set());
      setMachineData({
        CommandToParse: { CommandName: 'NONE', CommandBytes: [] },
        PC: 0,
        DataSpace: new Array(2000).fill(0),
        SP: 2000,
        StatusRegister: { sregByte: 0 },
      });

      dataLines = ParseHexDataLines(result.hexText);
      if (dataLines.length === 0) {
        setErrorMessages(['Compilation succeeded but no HEX instruction data records were found.']);
        setActiveCodePanelTab('errors');
        return;
      }

      const instructions = await findAllInstructions(dataLines);
      setCommands(instructions);
      setInstructionPosition(0);
      setMachineData((prev) => ({
        ...prev,
        CommandToParse: instructions[0] ?? { CommandName: 'NONE', CommandBytes: [] }
      }));

      setActiveLeftTab('uploadHex');
      setActiveCodePanelTab('instructions');
    } 

    catch (e: any) {
      setErrorMessages([e?.message ?? 'Failed to compile code']);
      setActiveCodePanelTab('errors');
    } 
    finally {
      setLoading(false);
    }
  };

  const handleCodeEditorMount: OnMount = (editor, monaco) => {
    editor.focus();

    if (isMonacoConfigured) {
      return;
    }

    completionProviderRef.current?.dispose();
    completionProviderRef.current = monaco.languages.registerCompletionItemProvider('cpp', {
      triggerCharacters: ['.', '>'],
      provideCompletionItems: (model: Monaco['editor']['ITextModel'], position: Monaco['Position']) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const keywordSuggestions = arduinoCompletionLabels.map((label) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: label.includes('.') ? `${label}($1);` : `${label}($1);`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return {
          suggestions: [
            {
              label: 'setup/loop template',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'void setup()\n{\n  $1\n}\n\nvoid loop()\n{\n  $2\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Arduino sketch template.',
              range,
            },
            {
              label: '#include <Arduino.h>',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '#include <Arduino.h>',
              documentation: 'Arduino core include.',
              range,
            },
            ...keywordSuggestions,
          ],
        };
      },
    });

    setIsMonacoConfigured(true);
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
                <div className="code-editor-monaco">
                  <Editor
                    language="cpp"
                    theme="vs-dark"
                    value={codeInput}
                    onMount={handleCodeEditorMount}
                    onChange={(value) => setCodeInput(value ?? '')}
                    options={{
                      automaticLayout: true,
                      minimap: { enabled: false },
                      fontSize: 15,
                      tabSize: 2,
                      insertSpaces: true,
                      wordWrap: 'on',
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false,
                      },
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
                {errorMessages.length > 0 && (
                  <div className="code-editor-error-overlay" role="log" aria-live="polite">
                    <div className="code-editor-error-title">Errors</div>
                    <ul className="code-editor-error-list">
                      {errorMessages.map((message, index) => (
                        <li key={index} className="code-editor-error-item">{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
              {(hexText || loading || errorMessages.length > 0 || commands.length > 0) && (
                <div className="code-panel">
                  <div className="code-panel-tab-row">
                    <button
                      className={`code-panel-tab-button ${activeCodePanelTab === 'hex' ? 'active' : ''}`}
                      onClick={() => setActiveCodePanelTab('hex')}
                    >
                      Hex File
                    </button>
                    <button
                      className={`code-panel-tab-button ${activeCodePanelTab === 'instructions' ? 'active' : ''}`}
                      onClick={() => setActiveCodePanelTab('instructions')}
                    >
                      Instructions
                    </button>
                    <button
                      className={`code-panel-tab-button ${activeCodePanelTab === 'unknown' ? 'active' : ''}`}
                      onClick={() => setActiveCodePanelTab('unknown')}
                    >
                      Unknown ({unknownInstructions.length})
                    </button>
                    <button
                      className={`code-panel-tab-button ${activeCodePanelTab === 'errors' ? 'active' : ''}`}
                      onClick={() => setActiveCodePanelTab('errors')}
                    >
                      Errors ({errorMessages.length})
                    </button>
                  </div>

                  {loading && <div className="code-status">Converting...</div>}

                  {activeCodePanelTab === 'hex' && (
                    <div className="code-block">
                      <div className="code-heading">Hex File</div>
                      <pre className="code-pre">{hexText || 'No compiled or uploaded HEX yet.'}</pre>
                    </div>
                  )}

                  {activeCodePanelTab === 'instructions' && (
                    <div className="code-block">
                      {commands.length === 0 ? (
                        <div className="code-status">No instructions loaded yet.</div>
                      ) : (
                        commands.map((command, index) => (
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
                        ))
                      )}
                    </div>
                  )}

                  {activeCodePanelTab === 'unknown' && (
                    <div className="code-block">
                      <div className="code-heading">Unknown Instructions</div>
                      {unknownInstructions.length === 0 ? (
                        <div className="code-status">No unknown instructions found.</div>
                      ) : (
                        unknownInstructions.map((command, index) => (
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
                        ))
                      )}
                    </div>
                  )}

                  {activeCodePanelTab === 'errors' && (
                    <div className="code-block">
                      <div className="code-heading">Errors</div>
                      {errorMessages.length === 0 ? (
                        <div className="code-status">No errors.</div>
                      ) : (
                        <ul className="error-list">
                          {errorMessages.map((message, index) => (
                            <li key={index} className="error-list-item">{message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="right-side-panel">
          <div className="run-image-box">
            <img
              className="run-image"
              src="/ArduinoEmulatorIconTrans.png"
              alt="Instruction run visual"
            />
          </div>
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
