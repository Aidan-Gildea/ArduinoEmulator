using Emulator;
using Xunit;

namespace SREGTesting;

public class SREGTesting
{
    // Helper to extract SREG bits
    private static bool GetBit(byte value, int bit) => (value & (1 << bit)) != 0;

    [Theory]
    // Z: Zero flag
    [InlineData(0x20, 0x20, 0x00, true, false, false, false, false, false)] // Z set
    [InlineData(0x20, 0x10, 0x10, false, false, false, false, false, false)] // Z clear
    // N: Negative flag
    [InlineData(0x80, 0x01, 0x7F, false, false, false, false, false, false)] // N clear, C should be false
    [InlineData(0x01, 0x02, 0xFF, false, true, false, false, false, false)] // N set
    // C: Carry flag
    [InlineData(0x00, 0x01, 0xFF, false, false, false, false, true, false)] // C set
    [InlineData(0xFF, 0x01, 0xFE, false, true, false, false, false, true)] // N and S should be true
    // H: Half-carry flag
    [InlineData(0x08, 0x01, 0x07, false, false, true, false, false, false)] // H set
    [InlineData(0x0F, 0x01, 0x0E, false, false, false, false, false, false)] // H clear
    // V: Overflow flag
    [InlineData(0x80, 0xFF, 0x81, false, false, false, false, false, true)] // V set
    [InlineData(0x7F, 0x01, 0x7E, false, false, false, false, false, false)] // V clear
    // S: Sign flag (N ^ V)
    [InlineData(0x80, 0xFF, 0x81, false, true, false, false, true, true)] // V should be true
    [InlineData(0x7F, 0x01, 0x7E, false, false, false, false, false, false)] // S clear
    public void SREG_Flag_Emulation(byte rdValue, byte K, byte result, bool expectZ, bool expectN, bool expectH, bool expectC, bool expectV, bool expectS)
    {
        var pd = new ProgramData();
        pd.SetSREGFlags(rdValue, K, result);
        byte sreg = pd.ioSpace[0x3F];
        Assert.Equal(expectZ, GetBit(sreg, 1)); // Z
        Assert.Equal(expectN, GetBit(sreg, 2)); // N
        Assert.Equal(expectH, GetBit(sreg, 5)); // H
        Assert.Equal(expectC, GetBit(sreg, 0)); // C
        Assert.Equal(expectV, GetBit(sreg, 3)); // V
        Assert.Equal(expectS, GetBit(sreg, 4)); // S
    }
}

