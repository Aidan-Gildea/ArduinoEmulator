using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Globalization;
using System.Text.Json;
using SharedDomainTypes;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]
public class VisualizerController : ControllerBase
{
    public sealed record CompileCodeResponse(string? HexText, string? ElfBase64, List<CommandInformation> Instructions, List<string> Errors);

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
            var artifacts = compile.CompileSketch(sourceCode);
            var find = new FindInstruction();
            var instructions = find.FindAllCommands(ExtractInstructionDataLines(artifacts.HexText));
            var sourceLineCount = CountSourceLines(sourceCode);

            try
            {
                ElfSourceLineResolver.ApplySourceLines(
                    artifacts.ElfFilePath,
                    artifacts.SketchFilePath,
                    sourceLineCount,
                    instructions);
            }
            catch (Exception resolveEx)
            {
                Console.WriteLine($"ELF source-line mapping unavailable: {resolveEx.Message}");
            }

            var elfBase64 = Convert.ToBase64String(artifacts.ElfBytes);
            return Ok(new CompileCodeResponse(artifacts.HexText, elfBase64, instructions, []));
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

            return Ok(new CompileCodeResponse(null, null, [], errorMessages));
        }
    }

    private static string[] ExtractInstructionDataLines(string hexText)
    {
        var lines = hexText.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var dataLines = new List<string>();

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (line.Length < 11 || !line.StartsWith(':'))
            {
                continue;
            }

            var dataCount = ParseHexByte(line.AsSpan(1, 2));
            var recordType = ParseHexByte(line.AsSpan(7, 2));

            if (recordType != 0 || dataCount <= 0)
            {
                continue;
            }

            var dataLength = dataCount * 2;
            if (line.Length < 9 + dataLength)
            {
                continue;
            }

            dataLines.Add(line.Substring(9, dataLength));
        }

        return dataLines.ToArray();
    }

    private static byte ParseHexByte(ReadOnlySpan<char> twoHexDigits)
    {
        return byte.TryParse(twoHexDigits, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : (byte)0;
    }

    private static int CountSourceLines(string sourceCode)
    {
        if (string.IsNullOrEmpty(sourceCode))
        {
            return 0;
        }

        return sourceCode.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n').Length;
    }
} 