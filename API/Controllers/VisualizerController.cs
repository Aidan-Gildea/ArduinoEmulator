using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]
public class Visualizer : ControllerBase
{
    MachineData machineData = new MachineData();

    [HttpGet("GetHi")]
    public string GetHi()
    {
        return "Hi";
    }
}
