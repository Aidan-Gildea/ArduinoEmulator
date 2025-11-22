using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace API.Controllers;

public class ByteArrayAsNumbersConverter : JsonConverter<byte[]>
{
    public override byte[] Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var values = new List<byte>();

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndArray)
                break;

            if (reader.TokenType == JsonTokenType.Number)
                values.Add(reader.GetByte());
        }

        return values.ToArray();
    }

    public override void Write(Utf8JsonWriter writer, byte[] value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();

        foreach (var b in value)
            writer.WriteNumberValue(b);

        writer.WriteEndArray();
    }
}

public record ByteArrayResponse(
    [property: JsonConverter(typeof(ByteArrayAsNumbersConverter))] byte[] data
);


[ApiController]
[Route("[controller]")]
public class Visualizer : ControllerBase
{
    List<InstructionData> instructions = new List<InstructionData>();
    private static byte[] registers = new byte[32];
    private static string hexInstruction = "Instructon not available.";

    [HttpGet("GetRegisterData")]
    public IActionResult GetRegisterData()
    {
        return Ok(new ByteArrayResponse(registers));
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

    [HttpGet("GetHexInstruction")]
    public IActionResult GetInstruction()
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