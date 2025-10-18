using System.IO.Compression;
using System.Reflection;
using System.Reflection.Metadata;
using System.Runtime.CompilerServices;

namespace Emulator;

public class LineFormat
{
    public ushort byteCount;
    public uint address;
    public ushort recordType;
    public List<CommandTemplate> commands = new List<CommandTemplate>();
    public ushort checksum;
};

public class Program
{
    public static MachineData programData = new MachineData();
    public static Dictionary<int, List<Func<CommandTemplate>>> SevenBitOpCodes = new Dictionary<int, List<Func<CommandTemplate>>>()
    {
        [0b1001001] = new List<Func<CommandTemplate>>() { () => new OUT() },
    };
    public static Dictionary<int, List<Func<CommandTemplate>>> SixBitOpCodes = new Dictionary<int, List<Func<CommandTemplate>>>()
    {
        [0b100101] = new List<Func<CommandTemplate>>() { () => new JMP(), () => new CALL() },
        [0b001001] = new List<Func<CommandTemplate>>() { () => new EOR() },
        [0b100100] = new List<Func<CommandTemplate>>() { () => new STX() },
        [0b111101] = new List<Func<CommandTemplate>>() { () => new BRBC() },
    };

    public static Dictionary<int, List<Func<CommandTemplate>>> FiveBitOpCodes = new Dictionary<int, List<Func<CommandTemplate>>>()
    {
        [0b10111] = new List<Func<CommandTemplate>>() { () => new OUT() },
    };

    public static Dictionary<int, List<Func<CommandTemplate>>> FourBitOpCodes = new Dictionary<int, List<Func<CommandTemplate>>>()
    {
        [0b1110] = new List<Func<CommandTemplate>>() { () => new LDI() },
        [0b1100] = new List<Func<CommandTemplate>>() { () => new RJMP() },
        [0b0101] = new List<Func<CommandTemplate>>() { () => new SUBI() },
        [0b0011] = new List<Func<CommandTemplate>>() { () => new CPI() },
        [0b0000] = new List<Func<CommandTemplate>>() { () => new CPC() },
    };

    public static bool VerifyLineStart(int lineStart)
    {
        const char expectedLineStart = ':';
        return expectedLineStart == lineStart;
    }

    public static CommandTemplate FindCommand(byte[] commandBytes)
    {
        List<Func<CommandTemplate>>? Commands = new List<Func<CommandTemplate>>();
        if (SixBitOpCodes.TryGetValue(commandBytes[1] >> 2, out Commands))
        {
            foreach (var item in Commands)
            {
                CommandTemplate command = item();
                if (command.ConfirmCommand(commandBytes))
                {
                    return command;
                }
            }
        }
        else if (FiveBitOpCodes.TryGetValue(commandBytes[1] >> 3, out Commands))
        {
            foreach (var item in Commands)
            {
                CommandTemplate command = item();
                if (command.ConfirmCommand(commandBytes))
                {
                    return command;
                }
            }
        }
        else
        {
            foreach (var item in FourBitOpCodes[commandBytes[1] >> 4])
            {
                CommandTemplate command = item();
                if (command.ConfirmCommand(commandBytes))
                {
                    return command;
                }
            }
        }
        
        throw new ArgumentException("Command does not exist");
    }
    public static void Main()
    {
        string[] fileData = File.ReadAllLines("/Users/liz/Documents/PlatformIO/ArduinoPlayground/.pio/build/ATmega328P/firmware.hex");

        LineFormat[] parsedLines = new LineFormat[fileData.Length];
        int lineIndex = 0;

        byte[] commandBytes = new byte[2];

        foreach (var line in fileData)
        {
            ReadOnlySpan<char> lineSpan = line.AsSpan();
            parsedLines[lineIndex] = new LineFormat();

            if (!VerifyLineStart(lineSpan.Slice1Char())) throw new ArgumentException("Line start does not match expected line start.");

            parsedLines[lineIndex].byteCount = lineSpan.Slice2Char();
            parsedLines[lineIndex].address = lineSpan.Slice4Char();
            parsedLines[lineIndex].recordType = lineSpan.Slice2Char();

            for (int i = 0; i < parsedLines[lineIndex].byteCount; i += 2)
            {
                if (line == ":100090001F920F920FB60F9211242F933F938F93BD")
                {
                    ;
                }
                
                commandBytes[1] = (byte)lineSpan.Slice2Char();

                CommandTemplate command = FindCommand(commandBytes);
                parsedLines[lineIndex].commands.Add(command);
                command.RunCommand(programData, commandBytes, ref lineSpan, ref i);
            }
            parsedLines[lineIndex].checksum = (byte)lineSpan.Slice2Char();  
        }
        
    }
}
