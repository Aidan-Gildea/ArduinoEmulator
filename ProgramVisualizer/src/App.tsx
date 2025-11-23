import './App.css'
import { Registers } from './components';
import { HexInstruction } from './components';
import { UploadFileButton } from './components';
import { useState } from 'react';

function App() {
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const handleFileLoad = (content: string[], name: string) => {
    setFileContent(content);
    setFileName(name);
  };

  return (
    <>
      <div className="left-side-panel">
        <div className="stack-panel">
          <div className="stack-title-container">
            <h1 className="stack-title">STACK</h1>
          </div>
        </div>
      </div>

      <div className="right-side-panel">

        <button className="step-next-button">STEP NEXT</button>

        <UploadFileButton onFileLoad={handleFileLoad} />
      
        <div className="register-panel">
          <div className="register-title-container">
            <h1 className="register-title">REGISTER VALUES</h1>
          </div>
            <Registers />
        </div>
          <div className="instruction-title-container">
            <h1 className="instruction-title">INSTRUCTION INFORMATION</h1>
          </div>

          <div className="instruction-information-panel">
            <HexInstruction />
            <div className="information-description-panel-format">
              <h1 className="information-description-title-format">HEX REPRESENTATION:</h1>
            </div>
            <div className="information-description-panel-format">
              <h1 className="information-description-title-format">ASSEMBLY REPRESENTATION:</h1>
            </div>
          </div>
      </div>
    </>
  );

}

export default App
