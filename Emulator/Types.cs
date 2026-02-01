namespace Emulator;

public class CommandInformation
{
    public string CommandName { get; set; } = string.Empty;
    public List<byte> CommandBytes { get; set; } = new();
}