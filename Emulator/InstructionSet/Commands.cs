using System.ComponentModel;
using System.Configuration.Assemblies;
using System.Data;
using System.Reflection.Metadata.Ecma335;
using Emulator;
using SharedDomainTypes;

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
    public CommandTemplate? commandToParse;
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
            commandToParse = commandToParse
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

public abstract class CommandTemplate
{
    public List<byte> CommandBytes { get; protected set; }
    public abstract int AdditionalBytesNeeded { get; }
    public abstract string Identifier { get; }

    protected CommandTemplate(List<byte> commandBytes)
    {
        CommandBytes = commandBytes;
    }

    public abstract bool ConfirmCommand(byte dataByte, byte opCodeByte);
    public abstract void RunCommand(MachineData program);
}

public class UnknownCommand(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "NO COMMAND FOUND";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => false;
    public override void RunCommand(MachineData program) { }
}

public class ADD(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "ADD";
    public override int AdditionalBytesNeeded => 0;
    // ADD: Add without Carry
    // Opcode: 0000 11rd dddd rrrr
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        
        byte highRBit = (byte)((opCodeByte >> 1) & 0x1);
        byte highDBit = (byte)(opCodeByte & 0x1);
        byte dLow = (byte)((dataByte >> 4) & 0x0F);
        byte rLow = (byte)(dataByte & 0x0F);

        byte rdIndex = (byte)((highDBit << 4) | dLow);
        byte rrIndex = (byte)((highRBit << 4) | rLow);

        byte rd = program.DataSpace[rdIndex];
        byte rr = program.DataSpace[rrIndex];
        int result = rd + rr;

        program.DataSpace[rdIndex] = (byte)(result & 0xFF);

        Console.WriteLine($"ADD R{rdIndex}, R{rrIndex}");
        program.PC++;
    }
}

public class ADC(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "ADC";
    public override int AdditionalBytesNeeded => 0;
    // ADC: Add with Carry
    // Opcode: 0001 11rd dddd rrrr
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        
        byte highRBit = (byte)((opCodeByte >> 1) & 0x1);
        byte highDBit = (byte)(opCodeByte & 0x1);
        byte dLow = (byte)((dataByte >> 4) & 0x0F);
        byte rLow = (byte)(dataByte & 0x0F);

        byte rdIndex = (byte)((highDBit << 4) | dLow);
        byte rrIndex = (byte)((highRBit << 4) | rLow);

        byte rd = program.DataSpace[rdIndex];
        byte rr = program.DataSpace[rrIndex];
        byte carry = (byte)((program.StatusRegister.SREGByte & 0x1) != 0 ? 1 : 0);
        int result = rd + rr + carry;

        program.DataSpace[rdIndex] = (byte)(result & 0xFF);

        Console.WriteLine($"ADC R{rdIndex}, R{rrIndex}");
        program.PC++;
    }
}

public class ADIW(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "ADIW";
    public override int AdditionalBytesNeeded => 0;
    // ADIW: Add Immediate to Word
    // Opcode: 1001 0110 KKdd KKKK
    // Operates on register pairs: R24:R25, R26:R27, R28:R29, R30:R31
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (opCodeByte & 0xFE) == 0x96;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        
        // Extract immediate value K (6 bits)
        byte kHigh = (byte)((dataByte >> 6) & 0x3);
        byte kLow = (byte)(dataByte & 0xF);
        byte k = (byte)((kHigh << 4) | kLow);
        
        // Extract register pair index (2 bits)
        byte d = (byte)((dataByte >> 4) & 0x3);
        byte rdIndex = (byte)(24 + (d * 2));  // Maps to R24, R26, R28, or R30
        
        // Read 16-bit value from register pair (little-endian)
        ushort rdValue = (ushort)(program.DataSpace[rdIndex] | (program.DataSpace[rdIndex + 1] << 8));
        ushort result = (ushort)(rdValue + k);
        
        // Write back to register pair
        program.DataSpace[rdIndex] = (byte)(result & 0xFF);
        program.DataSpace[rdIndex + 1] = (byte)((result >> 8) & 0xFF);

        Console.WriteLine($"ADIW R{rdIndex}:R{rdIndex + 1}, {k}");
        program.PC++;
    }
}

