using System.Reflection.Metadata;
using System.Runtime.CompilerServices;

namespace Emulator;

public class LineFormat
{
    public ushort byteCount;
    public uint address;
    public ushort recordType;
    public byte[] data;
    public ushort checksum;
}

public class Program
{
    public static bool VerifyLineStart(char lineStart)
    {
        const char expectedLineStart = ':';
        return expectedLineStart == lineStart;
    }
    public static void Main()
    {
        string[] fileData = File.ReadAllLines("/Users/liz/Documents/PlatformIO/ArduinoPlayground/.pio/build/ATmega328P/firmware.hex");
  
        LineFormat[] parsedLines = new LineFormat[fileData.Length];
        int lineIndex = 0;

        foreach (var line in fileData)
        {
            ReadOnlySpan<char> lineSpan = line.AsSpan();
            parsedLines[lineIndex] = new LineFormat();

            if (!VerifyLineStart(lineSpan.SliceStart())) throw new ArgumentException("Line start does not match expected line start.");

            parsedLines[lineIndex].byteCount = lineSpan.SliceU2();
            ;
        }
        ;
    }
}
