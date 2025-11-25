// Program for managing API calls (creating the functions to receive the response)

export async function GetRegisters()
{
    const response = await fetch("http://localhost:5024/Visualizer/GetRegisterData");

    if (!response.ok) return null;

    const json = await response.json();

    return json.data;  
}

export async function GetHexRepresentation()
{
    const response = await fetch("http://localhost:5024/Visualizer/GetHexInstruction");

    if(!response.ok) return null;

    const json = await response.json();

    return json.data;
}