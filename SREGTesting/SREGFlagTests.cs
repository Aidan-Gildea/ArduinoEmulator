using Emulator;
using Xunit;

namespace SREGTesting;

public class SREGTesting
{
    [Theory]
    [InlineData(0, 5, true, 0b00100000)]
    [InlineData(0b11111111, 3, false, 0b11110111)]
    [InlineData(0, 7, true, 0b10000000)]
    [InlineData(0b11111111, 0, false, 0b11111110)]
    public void SetBitFunction(byte statusRegisterStart, byte index, bool bit, byte expectedOutput)
    {
        MachineData machineData = new MachineData();

        machineData.StatusRegister.SREGByte = statusRegisterStart;

        machineData.StatusRegister.SetBit(index, bit);

        Assert.Equal(machineData.StatusRegister.SREGByte, expectedOutput);
    }
}

