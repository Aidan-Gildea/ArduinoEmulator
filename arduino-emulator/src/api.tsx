interface MachineData {
    programCounter: number;
    dataSpace: number[];
    hexInstruction: string;
}

export interface CommandTemplate {
    commandBytes: number[];
    additionalBytesNeeded: number;
    identifier: string;
}

const API_BASE_URL = 'http://localhost:5024';

export const findAllInstructions = async (dataLines: string[]): Promise<CommandTemplate[]> => {
    const response = await fetch(`${API_BASE_URL}/Visualizer/FindAllInstructions`, { // no method body causes it to be called like a get
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataLines),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
};

function ParseLine(hexFile: string) {

}