public class BRBC(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "BRBC";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte sregIndex = (byte)(CommandBytes[0] & 0b111);
        byte highK = (byte)(CommandBytes[1] & 0b11);
        byte lowK = (byte)(CommandBytes[0] >> 3);
        int k = (highK << 5) | lowK;
        int signedK = (k & 0x40) != 0 ? k - 128 : k;
        bool bitSet = ((program.StatusRegister.SREGByte >> sregIndex) & 1) != 0;
        if (!bitSet) { program.PC += signedK + 1; Console.WriteLine($"BRBC {sregIndex}, {signedK + 1}"); }
        else { program.PC++; Console.WriteLine($"BRBC {sregIndex}, not taken"); }
    }
}

public class BRBS(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "BRBS";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte sregIndex = (byte)(CommandBytes[0] & 0b111);
        byte highK = (byte)(CommandBytes[1] & 0b11);
        byte lowK = (byte)(CommandBytes[0] >> 3);
        int k = (highK << 5) | lowK;
        int signedK = (k & 0x40) != 0 ? k - 128 : k;
        bool bitSet = ((program.StatusRegister.SREGByte >> sregIndex) & 1) != 0;
        if (bitSet) { program.PC += signedK + 1; Console.WriteLine($"BRBS {sregIndex}, {signedK + 1}"); }
        else { program.PC++; Console.WriteLine($"BRBS {sregIndex}, not taken"); }
    }
}

public class CALL(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CALL";
    public override int AdditionalBytesNeeded => 2;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (((dataByte >> 1) & 0b111) == 0b111) && (((opCodeByte >> 1) & 0b0) == 0b0);
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highByte = CommandBytes.Count > 2 ? CommandBytes[2] : (byte)0;
        byte lowByte = CommandBytes.Count > 3 ? CommandBytes[3] : (byte)0;
        int address = (byte)(opCodeByte & 1) << 22 | (byte)(dataByte >> 4) << 17 | (byte)(dataByte & 1) << 16 | (highByte << 8) | lowByte;
        int returnAddress = program.PC + 1; program.PushInt32(returnAddress);
        program.PC = address;
        Console.WriteLine($"CALL 0x{address:X6}");
    }
}

public class CLI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CLI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => opCodeByte == 0x94 && dataByte == 0xf8;
    public override void RunCommand(MachineData program)
    {
        program.StatusRegister.SetBit(7, false);
        Console.WriteLine("CLI");
        program.PC++;
    }
}

public class CPC(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CPC";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[1];
        byte dataByte = CommandBytes[0];
        byte highRBit = (byte)((opCodeByte >> 1) & 0x1);
        byte highDBit = (byte)(opCodeByte & 0x1);
        byte dLow = (byte)((dataByte >> 4) & 0x0F);
        byte rLow = (byte)(dataByte & 0x0F);
        byte rdIndex = (byte)((highDBit << 4) | dLow);
        byte rrIndex = (byte)((highRBit << 4) | rLow);
        byte rdValue = program.DataSpace[rdIndex];
        byte rrValue = program.DataSpace[rrIndex];
        const int SREG_ADDR = 0x3F;
        byte sreg = program.DataSpace[SREG_ADDR];
        bool prevZ = ((sreg >> 1) & 0x1) != 0;
        bool carryIn = (sreg & 0x1) != 0;
        int borrowIn = carryIn ? 1 : 0;
        int resultInt = rdValue - rrValue - borrowIn;
        byte result = (byte)resultInt;
        static byte SetBit(byte value, int bit, bool set) { int mask = 1 << bit; return set ? (byte)(value | mask) : (byte)(value & ~mask); }
        bool H = ((rdValue & 0x0F) < (((rrValue & 0x0F) + borrowIn) & 0x0F));
        bool C = (rdValue < (rrValue + borrowIn));
        bool V = ((((rdValue & ~rrValue & ~result) | (~rdValue & rrValue & result)) & 0x80) != 0);
        bool N = (result & 0x80) != 0;
        bool Z = (result == 0) && prevZ;
        bool S = N ^ V;
        sreg = SetBit(sreg, 5, H); sreg = SetBit(sreg, 4, S); sreg = SetBit(sreg, 3, V); sreg = SetBit(sreg, 2, N); sreg = SetBit(sreg, 1, Z); sreg = SetBit(sreg, 0, C);
        program.DataSpace[SREG_ADDR] = sreg;
        Console.WriteLine($"CPC R{rdIndex}, R{rrIndex}");
        program.PC++;
    }
}

