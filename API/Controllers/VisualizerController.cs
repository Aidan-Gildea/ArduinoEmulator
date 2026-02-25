using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
using SharedDomainTypes;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]
public class VisualizerController : ControllerBase
{
    [HttpPost("FindAllInstructions")]
    public IActionResult FindAllInstructions([FromBody] string[] dataLines)
    {
        FindInstruction find = new FindInstruction();

        string serializedJson = JsonSerializer.Serialize(find.FindAllCommands(dataLines));

        return Ok(serializedJson);
    }

    [HttpPost("RunInstruction")]
    public MachineData.Diff RunInstruction([FromBody] MachineData state)
    {   
        Parse parse = new Parse();

        return parse.ParseCommand(state);
    }

    [HttpPost("CompileCode")]
    public string CompileCode([FromBody] string sourceCode)
    {
        string APICheck = "Hello from API!";
        return APICheck;
        throw new ArgumentException("ENDPOINT HAS NOT BEEN FULLY IMPLEMENTED");
        return "";
    }
} 