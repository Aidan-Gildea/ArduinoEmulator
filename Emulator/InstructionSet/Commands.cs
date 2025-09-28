using System.Reflection.Metadata.Ecma335;

public class ProgramData
{
    public int pc;
}

public abstract class CommandTemplate
{
    public abstract bool ConfirmCommand(byte[] commandBytes);
    public abstract void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex);
}

public class JMP() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => (commandBytes[0] >> 1) == 0b110;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        ushort lastByte = fileSpan.Slice2Char();
        ushort nextByte = fileSpan.Slice2Char();

        int address = (byte)(commandBytes[1] & 1) << 22 | (byte)(commandBytes[0] >> 4) << 17 | (byte)(commandBytes[0] & 1) << 16 | (byte)(nextByte) << 8 | (byte)lastByte;
        commandIndex += 2;

        program.pc = address;
    }
}