public class CPI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CPI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highK = (byte)(opCodeByte & 0x0F);
        byte lowK  = (byte)(dataByte & 0x0F);
        byte dLow  = (byte)((dataByte >> 4) & 0x0F);
        byte rdIndex = (byte)(dLow + 16);
        byte K = (byte)((highK << 4) | lowK);
        byte rdValue = program.DataSpace[rdIndex];
        int diff = rdValue - K; byte result = (byte)diff;
        const int SREG_ADDR = 0x3F;
        byte sreg = program.DataSpace[SREG_ADDR];
        static byte SetBit(byte value, int bit, bool set) { int mask = 1 << bit; return set ? (byte)(value | mask) : (byte)(value & ~mask); }
        bool H = (((~rdValue & K) | (K & result) | (~rdValue & result)) & 0x08) != 0;
        bool V = (((rdValue & ~K & ~result) | (~rdValue & K & result)) & 0x80) != 0;
        bool N = (result & 0x80) != 0;
        bool Z = result == 0;
        bool C = (((~rdValue & K) | (K & result) | (~rdValue & result)) & 0x80) != 0;
        bool S = N ^ V;
        sreg = SetBit(sreg, 5, H); sreg = SetBit(sreg, 4, S); sreg = SetBit(sreg, 3, V); sreg = SetBit(sreg, 2, N); sreg = SetBit(sreg, 1, Z); sreg = SetBit(sreg, 0, C);
        program.DataSpace[SREG_ADDR + 31] = sreg;
        Console.WriteLine($"CPI R{rdIndex}, 0x{K:X2}");
        program.PC++;
    }
}

public class DEC(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "DEC";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (dataByte & 0xF) == 0xA;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highDBit = (byte)(opCodeByte & 0x1);
        byte dLow = (byte)((dataByte >> 4) & 0xF);
        byte rdIndex = (byte)((highDBit << 4) | dLow);
        byte value = program.DataSpace[rdIndex];
        program.DataSpace[rdIndex] = (byte)(value - 1);
        Console.WriteLine($"DEC R{rdIndex}");
        program.PC++;
    }
}

public class EOR(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "EOR";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highR = (byte)((opCodeByte >> 1) & 1);
        byte highD = (byte)(opCodeByte & 1);
        byte remainingD = (byte)(dataByte >> 4);
        byte remainingR = (byte)(dataByte & 0b1111);
        byte rRegAddress = (byte)((highR << 4) | remainingR);
        byte dRegAddress = (byte)((highD << 4) | remainingD);
        program.DataSpace[dRegAddress] = (byte)(program.DataSpace[dRegAddress] ^ program.DataSpace[rRegAddress]);
        program.PC++;
        Console.WriteLine($"EOR R{dRegAddress}, R{rRegAddress}");
    }
}

public class IN(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "IN";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => ((opCodeByte >> 3) & 0b1) == 0;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte twoHighAABytes = (byte)((opCodeByte >> 1) & 0b11);
        byte highDByte = (byte)(opCodeByte & 1);
        byte IOAddress = (byte)((twoHighAABytes << 4) | (dataByte & 0b1111));
        byte registerAddress = (byte)((highDByte << 4) | (dataByte >> 4));
        program.DataSpace[registerAddress] = program.DataSpace[IOAddress];
        Console.WriteLine($"IN R{registerAddress}, {IOAddress}");
        program.PC++;
    }
}

