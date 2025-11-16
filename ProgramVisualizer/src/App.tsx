import './App.css'
import Registers from './components';

function App() {

  return (
    <>
    <div className="stack-panel-container"></div>
        <div className="stack-container">
          <h1 className="stack-title">STACK</h1>
        </div>
    <div className="register-container">
      <h1 className="register-title">REGISTER VALUES</h1>
      <Registers />
    </div>
    </>
  )
}

export default App
