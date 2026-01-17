export interface SREG {
    sregByte: number;
}

export interface MachineData {
    CommandToParse: CommandInformation;
    PC: number;
    DataSpace: number[];
    SP: number;
    StatusRegister: SREG;
}

export interface DataChange {
    index: number;
    before: number;
    after: number;
}

export interface MachineDataDiff {
    pc: number | null;
    sp: number | null;
    sregByte: SREG | null
    dataChanges: DataChange[];
}

export interface CommandInformation {
    CommandName: string;
    CommandBytes: number[];
}


const API_BASE_URL = 'http://localhost:5024';

export const findAllInstructions = async (dataLines: string[]): Promise<CommandInformation[]> => {
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

    const responseJson = await response.json();

    return responseJson;
};

export const runInstruction = async (state: MachineData): Promise<MachineDataDiff> => {
    console.log(`Cmd: ${state.CommandToParse?.CommandName}`);
    let result = JSON.stringify(state);
    console.log(`Stringify: ${result}`);
    const response = await fetch(`${API_BASE_URL}/Visualizer/RunInstruction`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! ${response.statusText}`);
    }
    const raw = await response.json();

    return raw;
};

