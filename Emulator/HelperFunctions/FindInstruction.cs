using SharedDomainTypes;

namespace Emulator;

public class FindInstruction
{
    public static Dictionary<int, List<Func<List<byte>, CommandTemplate>>> SixBitOpCodes = new Dictionary<int, List<Func<List<byte>, CommandTemplate>>>()
    {
        [0b100101] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new SEI(bytes), (bytes) => new CLI(bytes), (bytes) => new ADIW(bytes), (bytes) => new DEC(bytes), (bytes) => new COM(bytes), (bytes) => new RET(bytes), (bytes) => new RETI(bytes), (bytes) => new JMP(bytes), (bytes) => new CALL(bytes) },
        [0b100000] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new STY(bytes), (bytes) => new STZ(bytes), (bytes) => new LDY(bytes), (bytes) => new LDZ(bytes) },
        [0b001001] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new EOR(bytes) },
        [0b001000] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new AND(bytes) },
        [0b001010] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new OR(bytes) },
        [0b100100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new STX(bytes), (bytes) => new STY(bytes), (bytes) => new STZ(bytes), (bytes) => new PUSH(bytes), (bytes) => new LPM(bytes), (bytes) => new LDX(bytes), (bytes) => new LDY(bytes), (bytes) => new LDZ(bytes) },
        [0b100110] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new SBI(bytes) },
        [0b000001] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new CPC(bytes) },
        [0b000000] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new CPC(bytes) },
        [0b000100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new CPSE(bytes) },
        [0b000010] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new SBC(bytes) },
        [0b000011] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new ADD(bytes) },
        [0b000111] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new ADC(bytes) },
        [0b111101] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new BRBC(bytes) },
        [0b111100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new BRBS(bytes) },
    };

    public static Dictionary<int, List<Func<List<byte>, CommandTemplate>>> FiveBitOpCodes = new Dictionary<int, List<Func<List<byte>, CommandTemplate>>>()
    {
        [0b10111] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new OUT(bytes) },
        [0b10110] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new IN(bytes) },
    };

    public static Dictionary<int, List<Func<List<byte>, CommandTemplate>>> FourBitOpCodes = new Dictionary<int, List<Func<List<byte>, CommandTemplate>>>()
    {
        [0b1110] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new LDI(bytes) },
        [0b1100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new RJMP(bytes) },
        [0b0100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new SBCI(bytes) },
        [0b0101] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new SUBI(bytes) },
        [0b0011] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new CPI(bytes) },
        [0b0110] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new ORI(bytes) },
        [0b0111] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new ANDI(bytes) }
    };

    public static CommandTemplate FindCommand(byte dataByte, byte opCodeByte)
    {
        List<Func<List<byte>, CommandTemplate>>? Commands = new List<Func<List<byte>, CommandTemplate>>();
        // Store bytes in big-endian order: [opCodeByte, dataByte]
        List<byte> commandBytes = new List<byte> { opCodeByte, dataByte };

        if (SixBitOpCodes.TryGetValue(opCodeByte >> 2, out Commands))
        {
            foreach (var item in Commands)
            {
                CommandTemplate command = item(commandBytes);
                if (command.ConfirmCommand(dataByte, opCodeByte))
                {
                    return command;
                }
            }
        }
        else if (FiveBitOpCodes.TryGetValue(opCodeByte >> 3, out Commands))
        {
            foreach (var item in Commands)
            {
                CommandTemplate command = item(commandBytes);
                if (command.ConfirmCommand(dataByte, opCodeByte))
                {
                    return command;
                }
            }
        }
        else if(FourBitOpCodes.TryGetValue(opCodeByte >> 4, out Commands)) // cant be an else because an error is thrown without valid instruction
        {
            foreach (var item in Commands)
            {
                CommandTemplate command = item(commandBytes);
                if (command.ConfirmCommand(dataByte, opCodeByte))
                {
                    return command;
                }
            }
        }

        return new UnknownCommand(commandBytes);
    }
    // Should not send the command themselves, creates complications later 
    public List<CommandInformation> FindAllCommands(string[] hexLines)
    {
        List<CommandInformation> commands = new List<CommandInformation>();
        bool shouldTakeFromNextSpan = false;
        int currentProgramAddressByte = 0;
    
        for(int lineNum = 0; lineNum < hexLines.Length; lineNum++)
        {
            ReadOnlySpan<char> lineSpan = hexLines[lineNum].AsSpan();

            if(shouldTakeFromNextSpan)
            {
                lineSpan.Slice4Char(); // 4 is the max that would be taken from the next span
                shouldTakeFromNextSpan = false;
            }

            byte parseLength = (byte)lineSpan.Length;

            for(int i = 0; i < parseLength; i += 4)
            {   
                byte dataByte = (byte)lineSpan.Slice2Char();
                byte opCodeByte = (byte)lineSpan.Slice2Char();

                CommandTemplate command = FindCommand(dataByte, opCodeByte);
            
                for(int j = 0; j < command.AdditionalBytesNeeded; j += 2) // Two bytes added per iteration
                {
                    if(lineSpan.Length == 0)
                    {
                        shouldTakeFromNextSpan = true;
                        ReadOnlySpan<char> nextlineSpan = hexLines[lineNum + 1].AsSpan();
                        byte nextlowByte  = (byte)nextlineSpan.Slice2Char();
                        byte nexthighByte = (byte)nextlineSpan.Slice2Char();
                        command.CommandBytes.Add(nexthighByte);
                        command.CommandBytes.Add(nextlowByte);
                    }
                    else
                    {
                        byte lowByte  = (byte)lineSpan.Slice2Char();
                        byte highByte = (byte)lineSpan.Slice2Char();
                        command.CommandBytes.Add(highByte);
                        command.CommandBytes.Add(lowByte); 
                    }
                    
                    i += 4;
                }
                
                commands.Add(new CommandInformation
                {
                    CommandName = command.Identifier,
                    CommandBytes = command.CommandBytes,
                    ProgramAddressByte = currentProgramAddressByte,
                });   

                currentProgramAddressByte += command.CommandBytes.Count;
            }
        }
        
        return commands;
    }
}