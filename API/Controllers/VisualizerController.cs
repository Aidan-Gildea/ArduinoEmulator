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
    public List<CommandInformation> FindAllInstructions([FromBody] string[] dataLines)
    {
        FindInstruction find = new FindInstruction();

        return find.FindAllCommands(dataLines);
    }

    [HttpPost("RunInstruction")]
    public MachineData.Diff RunInstruction([FromBody] MachineData state)
    {   
        Parse parse = new Parse();

        return parse.ParseCommand(state);
    }
}