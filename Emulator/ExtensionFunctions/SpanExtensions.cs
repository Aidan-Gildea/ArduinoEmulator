public static class SpanExtensionFunctons
{
    public static uint ConvertSliceToDecimal(this ref ReadOnlySpan<char> dataSlice)
    {
        int currentPowerOf16 = dataSlice.Length - 1;
        uint resultingNumber = 0;

        foreach (var character in dataSlice)
        {
            if (character >= '0' && character <= '9')
            {
                resultingNumber += (uint)((character - '0') * Math.Pow(16, currentPowerOf16));
            }
            else if (character >= 'A' && character <= 'F')
            {
                resultingNumber += (uint)((character - ('A' - 10)) * Math.Pow(16, currentPowerOf16));
            }
            else if (character == ':') return character;

            currentPowerOf16--;
        }
        return resultingNumber;
    }
    public static int Slice1Char(this ref ReadOnlySpan<char> data)
    {
        const int SLICE_SIZE = 1;

        ReadOnlySpan<char> dataSlice = data.Slice(0, SLICE_SIZE);
        int resultingNumber = (int)dataSlice.ConvertSliceToDecimal();
        data = data.Slice(SLICE_SIZE);

        return resultingNumber;
    }
    public static ushort Slice2Char(this ref ReadOnlySpan<char> data)
    {
        const int SLICE_SIZE = 2;

        ReadOnlySpan<char> dataSlice = data.Slice(0, SLICE_SIZE);
        ushort resultingNumber = (ushort)dataSlice.ConvertSliceToDecimal();
        data = data.Slice(SLICE_SIZE);

        return resultingNumber;
    }
    public static uint Slice4Char(this ref ReadOnlySpan<char> data)
    {
        const int SLICE_SIZE = 4;

        ReadOnlySpan<char> dataSlice = data.Slice(0, SLICE_SIZE);
        uint resultingNumber = dataSlice.ConvertSliceToDecimal();
        data = data.Slice(SLICE_SIZE);

        return resultingNumber;
    }
}