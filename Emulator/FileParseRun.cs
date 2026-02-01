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
using System.Data;
using Generated;
using SharedDomainTypes;

namespace Emulator;

public class Parse
{   
    public MachineData.Diff ParseCommand(MachineData state)
    {
        MachineData previousState = state.Clone(); // MachineData previous = data; DOESN'T WORK!! Classes are reference types, they have the same pointer
        Func<List<byte>, CommandTemplate> test = CommandRegistry.Map[state.CommandToParse.CommandName];
        CommandTemplate resultingCommand = test(state.CommandToParse.CommandBytes);
        ;
        //state.CommandToParse?.RunCommand(state);
        //throw new ArgumentException("Commented out code here.");

        MachineData.Diff diff = new MachineData.Diff();
        diff = MachineData.CalculateChanges(previousState, state);
        
        return diff;
    }
}
