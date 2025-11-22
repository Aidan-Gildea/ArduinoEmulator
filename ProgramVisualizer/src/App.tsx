import './App.css'
import Registers from './components';

function App() {

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
        <div className="register-panel">
          <div className="register-title-container">
            <h1 className="register-title">REGISTER VALUES</h1>
          </div>
            <Registers />
        </div>
        <div className="information-panel">
          <div className="instruction-title-container">
            <h1 className="instruction-title">INSTRUCTIONS</h1>
          </div>

          <div className="instruction-information-panel">
            
          </div>
        </div>
      </div>
    </>
  );

}

export default App
