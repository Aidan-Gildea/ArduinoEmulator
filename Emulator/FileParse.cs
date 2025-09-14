using System.Runtime.CompilerServices;

namespace Emulator;
public class LineFormat
{
    byte byteCount;

}

public class Program
{
    public static void Main()
    {
        byte[] data = File.ReadAllBytes("/Users/liz/Documents/PlatformIO/ArduinoPlayground/.pio/build/ATmega328P/firmware.hex");
        string[] testData = File.ReadAllLines("/Users/liz/Documents/PlatformIO/ArduinoPlayground/.pio/build/ATmega328P/firmware.hex");
        ;
    }
}
