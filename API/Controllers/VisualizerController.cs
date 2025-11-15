using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;
using System.Text.Json;

namespace API.Controllers;

public record ByteArrayResponse (int[] data);

[ApiController]
[Route("[controller]")]
public class Visualizer : ControllerBase
{
    List<InstructionData> instructions = new List<InstructionData>();
    private static byte[] registers = new byte[32];

    [HttpGet("GetRegisterData")]
    public IActionResult GetRegisterData()
    {
        return Ok(new ByteArrayResponse(registers.Select(b => (int)b).ToArray()));
    }

    [HttpPost("PostRegisterData")]
    public IActionResult PostRegisterData([FromBody] byte[] Registers)
    {
        registers = Registers;
        return Ok(Registers);
    }

    [HttpPost("PostHEXInstruction")]
    public IActionResult PostHEXInstruction([FromBody] string hexInstruction)
    {
        return Ok(hexInstruction);
    }

    [HttpGet("GetHi")]
    public string GetHi()
    {
        return "Hi";
    }
}

record InstructionData(string instructionHEX);