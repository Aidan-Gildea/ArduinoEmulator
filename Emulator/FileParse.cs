using System.ComponentModel.Design;
using System.IO.Compression;
using System.Reflection;
using System.Reflection.Metadata;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Nodes;

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
    public static Dictionary<int, char> NumberToLetter = new Dictionary<int, char>()
    {
        [1] = '1',
        [2] = '2',
        [3] = '3',
        [4] = '4',
        [5] = '5',
        [6] = '6',
        [7] = '7',
        [8] = '8',
        [9] = '9',
        [10] = 'A',
        [11] = 'B',
        [12] = 'C',
        [13] = 'D',
        [14] = 'E',
        [15] = 'F'
    };

    public static string ConvertAsciiToHexRecursion(int number, int quotient, int remainder)
    {
        if (quotient == 0) return $"{NumberToLetter[remainder]}";

        string resultingString = ConvertAsciiToHexRecursion(number, quotient / 16, quotient % 16);

        resultingString += $"{NumberToLetter[remainder]}";

        return resultingString;
    }
    public static string ConvertAsciiToHex(int number)
    {
        return ConvertAsciiToHexRecursion(number, number / 16, number % 16);
    }

    public static MachineData programData = new MachineData();
    public interface IEmulatorService
    {
        public int GetProgramCounter()
        {
            return programData.PC;
        }
        public List<byte> GetStatusRegisterBits()
        {
            List<byte> StatusRegisterBits = new List<byte>();

            for (int i = 0; i < 8; i++)
            {
                StatusRegisterBits.Add((byte)((programData.StatusRegister.SREGByte >> i) & 0b1));
            }

            return StatusRegisterBits;
        }


    }

    public static Dictionary<int, List<Func<CommandTemplate>>> SixBitOpCodes = new Dictionary<int, List<Func<CommandTemplate>>>()
    {
        [0b100101] = new List<Func<CommandTemplate>>() { () => new JMP(), () => new CALL() },
        [0b001001] = new List<Func<CommandTemplate>>() { () => new EOR() },
        [0b100100] = new List<Func<CommandTemplate>>() { () => new STX() },
        [0b000001] = new List<Func<CommandTemplate>>() { () => new CPC() },
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
        [0b0011] = new List<Func<CommandTemplate>>() { () => new CPI() }
    };

    public static bool VerifyLineStart(int lineStart)
    {
        const char expectedLineStart = ':';
        return expectedLineStart == lineStart;
    }

    public static CommandTemplate FindCommand(byte[] commandBytes, string fullLine, ref ReadOnlySpan<char> line)
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
        // Create an API client. Base URL can be overridden via environment variable API_BASE (e.g. "https://localhost:5001/")
        string baseUrl = Environment.GetEnvironmentVariable("API_BASE") ?? "http://localhost:5024";
        ApiClient api = new ApiClient(baseUrl);

        HttpClient client = new HttpClient();

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
                commandBytes[0] = (byte)lineSpan.Slice2Char(); ;
                commandBytes[1] = (byte)lineSpan.Slice2Char();

                string instructionHex = ConvertAsciiToHex(commandBytes[1]) + ConvertAsciiToHex(commandBytes[0]);
                string serializedHex = JsonSerializer.Serialize(instructionHex);

                //client.PostAsync("PostHEXInstruction", (serializedHex));

                CommandTemplate command = FindCommand(commandBytes, line, ref lineSpan);
                parsedLines[lineIndex].commands.Add(command);
                command.RunCommand(programData, commandBytes, ref lineSpan, ref i);

            }
            parsedLines[lineIndex].checksum = (byte)lineSpan.Slice2Char(); 
        }

    }
}