public class JMP(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "JMP";
    public override int AdditionalBytesNeeded => 2;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (dataByte >> 1) == 0b110;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highByte = CommandBytes.Count > 2 ? CommandBytes[2] : (byte)0;
        byte lowByte = CommandBytes.Count > 3 ? CommandBytes[3] : (byte)0;
        int address = (byte)(opCodeByte & 1) << 22 | (byte)(dataByte >> 4) << 17 | (byte)(dataByte & 1) << 16 | (highByte << 8) | lowByte;
        program.PC = address;
        Console.WriteLine($"JMP 0x{address:X6}");
    }
}

public class LDI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "LDI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highKBytes = (byte)(opCodeByte & 0b1111);
        byte lowKBytes = (byte)(dataByte & 0b1111);
        byte dBytes = (byte)((dataByte >> 4) & 0b1111);
        dBytes += 16; // R16-R31
        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);
        program.DataSpace[dBytes] = kNumber;
        Console.WriteLine($"LDI R{dBytes}, 0x{kNumber:X2}");
        program.PC++;
    }
}

public class LDX(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "LDX";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, X, XPostInc, XPreDec }
    private Variant detectedVariant = Variant.None;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if (((opCodeByte >> 1) & 0b1) == 0)
        {
            if (lastNibble == 0xC) { detectedVariant = Variant.X; return true; }
            if (lastNibble == 0xD) { detectedVariant = Variant.XPostInc; return true; }
            if (lastNibble == 0xE) { detectedVariant = Variant.XPreDec; return true; }
        }
        detectedVariant = Variant.None;
        return false;
    }
    public override void RunCommand(MachineData program)
    {
        int x = (program.DataSpace[27] << 8) | program.DataSpace[26];
        byte highDByte = (byte)(CommandBytes[0] & 0b1);
        byte lowDBytes = (byte)(CommandBytes[1] >> 4);
        byte rdIndex = (byte)((highDByte << 4) | lowDBytes);
        switch (detectedVariant)
        {
            case Variant.X:
                program.DataSpace[rdIndex] = program.DataSpace[x];
                Console.WriteLine($"LD R{rdIndex}, X");
                break;
            case Variant.XPostInc:
                program.DataSpace[rdIndex] = program.DataSpace[x];
                x++;
                program.DataSpace[27] = (byte)(x >> 8);
                program.DataSpace[26] = (byte)(x & 0xFF);
                Console.WriteLine($"LD R{rdIndex}, X+");
                break;
            case Variant.XPreDec:
                x--;
                program.DataSpace[27] = (byte)(x >> 8);
                program.DataSpace[26] = (byte)(x & 0xFF);
                program.DataSpace[rdIndex] = program.DataSpace[x];
                Console.WriteLine($"LD R{rdIndex}, -X");
                break;
        }
        program.PC++;
    }
}

