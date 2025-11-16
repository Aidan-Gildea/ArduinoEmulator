export async function GetRegisters() {
    const response = await fetch("http://localhost:5024/Visualizer/GetRegisterData");

    if (!response.ok) throw new Error("Does not exist");

    // Parse JSON
    const json = await response.json();

    // Extract the array
    return json.data;  // This is your byte array as an array of numbers
}