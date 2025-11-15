// Class for API endpoints

export async function GetRegisters()
{
    const registerData = await fetch("http://localhost:5024/Visualizer/GetRegisterData");
    if(!registerData.ok) throw new Error("Does not exist");
    return registerData.json();
}