public class LDY(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "LDY";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, Y, YPostInc, YPreDec }
    private Variant detectedVariant = Variant.None;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if ((opCodeByte >> 1) == 0b1001000 || (opCodeByte >> 1) == 0b1000000)
        {
            if (lastNibble == 0x8) { detectedVariant = Variant.Y; return true; }
            if (lastNibble == 0x9) { detectedVariant = Variant.YPostInc; return true; }
            if (lastNibble == 0xA) { detectedVariant = Variant.YPreDec; return true; }
        }
        detectedVariant = Variant.None;
        return false;
    }
    public override void RunCommand(MachineData program)
    {
        int y = (program.DataSpace[29] << 8) | program.DataSpace[28];
        byte highDByte = (byte)(CommandBytes[0] & 0b1);
        byte lowDBytes = (byte)(CommandBytes[1] >> 4);
        byte rdIndex = (byte)((highDByte << 4) | lowDBytes);
        switch (detectedVariant)
        {
            case Variant.Y:
                program.DataSpace[rdIndex] = program.DataSpace[y];
                Console.WriteLine($"LD R{rdIndex}, Y");
                break;
            case Variant.YPostInc:
                program.DataSpace[rdIndex] = program.DataSpace[y];
                y++;
                program.DataSpace[29] = (byte)(y >> 8);
                program.DataSpace[28] = (byte)(y & 0xFF);
                Console.WriteLine($"LD R{rdIndex}, Y+");
                break;
            case Variant.YPreDec:
                y--;
                program.DataSpace[29] = (byte)(y >> 8);
                program.DataSpace[28] = (byte)(y & 0xFF);
                program.DataSpace[rdIndex] = program.DataSpace[y];
                Console.WriteLine($"LD R{rdIndex}, -Y");
                break;
        }
        program.PC++;
    }
}

public class LDZ(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "LDZ";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, Z, ZPostInc, ZPreDec }
    private Variant detectedVariant = Variant.None;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if ((opCodeByte >> 1) == 0b1001000 || (opCodeByte >> 1) == 0b1000000)
        {
            if (lastNibble == 0x0) { detectedVariant = Variant.Z; return true; }
            if (lastNibble == 0x1) { detectedVariant = Variant.ZPostInc; return true; }
            if (lastNibble == 0x2) { detectedVariant = Variant.ZPreDec; return true; }
        }
        detectedVariant = Variant.None;
        return false;
    }
    public override void RunCommand(MachineData program)
    {
        int z = (program.DataSpace[31] << 8) | program.DataSpace[30];
        byte highDByte = (byte)(CommandBytes[0] & 0b1);
        byte lowDBytes = (byte)(CommandBytes[1] >> 4);
        byte rdIndex = (byte)((highDByte << 4) | lowDBytes);
        switch (detectedVariant)
        {
            case Variant.Z:
                program.DataSpace[rdIndex] = program.DataSpace[z];
                Console.WriteLine($"LD R{rdIndex}, Z");
                break;
            case Variant.ZPostInc:
                program.DataSpace[rdIndex] = program.DataSpace[z];
                z++;
                program.DataSpace[31] = (byte)(z >> 8);
                program.DataSpace[30] = (byte)(z & 0xFF);
                Console.WriteLine($"LD R{rdIndex}, Z+");
                break;
            case Variant.ZPreDec:
                z--;
                program.DataSpace[31] = (byte)(z >> 8);
                program.DataSpace[30] = (byte)(z & 0xFF);
                program.DataSpace[rdIndex] = program.DataSpace[z];
                Console.WriteLine($"LD R{rdIndex}, -Z");
                break;
        }
        program.PC++;
    }
}

public class ORI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "ORI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highK = (byte)(opCodeByte & 0x0F);
        byte lowK = (byte)(dataByte & 0x0F);
        byte dLow = (byte)((dataByte >> 4) & 0x0F);
        byte rdIndex = (byte)(dLow + 16);
        byte K = (byte)((highK << 4) | lowK);
        program.DataSpace[rdIndex] = (byte)(program.DataSpace[rdIndex] | K);
        Console.WriteLine($"ORI R{rdIndex}, 0x{K:X2}");
        program.PC++;
    }
}

public class OUT(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "OUT";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => ((opCodeByte >> 3) & 0b1) == 1;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte twoHighAABytes = (byte)((opCodeByte >> 1) & 0b11);
        byte highRByte = (byte)(opCodeByte & 1);
        byte IOAddress = (byte)((twoHighAABytes << 4) | (dataByte & 0b1111));
        byte registerAddress = (byte)((highRByte << 4) | (dataByte >> 4));
        program.DataSpace[IOAddress + 31] = program.DataSpace[registerAddress];
        Console.WriteLine($"OUT {IOAddress}, R{registerAddress}");
        program.PC++;
    }
}

