using SharedDomainTypes;

namespace CustomTypeTesting;

public class ThreeNibbleTests
{
    [Theory]
    [InlineData(0, 0)]
    [InlineData(2047, 2047)]
    public void NumbersWithoutFirstBit(int input, int expectedOutput)
    {
        ThreeNibble threeNibble = input;

        Assert.True(threeNibble == expectedOutput);
    }

    [Theory]
    [InlineData(2447, 399)]
    [InlineData(2048, 0)]
    public void NumbersWithFirstBit(int input, int expectedOutput)
    {
        ThreeNibble threeNibble = input;

        Assert.True(threeNibble == expectedOutput);
    }
}
