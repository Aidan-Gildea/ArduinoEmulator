public static class SpanExtensionFunctons
{
    public static char SliceStart(this ReadOnlySpan<char> data)
    {
        const int SLICE_SIZE = 1;
        char sliceToReturn = ' ';

        ReadOnlySpan<char> dataSlice = data.Slice(0, SLICE_SIZE);
        sliceToReturn = dataSlice[0];
        data = data.Slice(SLICE_SIZE);

        return sliceToReturn;
    }
    public static int SliceU1(this ReadOnlySpan<char> data)
    {
        const int SLICE_SIZE = 1;

        ReadOnlySpan<char> dataSlice = data.Slice(0, SLICE_SIZE);
        int resultingNumber = (dataSlice[0] - '0');
        data = data.Slice(SLICE_SIZE);

        return resultingNumber;
    }
    public static ushort SliceU2(this ReadOnlySpan<char> data)
    {
        const int SLICE_SIZE = 2;

        ReadOnlySpan<char> dataSlice = data.Slice(0, SLICE_SIZE);
        ushort resultingNumber = (ushort)(((dataSlice[0] - '0') * 16) + (dataSlice[1] - '0'));
        data = data.Slice(SLICE_SIZE);

        return resultingNumber;
    }
}