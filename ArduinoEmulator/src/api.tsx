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
    ProgramAddressByte?: number | null;
    SourceLineNumber?: number | null;
}

export interface CompileCodeResponse {
    hexText: string | null;
    elfBase64: string | null;
    instructions: CommandInformation[];
    errors: string[];
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

export const compileCode = async (sourceCode: string): Promise<CompileCodeResponse> => {
    const response = await fetch(`${API_BASE_URL}/Visualizer/CompileCode`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sourceCode),
    });

    if (!response.ok) {
        return {
            hexText: null,
            elfBase64: null,
            instructions: [],
            errors: [`HTTP error! ${response.statusText}`],
        };
    }

    const raw = await response.json();

    const instructions: CommandInformation[] = Array.isArray(raw?.instructions)
        ? raw.instructions.map((instruction: any) => ({
            CommandName: instruction?.CommandName ?? instruction?.commandName ?? 'NO COMMAND FOUND',
            CommandBytes: instruction?.CommandBytes ?? instruction?.commandBytes ?? [],
            ProgramAddressByte: instruction?.ProgramAddressByte ?? instruction?.programAddressByte ?? null,
            SourceLineNumber: instruction?.SourceLineNumber ?? instruction?.sourceLineNumber ?? null,
        }))
        : [];

    return {
        hexText: raw?.hexText ?? null,
        elfBase64: raw?.elfBase64 ?? null,
        instructions,
        errors: Array.isArray(raw?.errors) ? raw.errors : [],
    };
};

