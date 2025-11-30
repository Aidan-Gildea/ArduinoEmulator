using System.ComponentModel.Design;
using System.IO.Compression;
using System.Reflection;
using System.Reflection.Metadata;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Text.Json.Nodes;
using System.Text;
using System.Diagnostics.Tracing;

namespace Emulator;

public class LineFormat
{
    public ushort byteCount;
    public uint address;
    public ushort recordType;
    public List<CommandTemplate> commands = new List<CommandTemplate>();
    public ushort checksum;
};

public class FileParse
{
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
    
    public MachineData ParseCommand(CommandTemplate command, string inlineHex, int linePosition, MachineData previousState)
    {
        ReadOnlySpan<char> instructionHexSpan = inlineHex.AsSpan(linePosition);

        MachineData newState = previousState; // Made for ease of readibility 

        byte[] commandBytes = new byte[2];

        commandBytes[0] = (byte)instructionHexSpan.Slice2Char();
        commandBytes[1] = (byte)instructionHexSpan.Slice2Char();

        command.RunCommand(newState, commandBytes, ref instructionHexSpan);
        
        return newState;
    }

    public static void Main()
    {
        
    }
}
