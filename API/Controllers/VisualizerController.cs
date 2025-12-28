using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]
public class VisualizerController : ControllerBase
{
    [HttpPost("FindAllInstructions")]
    public List<CommandTemplate> FindAllInstructions([FromBody] string[] dataLines)
    {
        FindInstruction find = new FindInstruction();

        return find.FindAllCommands(dataLines);
    }

    [HttpPost("RunInstruction")]
    public MachineData.Diff RunInstruction()
    {    
        // Test setup: Create ADD R4, R2 instruction (R4 = R4 + R2)
        // Opcode bytes: [0x0C, 0x42]
        var addInstruction = new ADD(new List<byte> { 0x0C, 0x42 });
        
        var data = new MachineData();
        
        // Set initial register values for testing
        data.DataSpace[2] = 0x05;  // R2 = 5
        data.DataSpace[3] = 0x07;  // R3 = 7
        data.DataSpace[4] = 0x03;  // R4 = 3
        
        // Clone state before execution
        MachineData before = data.Clone();
        
        // Run the instruction (R4 will become 3 + 5 = 8)
        addInstruction.RunCommand(data);
        
        // Calculate diff
        var diff = MachineData.CalculateChanges(before, data);
        
        return diff;
    }
}