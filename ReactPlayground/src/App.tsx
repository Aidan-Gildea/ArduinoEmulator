import { useState } from 'react'
import './App.css'

interface CatData
{
  age: number;
  name: string;
}

function App() {
  const [apiResult, setAPIResult] = useState<string>("");

  async function UpdateCatData(data: CatData)
  {
    const result = await fetch("http://localhost:5024/Visualizer/UpdateCatData", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json"
                                },
                                body: JSON.stringify(data)
                              });
    let catData: CatData = await result.json();
    setAPIResult(`${catData.age}, ${catData.name}`);
  }
  return (
    <>
      <div className="card">
        <button onClick={() => UpdateCatData({age: 5, name: "Balls"})}>
          {apiResult || "Click"}
        </button>
      </div>
    </>
  )
}

export default App
