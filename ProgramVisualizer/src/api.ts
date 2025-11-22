// Program for managing API calls (creating the functions to receive the response)

export async function GetRegisters()
{
    const response = await fetch("http://localhost:5024/Visualizer/GetRegisterData");

    if (!response.ok) throw new Error("Does not exist");

    // Parse JSON
    const json = await response.json();

    // Extract the array
    return json.data;  // This is your byte array as an array of numbers
}

export async function GetHexRepresentation()
{
    const response = await fetch("http://localhost:5024/Visualizer/GetHexInstruction");

    if(!response.ok) throw new Error(response.statusText);

    const json = await response.json();

    return json.data;
}