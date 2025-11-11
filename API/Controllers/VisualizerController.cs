using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]
public class Visualizer : ControllerBase
{
    List<InstructionData> instructions = new List<InstructionData>();
    private static byte[] registers = new byte[32];

    [HttpPost("PostRegisterData")]
    public void PostRegisterData(byte[] Registers)
    {
        registers = Registers;
        
    }

    [HttpGet("GetRegisterData")]
    public byte[] GetRegisterData()
    {
        return registers;
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