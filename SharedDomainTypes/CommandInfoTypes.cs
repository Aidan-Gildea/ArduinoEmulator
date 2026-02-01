namespace SharedDomainTypes;

public class CommandInformation
{
    public string CommandName { get; set; } = string.Empty;
    public List<byte> CommandBytes { get; set; } = new();
}

public class ProgramStack<T>()
{
    public Stack<T> Stack = new Stack<T>();
    public int StackPointer;
}
public class SRAM
{
    public Stack<byte> Stack = new Stack<byte>();
}

public class MachineData
{
    public CommandInformation? CommandToParse {get; set;}
    public int PC;
    public byte[] DataSpace = new byte[2000];

    public int SP;

    public SREG StatusRegister = new SREG();

    public MachineData()
    {
        PC = 0;
        // Initialize SP to the end of the DataSpace (stack grows down)
        SP = DataSpace.Length; 
    }

    public MachineData Clone()
    {
        return new MachineData
        {
            PC = PC,
            SP = SP,
            StatusRegister = new SREG { SREGByte = StatusRegister.SREGByte },
            DataSpace = (byte[])DataSpace.Clone(),
            CommandToParse = CommandToParse
        };
    }

    public class DataChange
    {
        public int Index { get; init; }
        public byte Before { get; init; }
        public byte After { get; init; }
    }

    public class Diff
    {
        public int? PC { get; init; }
        public int? SP { get; init; }
        public byte? SREGByte { get; init; }
        public List<DataChange> DataChanges { get; init; } = new List<DataChange>();
    }

    public static Diff CalculateChanges(MachineData before, MachineData after)
    {
        if (before == null || after == null) throw new ArgumentNullException("before/after cannot be null");

        var diff = new Diff
        {
            PC = before.PC == after.PC ? null : after.PC,
            SP = before.SP == after.SP ? null : after.SP,
            SREGByte = before.StatusRegister.SREGByte == after.StatusRegister.SREGByte ? null : after.StatusRegister.SREGByte,
            DataChanges = new List<DataChange>()
        };

        int length = Math.Min(before.DataSpace.Length, after.DataSpace.Length);
        for (int i = 0; i < length; i++)
        {
            byte b = before.DataSpace[i];
            byte a = after.DataSpace[i];
            if (b != a)
            {
                diff.DataChanges.Add(new DataChange { Index = i, Before = b, After = a });
            }
        }

        return diff;
    }

    // Push a single byte onto the DataSpace-backed stack (stack grows down)
    public void PushByte(byte value)
    {
        if (SP - 1 < 0) throw new InvalidOperationException("Stack overflow on PushByte");
        SP -= 1;
        DataSpace[SP] = value;
    }

    // Pop a single byte from the stack
    public byte PopByte()
    {
        if (SP >= DataSpace.Length) throw new InvalidOperationException("Stack underflow on PopByte");
        byte v = DataSpace[SP];
        SP += 1;
        return v;
    }

    // Push a 32-bit integer onto the stack as 4 bytes (MSB first), so PopInt32 returns the same int
    public void PushInt32(int value)
    {
        // Push MSB first so PopInt32 can reconstruct in the same order
        PushByte((byte)((value >> 24) & 0xFF));
        PushByte((byte)((value >> 16) & 0xFF));
        PushByte((byte)((value >> 8) & 0xFF));
        PushByte((byte)(value & 0xFF));
    }

    // Pop a 32-bit integer that was pushed by PushInt32
    public int PopInt32()
    {
        int b0 = PopByte();
        int b1 = PopByte();
        int b2 = PopByte();
        int b3 = PopByte();
        return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    }
}

public class SREG
{
    public byte SREGByte = 0;
    /*
        C: Carry
        Z: Zero
        N: Negative 
        V: Two's Complement
        S: Sign
        H: Half Carry
        T: Transfer
        I: Global
    */

    public void SetBit(byte index, bool bit)
    {
        byte mask = (byte)(1 << index);

        if (bit) SREGByte |= mask;
        else SREGByte &= (byte)~mask;
        ;
    }
}