using System.Configuration.Assemblies;
using System.Data;
using System.Reflection.Metadata.Ecma335;
using Emulator;

public class ProgramData
{
    public int pc;
    public byte[] registers;
    public byte[] ioSpace;

    public ProgramData()
    {
        pc = 0;
        registers = new byte[32];
        ioSpace = new byte[64];
    }
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

public class EOR() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highR = (byte)((commandBytes[1] >> 1) & 1);
        byte highD = (byte)(commandBytes[1] & 1);

        byte remainingD = (byte)(commandBytes[0] >> 4);
        byte remainingR = (byte)(commandBytes[0] & 0b1111);

        byte rRegAddress = (byte)((highR << 5) | remainingR);
        byte dRegAddress = (byte)((highD << 5) | remainingD);

        program.registers[dRegAddress] = (byte)(program.registers[dRegAddress] ^ program.registers[rRegAddress]);

        program.pc++;
    }
}

public class OUT() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => ((commandBytes[1] >> 3) & 0b1) == 1;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte twoHighAABytes = (byte)((commandBytes[1] >> 1) & 0b11);
        byte highRByte = (byte)(commandBytes[1] & 1);

        byte IOAddress = (byte)((twoHighAABytes << 4) | commandBytes[0] & 0b1111);
        byte registerAddress = (byte)((highRByte << 4) | (commandBytes[0] >> 4));

        program.ioSpace[IOAddress] = program.registers[registerAddress];
        program.pc++;
    }
}

public class LDI() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte lowKBytes = (byte)(commandBytes[0] & 0b1111);

        byte dBytes = (byte)((commandBytes[0] >> 4) & 0b1111); // might need to change
        dBytes += 16;

        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);
        program.registers[dBytes] = kNumber;

        program.pc++;
    }
}

public class IN() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => ((commandBytes[1] >> 3) & 0b1) == 0;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte twoHighAABytes = (byte)((commandBytes[1] >> 1) & 0b11);
        byte highDByte = (byte)(commandBytes[1] & 1);

        byte IOAddress = (byte)((twoHighAABytes << 4) | commandBytes[0] & 0b1111);
        byte registerAddress = (byte)((highDByte << 4) | (commandBytes[0] >> 4));

        program.registers[registerAddress] = program.ioSpace[IOAddress];
        program.pc++;
    }
}