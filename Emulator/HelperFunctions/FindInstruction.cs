namespace Emulator;

public class FindInstruction
{
    public static Dictionary<int, List<Func<List<byte>, CommandTemplate>>> SixBitOpCodes = new Dictionary<int, List<Func<List<byte>, CommandTemplate>>>()
    {
        [0b100101] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new JMP(bytes), (bytes) => new CALL(bytes) },
        [0b001001] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new EOR(bytes) },
        [0b100100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new STX(bytes) },
        [0b000001] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new CPC(bytes) },
        [0b111101] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new BRBC(bytes) },
    };

    public static Dictionary<int, List<Func<List<byte>, CommandTemplate>>> FiveBitOpCodes = new Dictionary<int, List<Func<List<byte>, CommandTemplate>>>()
    {
        [0b10111] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new OUT(bytes) },
    };

    public static Dictionary<int, List<Func<List<byte>, CommandTemplate>>> FourBitOpCodes = new Dictionary<int, List<Func<List<byte>, CommandTemplate>>>()
    {
        [0b1110] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new LDI(bytes) },
        [0b1100] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new RJMP(bytes) },
        [0b0101] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new SUBI(bytes) },
        [0b0011] = new List<Func<List<byte>, CommandTemplate>>() { (bytes) => new CPI(bytes) }
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
        else
        {
            foreach (var item in FourBitOpCodes[opCodeByte >> 4])
            {
                CommandTemplate command = item(commandBytes);
                if (command.ConfirmCommand(dataByte, opCodeByte))
                {
                    return command;
                }
            }
        }

        throw new ArgumentException("Command does not exist");
    }

    public List<CommandTemplate> FindAllCommands(string[] hexLines)
    {
        List<CommandTemplate> commands = new List<CommandTemplate>();
    
        foreach (string line in  hexLines)
        {
            ReadOnlySpan<char> lineSpan = line.AsSpan();

            byte dataByte = (byte)lineSpan.Slice2Char();
            byte opCodeByte = (byte)lineSpan.Slice2Char();

            CommandTemplate command = FindCommand(dataByte, opCodeByte);
            
            // Append additional bytes in big-endian order: [highByte, lowByte]
            // Source is little-endian (low then high), so read low first, then high, and store as high, low
            for(int i = 0; i < command.AdditionalBytesNeeded; i += 2) // Two bytes added per iteration
            {
                byte lowByte  = (byte)lineSpan.Slice2Char();
                byte highByte = (byte)lineSpan.Slice2Char();
                command.CommandBytes.Add(highByte);
                command.CommandBytes.Add(lowByte);
            }
            
            commands.Add(command);
        }
        
        return commands;
    }
}