public class PUSH(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "PUSH";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (dataByte & 0b1111) == 0b1111;
    public override void RunCommand(MachineData program)
    {
        byte highRByte = (byte)(CommandBytes[0] & 0b1);
        byte lowRBytes = (byte)(CommandBytes[1] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);
        byte value = program.DataSpace[registerAddress];
        program.PushByte(value);
        Console.WriteLine($"PUSH R{registerAddress}");
        program.PC++;
    }
}

public class RET(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "RET";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => ((dataByte & 0xFF) == 0x95 && ((opCodeByte >> 4) & 0xF) == 0x08) || true;
    public override void RunCommand(MachineData program)
    {
        int returnAddress = program.PopInt32();
        program.PC = returnAddress;
        Console.WriteLine("RET");
    }
}

public class RETI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "RETI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => opCodeByte == 0x95 && dataByte == 0x18;
    public override void RunCommand(MachineData program)
    {
        int returnAddress = program.PopInt32();
        program.StatusRegister.SetBit(7, true);
        program.PC = returnAddress;
        Console.WriteLine("RETI");
    }
}

public class RJMP(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "RJMP";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        int kNumber = ((opCodeByte & 0x0F) << 8) | dataByte;
        ThreeNibble threeNibble = kNumber;
        program.PC += 1 + threeNibble;
        Console.WriteLine($"RJMP {threeNibble}");
    }
}

public class SBI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "SBI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => opCodeByte == 0x9A;
    public override void RunCommand(MachineData program)
    {
        byte dataByte = CommandBytes[1];
        byte ioAddress = (byte)((dataByte >> 3) & 0x1F);
        byte bitIndex  = (byte)(dataByte & 0x07);
        int ioMemIndex = ioAddress + 31;
        byte mask = (byte)(1 << bitIndex);
        program.DataSpace[ioMemIndex] = (byte)(program.DataSpace[ioMemIndex] | mask);
        Console.WriteLine($"SBI {ioAddress}, {bitIndex}");
        program.PC++;
    }
}

public class SEI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "SEI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => opCodeByte == 0x94 && dataByte == 0x78;
    public override void RunCommand(MachineData program)
    {
        program.StatusRegister.SetBit(7, true);
        Console.WriteLine("SEI");
        program.PC++;
    }
}

public class STX(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "STX";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, X, XPostInc, XPreDec }
    private Variant detectedVariant = Variant.None;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if (((opCodeByte >> 1) & 0b1) == 1)
        {
            if (lastNibble == 0xC) { detectedVariant = Variant.X; return true; }
            if (lastNibble == 0xD) { detectedVariant = Variant.XPostInc; return true; }
            if (lastNibble == 0xE) { detectedVariant = Variant.XPreDec; return true; }
        }
        detectedVariant = Variant.None;
        return false;
    }
    public override void RunCommand(MachineData program)
    {
        int x = (program.DataSpace[27] << 8) | program.DataSpace[26];
        byte highRByte = (byte)(CommandBytes[0] & 0b1);
        byte lowRBytes = (byte)(CommandBytes[1] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);
        switch (detectedVariant)
        {
            case Variant.X:
                program.DataSpace[x] = program.DataSpace[registerAddress];
                Console.WriteLine($"ST X, R{registerAddress}");
                break;
            case Variant.XPostInc:
                program.DataSpace[x] = program.DataSpace[registerAddress];
                x++;
                program.DataSpace[27] = (byte)(x >> 8);
                program.DataSpace[26] = (byte)(x & 0xFF);
                Console.WriteLine($"ST X+, R{registerAddress}");
                break;
            case Variant.XPreDec:
                x--;
                program.DataSpace[27] = (byte)(x >> 8);
                program.DataSpace[26] = (byte)(x & 0xFF);
                program.DataSpace[x] = program.DataSpace[registerAddress];
                Console.WriteLine($"ST -X, R{registerAddress}");
                break;
        }
        program.PC++;
    }
}

