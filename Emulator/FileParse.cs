using System.Reflection;
using System.Reflection.Metadata;
using System.Runtime.CompilerServices;

namespace Emulator;

public class LineFormat
{
    public ushort byteCount;
    public uint address;
    public ushort recordType;
    public byte[] data;
    public ushort checksum;
};

public class Program
{
    public static ProgramData programData; 
    public static Dictionary<int, List<Func<CommandTemplate>>> TestDictionary = new Dictionary<int, List<Func<CommandTemplate>>>()
    {
        [0b1001010] = new List<Func<CommandTemplate>>() { () => new JMP() },
    };

    public static bool VerifyLineStart(int lineStart)
    {
        const char expectedLineStart = ':';
        return expectedLineStart == lineStart;
    }

    public static CommandTemplate FindCommand(byte[] commandBytes)
    {
        foreach (var item in TestDictionary[commandBytes[1] >> 1])
        {
            CommandTemplate command = item();
            if (command.ConfirmCommand(commandBytes))
            {
                return command;
            }
        }
        return null;
    }
    public static void Main()
    {
        string[] fileData = File.ReadAllLines("/Users/liz/Documents/PlatformIO/ArduinoPlayground/.pio/build/ATmega328P/firmware.hex");

        LineFormat[] parsedLines = new LineFormat[fileData.Length];
        int lineIndex = 0;

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
                byte[] commandBytes = new byte[]
                {
                    (byte)lineSpan.Slice2Char(),
                    (byte)lineSpan.Slice2Char(),
                };

                CommandTemplate command = FindCommand(commandBytes);
                command.RunCommand(programData, commandBytes, ref lineSpan, ref i);
            }
            byte endOfLine = (byte)lineSpan.Slice2Char(); 
        }
        
    }
}
