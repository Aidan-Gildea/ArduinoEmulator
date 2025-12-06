using Microsoft.AspNetCore.Mvc;
using Emulator;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace API.Controllers;

// public class ByteArrayAsNumbersConverter : JsonConverter<byte[]>
// {
//     public override byte[] Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
//     {
//         var values = new List<byte>();

//         while (reader.Read())
//         {
//             if (reader.TokenType == JsonTokenType.EndArray)
//                 break;

//             if (reader.TokenType == JsonTokenType.Number)
//                 values.Add(reader.GetByte());
//         }

//         return values.ToArray();
//     }

//     public override void Write(Utf8JsonWriter writer, byte[] value, JsonSerializerOptions options)
//     {
//         writer.WriteStartArray();

//         foreach (var b in value)
//             writer.WriteNumberValue(b);

//         writer.WriteEndArray();
//     }
// }

// public record ByteArrayResponse(
//     [property: JsonConverter(typeof(ByteArrayAsNumbersConverter))] byte[] data
// );

public class CatData
{
    public int Age {get; set;}
    public string Name {get; set;}

    public CatData()
    {
        Age = 0;
        Name = string.Empty;
    }
}


[ApiController]
[Route("[controller]")]
public class Visualizer : ControllerBase
{
    CatData catData;

    // [HttpGet("GetHealth")]
    // public IActionResult GetHealth()
    // {
    //     return Ok();
    // }

    // [HttpPost("ParseInstruction")]
    // public MachineData ParseInstruction(CommandTemplate command, string instructionHex, MachineData previousState)
    // {
    //     //return FileParse.ParseCommand(command, instructionHex, previousState);
    // }

    [HttpPost("UpdateCatData")]
    public ActionResult<CatData> UpdateCatData([FromBody] CatData catData)
    {
        return Ok(catData);
    }
}