public class STY(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "STY";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, Y, YPostInc, YPreDec }
    private Variant detectedVariant = Variant.None;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if ((opCodeByte >> 1) == 0b1001001 || (opCodeByte >> 1) == 0b1000001)
        {
            if (lastNibble == 0x8) { detectedVariant = Variant.Y; return true; }
            if (lastNibble == 0x9) { detectedVariant = Variant.YPostInc; return true; }
            if (lastNibble == 0xA) { detectedVariant = Variant.YPreDec; return true; }
        }
        detectedVariant = Variant.None;
        return false;
    }
    public override void RunCommand(MachineData program)
    {
        int y = (program.DataSpace[29] << 8) | program.DataSpace[28];
        byte highRByte = (byte)(CommandBytes[0] & 0b1);
        byte lowRBytes = (byte)(CommandBytes[1] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);
        switch (detectedVariant)
        {
            case Variant.Y:
                program.DataSpace[y] = program.DataSpace[registerAddress];
                Console.WriteLine($"ST Y, R{registerAddress}");
                break;
            case Variant.YPostInc:
                program.DataSpace[y] = program.DataSpace[registerAddress];
                y++;
                program.DataSpace[29] = (byte)(y >> 8);
                program.DataSpace[28] = (byte)(y & 0xFF);
                Console.WriteLine($"ST Y+, R{registerAddress}");
                break;
            case Variant.YPreDec:
                y--;
                program.DataSpace[29] = (byte)(y >> 8);
                program.DataSpace[28] = (byte)(y & 0xFF);
                program.DataSpace[y] = program.DataSpace[registerAddress];
                Console.WriteLine($"ST -Y, R{registerAddress}");
                break;
        }
        program.PC++;
    }
}

public class STZ(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "STZ";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, Z, ZPostInc, ZPreDec }
    private Variant detectedVariant = Variant.None;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if ((opCodeByte >> 1) == 0b1001001 || (opCodeByte >> 1) == 0b1000001)
        {
            if (lastNibble == 0x0) { detectedVariant = Variant.Z; return true; }
            if (lastNibble == 0x1) { detectedVariant = Variant.ZPostInc; return true; }
            if (lastNibble == 0x2) { detectedVariant = Variant.ZPreDec; return true; }
        }
        detectedVariant = Variant.None;
        return false;
    }
    public override void RunCommand(MachineData program)
    {
        int z = (program.DataSpace[31] << 8) | program.DataSpace[30];
        byte highRByte = (byte)(CommandBytes[0] & 0b1);
        byte lowRBytes = (byte)(CommandBytes[1] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);
        switch (detectedVariant)
        {
            case Variant.Z:
                program.DataSpace[z] = program.DataSpace[registerAddress];
                Console.WriteLine($"ST Z, R{registerAddress}");
                break;
            case Variant.ZPostInc:
                program.DataSpace[z] = program.DataSpace[registerAddress];
                z++;
                program.DataSpace[31] = (byte)(z >> 8);
                program.DataSpace[30] = (byte)(z & 0xFF);
                Console.WriteLine($"ST Z+, R{registerAddress}");
                break;
            case Variant.ZPreDec:
                z--;
                program.DataSpace[31] = (byte)(z >> 8);
                program.DataSpace[30] = (byte)(z & 0xFF);
                program.DataSpace[z] = program.DataSpace[registerAddress];
                Console.WriteLine($"ST -Z, R{registerAddress}");
                break;
        }
        program.PC++;
    }
}

public class SUBI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "SUBI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highKBytes = (byte)(opCodeByte & 0b1111);
        byte lowKBytes = (byte)(dataByte & 0b1111);
        byte dBytes = (byte)((dataByte >> 4) & 0b1111);
        dBytes += 16;
        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);
        byte result = (byte)(program.DataSpace[dBytes] - kNumber);
        program.DataSpace[dBytes] = result;
        program.PC++;
        Console.WriteLine($"SUBI R{dBytes}, 0x{kNumber:X2}");
    }
}

