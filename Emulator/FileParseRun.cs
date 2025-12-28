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
    public MachineData.Diff ParseCommand(MachineData previousState)
    {

        MachineData newState = previousState; // Made for ease of readibility 

        newState.commandToParse?.RunCommand(newState);

        MachineData.Diff diff = new MachineData.Diff();
        diff = MachineData.CalculateChanges(previousState, newState);
        
        return diff;
    }

    public static void Main()
    {
        
    }
}
