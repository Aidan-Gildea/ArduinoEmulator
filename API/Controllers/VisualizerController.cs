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
    public sealed record CompileCodeResponse(string? HexText, List<string> Errors);

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
    public ActionResult<CompileCodeResponse> CompileCode([FromBody] string sourceCode)
    {
        try
        {
            CompileCode compile = new CompileCode();
            var hexText = compile.ReturnHexFile(sourceCode);
            return Ok(new CompileCodeResponse(hexText, []));
        }
        catch (Exception ex)
        {
            var errorMessages = ex.Message
                .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(message => !string.IsNullOrWhiteSpace(message))
                .ToList();

            if (errorMessages.Count == 0)
            {
                errorMessages.Add("Arduino compilation failed.");
            }

            return Ok(new CompileCodeResponse(null, errorMessages));
        }
    }
} 