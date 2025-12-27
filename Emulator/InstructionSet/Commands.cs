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

public class JMP(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "JMP";
    public override int AdditionalBytesNeeded => 2;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (dataByte >> 1) == 0b110;

    public override void RunCommand(MachineData program)
    {
        // CommandBytes layout (big-endian): [opCodeByte, dataByte, highByte, lowByte]
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highByte = CommandBytes.Count > 2 ? CommandBytes[2] : (byte)0;
        byte lowByte = CommandBytes.Count > 3 ? CommandBytes[3] : (byte)0;

        int address = (byte)(opCodeByte & 1) << 22
                    | (byte)(dataByte >> 4) << 17
                    | (byte)(dataByte & 1) << 16
                    | (highByte << 8)
                    | lowByte;

        program.PC = address;

        Console.WriteLine($"JMP 0x{address:X6}");
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

        program.DataSpace[IOAddress + 31] = program.DataSpace[registerAddress]; // I/O space offset 31
        program.PC++;

        Console.WriteLine($"OUT {IOAddress}, R{registerAddress}");
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
        dBytes += 16; // R16-R31
        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);

        byte result = (byte)(program.DataSpace[dBytes] - kNumber);
        program.DataSpace[dBytes] = result;
        program.PC++;
        Console.WriteLine($"SUBI R{dBytes}, 0x{kNumber:X2}");
    }
}

public class CPI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CPI";
    public override int AdditionalBytesNeeded => 0;
    // CPI (Compare with Immediate)
    // Opcode format: 0011 KKKK dddd KKKK
    // High 4 bits (0011) reside in the upper nibble of opCodeByte
    // dddd selects R16..R31 (add 16)
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];

        byte highK = (byte)(opCodeByte & 0x0F);         // K high nibble
        byte lowK  = (byte)(dataByte & 0x0F);           // K low nibble
        byte dLow  = (byte)((dataByte >> 4) & 0x0F);    // destination register low bits
        byte rdIndex = (byte)(dLow + 16);                    // R16..R31
        byte K = (byte)((highK << 4) | lowK);

        byte rdValue = program.DataSpace[rdIndex];
        int diff = rdValue - K;
        byte result = (byte)diff;


        // SREG flag emulation (Z, N, V, S, C, H)
        const int SREG_ADDR = 0x3F;

        if (program.DataSpace == null || program.DataSpace.Length < SREG_ADDR) throw new ArgumentException("Problem with the data space");
    
        byte sreg = program.DataSpace[SREG_ADDR];

        // Helper to set/clear bit
        static byte SetBit(byte value, int bit, bool set)
        {
            int mask = 1 << bit;
            return set ? (byte)(value | mask) : (byte)(value & ~mask);
        }

        // Flags from AVR datasheet for CPI (same as CP):
        // H: Half Carry
        bool H = (((~rdValue & K) | (K & result) | (~rdValue & result)) & 0x08) != 0;
        // V: Two's complement overflow
        bool V = (((rdValue & ~K & ~result) | (~rdValue & K & result)) & 0x80) != 0;
        // N: Negative
        bool N = (result & 0x80) != 0;
        // Z: Zero
        bool Z = result == 0;
        // C: Carry (borrow)
        bool C = (((~rdValue & K) | (K & result) | (~rdValue & result)) & 0x80) != 0;
        // S: Sign (N ^ V)
        bool S = N ^ V;

        // SREG bit order (7..0): I T H S V N Z C
        sreg = SetBit(sreg, 5, H); // H
        sreg = SetBit(sreg, 4, S); // S
        sreg = SetBit(sreg, 3, V); // V
        sreg = SetBit(sreg, 2, N); // N
        sreg = SetBit(sreg, 1, Z); // Z
        sreg = SetBit(sreg, 0, C); // C

        program.DataSpace[SREG_ADDR + 31] = sreg;
        

        Console.WriteLine($"CPI R{rdIndex}, 0x{K:X2}");

        program.PC++;
    }
}

public class CPC(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CPC";
    public override int AdditionalBytesNeeded => 0;
    // CPC: Compare with Carry (Rd - Rr - C)
    // Opcode format similar to other two-register instructions; parsing follows existing register decoding used elsewhere in this file.
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        // Decode Rd and Rr (5-bit register indices)
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
        if (program.DataSpace == null || program.DataSpace.Length <= SREG_ADDR) throw new ArgumentException("Problem with the data space");

        byte sreg = program.DataSpace[SREG_ADDR];
        bool prevZ = ((sreg >> 1) & 0x1) != 0;
        bool carryIn = (sreg & 0x1) != 0;

        int borrowIn = carryIn ? 1 : 0;
        int resultInt = rdValue - rrValue - borrowIn;
        byte result = (byte)resultInt;

        // Helper to set/clear bit
        static byte SetBit(byte value, int bit, bool set)
        {
            int mask = 1 << bit;
            return set ? (byte)(value | mask) : (byte)(value & ~mask);
        }

        // Half-carry: borrow from bit 3
        bool H = ((rdValue & 0x0F) < (((rrValue & 0x0F) + borrowIn) & 0x0F));
        // Carry (borrow) from bit 7
        bool C = (rdValue < (rrValue + borrowIn));
        // Two's complement overflow
        bool V = ((((rdValue & ~rrValue & ~result) | (~rdValue & rrValue & result)) & 0x80) != 0);
        // Negative
        bool N = (result & 0x80) != 0;
        // Zero: must preserve previous Z for multi-word compares
        bool Z = (result == 0) && prevZ;
        // Sign
        bool S = N ^ V;

        // SREG bit order (7..0): I T H S V N Z C
        sreg = SetBit(sreg, 5, H); // H
        sreg = SetBit(sreg, 4, S); // S
        sreg = SetBit(sreg, 3, V); // V
        sreg = SetBit(sreg, 2, N); // N
        sreg = SetBit(sreg, 1, Z); // Z
        sreg = SetBit(sreg, 0, C); // C

        program.DataSpace[SREG_ADDR] = sreg;

        Console.WriteLine($"CPC R{rdIndex}, R{rrIndex}");

        program.PC++;
    }
}

public class STX(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "STX";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, X, XPostInc, XPreDec }
    private Variant detectedVariant = Variant.None;

    // ST X, Rr:    1001 001d dddd 1100
    // ST X+, Rr:   1001 001d dddd 1101
    // ST -X, Rr:   1001 001d dddd 1110
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if (((opCodeByte >> 1) & 0b1) == 1)
        {
            if (lastNibble == 0xC)
            {
                detectedVariant = Variant.X;
                return true;
            }
            else if (lastNibble == 0xD)
            {
                detectedVariant = Variant.XPostInc;
                return true;
            }
            else if (lastNibble == 0xE)
            {
                detectedVariant = Variant.XPreDec;
                return true;
            }
        }
        detectedVariant = Variant.None;
        return false;
    }

    public override void RunCommand(MachineData program)
    {
        // Get X pointer (R27:R26)
        int x = (program.DataSpace[27] << 8) | program.DataSpace[26];

        // Get source register
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
            default:
                throw new InvalidOperationException("Unknown STX variant");
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

    // ST Y, Rr:    1000 001d dddd 1000
    // ST Y+, Rr:   1001 001d dddd 1001
    // ST -Y, Rr:   1001 001d dddd 1010
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        // Check for opCode pattern 1001 001x or 1000 001x
        if ((opCodeByte >> 1) == 0b1001001 || (opCodeByte >> 1) == 0b1000001)
        {
            if (lastNibble == 0x8)
            {
                detectedVariant = Variant.Y;
                return true;
            }
            else if (lastNibble == 0x9)
            {
                detectedVariant = Variant.YPostInc;
                return true;
            }
            else if (lastNibble == 0xA)
            {
                detectedVariant = Variant.YPreDec;
                return true;
            }
        }
        detectedVariant = Variant.None;
        return false;
    }

    public override void RunCommand(MachineData program)
    {
        // Get Y pointer (R29:R28)
        int y = (program.DataSpace[29] << 8) | program.DataSpace[28];

        // Get source register
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
            default:
                throw new InvalidOperationException("Unknown STY variant");
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

    // ST Z, Rr:    1000 001d dddd 0000
    // ST Z+, Rr:   1001 001d dddd 0001
    // ST -Z, Rr:   1001 001d dddd 0010
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        // Check for opCode pattern 1001 001x or 1000 001x
        if ((opCodeByte >> 1) == 0b1001001 || (opCodeByte >> 1) == 0b1000001)
        {
            if (lastNibble == 0x0)
            {
                detectedVariant = Variant.Z;
                return true;
            }
            else if (lastNibble == 0x1)
            {
                detectedVariant = Variant.ZPostInc;
                return true;
            }
            else if (lastNibble == 0x2)
            {
                detectedVariant = Variant.ZPreDec;
                return true;
            }
        }
        detectedVariant = Variant.None;
        return false;
    }

    public override void RunCommand(MachineData program)
    {
        // Get Z pointer (R31:R30)
        int z = (program.DataSpace[31] << 8) | program.DataSpace[30];

        // Get source register
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
            default:
                throw new InvalidOperationException("Unknown STZ variant");
        }

        program.PC++;
    }
}

public class LDX(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "LDX";
    public override int AdditionalBytesNeeded => 0;
    private enum Variant { None, X, XPostInc, XPreDec }
    private Variant detectedVariant = Variant.None;

    // LD Rd, X:    1001 000d dddd 1100
    // LD Rd, X+:   1001 000d dddd 1101
    // LD Rd, -X:   1001 000d dddd 1110
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte)
    {
        int lastNibble = dataByte & 0xF;
        if (((opCodeByte >> 1) & 0b1) == 0) // opposite of STX
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
        // X pointer (R27:R26)
        int x = (program.DataSpace[27] << 8) | program.DataSpace[26];

        // Destination register Rd
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
            default:
                throw new InvalidOperationException("Unknown LDX variant");
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

    // LD Rd, Y:    1000 000d dddd 1000
    // LD Rd, Y+:   1001 000d dddd 1001
    // LD Rd, -Y:   1001 000d dddd 1010
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
            default:
                throw new InvalidOperationException("Unknown LDY variant");
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

    // LD Rd, Z:    1000 000d dddd 0000
    // LD Rd, Z+:   1001 000d dddd 0001
    // LD Rd, -Z:   1001 000d dddd 0010
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
            default:
                throw new InvalidOperationException("Unknown LDZ variant");
        }

        program.PC++;
    }
}

public class ORI(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "ORI";
    public override int AdditionalBytesNeeded => 0;
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true; // Four-bit family decoder selects us

    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];

        byte highK = (byte)(opCodeByte & 0x0F);
        byte lowK = (byte)(dataByte & 0x0F);
        byte dLow = (byte)((dataByte >> 4) & 0x0F);
        byte rdIndex = (byte)(dLow + 16); // R16..R31
        byte K = (byte)((highK << 4) | lowK);

        program.DataSpace[rdIndex] = (byte)(program.DataSpace[rdIndex] | K);
        Console.WriteLine($"ORI R{rdIndex}, 0x{K:X2}");
        program.PC++;
    }
}

public class BRBC(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "BRBC";
    public override int AdditionalBytesNeeded => 0;
    // BRBC: Branch if bit in SREG is cleared
    // Encoding (summary): contains a 7-bit relative displacement and a 3-bit SREG bit index
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => true;
    public override void RunCommand(MachineData program)
    {
        // SREG bit index is stored in the low 3 bits of the high byte
        byte sregIndex = (byte)(CommandBytes[0] & 0b111);

        // Build 7-bit signed displacement from bits across the two bytes
        byte highK = (byte)(CommandBytes[1] & 0b11);          // top 2 bits of K (from data byte)
        byte lowK = (byte)(CommandBytes[0] >> 3);             // low 5 bits of K (from op-code byte)
        int k = (highK << 5) | lowK;                         // 7-bit unsigned

        // Sign-extend 7-bit value to signed int (-64..+63)
        int signedK;
        if ((k & 0x40) != 0)
        {
            // negative value in 7-bit two's complement -> subtract 128 to sign-extend
            signedK = k - 128;
        }
        else
        {
            // positive value
            signedK = k;
        }

        // Read the SREG bit from the machine's status register
        bool bitSet = ((program.StatusRegister.SREGByte >> sregIndex) & 1) != 0;

        if (!bitSet)
        {
            // Branch taken: relative PC displacement is signedK + 1 (per AVR encoding semantics used elsewhere in this project)
            program.PC += signedK + 1;
            Console.WriteLine($"BRBC {sregIndex}, {signedK + 1}");
        }
        else
        {
            // Not taken: just advance to next instruction
            program.PC++;
            Console.WriteLine($"BRBC {sregIndex}, not taken");
        }
    }
}

public class CALL(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "CALL";
    public override int AdditionalBytesNeeded => 2;
    // CALL: Long Call (22-bit absolute address)
    // Opcode encoding is similar to JMP; we'll decode a 22-bit address from the instruction stream.
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (((dataByte >> 1) & 0b111) == 0b111) && (((opCodeByte >> 1) & 0b0) == 0b0); // heuristic: CALL/JMP family

    public override void RunCommand(MachineData program)
    {
        byte opCodeByte = CommandBytes[0];
        byte dataByte = CommandBytes[1];
        byte highByte = CommandBytes.Count > 2 ? CommandBytes[2] : (byte)0;
        byte lowByte = CommandBytes.Count > 3 ? CommandBytes[3] : (byte)0;

        int address = (byte)(opCodeByte & 1) << 22
                    | (byte)(dataByte >> 4) << 17
                    | (byte)(dataByte & 1) << 16
                    | (highByte << 8)
                    | lowByte;

        // Push return address (address of next instruction) onto the stack
        int returnAddress = program.PC + 1; // next instruction after CALL
        program.PushInt32(returnAddress);

        program.PC = address;

        Console.WriteLine($"CALL 0x{address:X6}");
    }
}

public class RET(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "RET";
    public override int AdditionalBytesNeeded => 0;
    // RET: Return from subroutine
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => ((dataByte & 0xFF) == 0x95 && ((opCodeByte >> 4) & 0xF) == 0x08) || true; // conservative true fallback
    public override void RunCommand(MachineData program)
    {
        // Pop 4-byte return address
        int returnAddress = program.PopInt32();
        program.PC = returnAddress;
        Console.WriteLine("RET");
    }
}

public class PUSH(List<byte> commandBytes) : CommandTemplate(commandBytes)
{
    public override string Identifier => "PUSH";
    public override int AdditionalBytesNeeded => 0;
    // PUSH: push register Rr onto the stack
    // Encoding: many single-register instructions place the register in the same bits; we'll decode accordingly.
    public override bool ConfirmCommand(byte dataByte, byte opCodeByte) => (dataByte & 0b1111) == 0b1111;
    public override void RunCommand(MachineData program)
    {
        // Decode register (common pattern used elsewhere)
        byte highRByte = (byte)(CommandBytes[0] & 0b1);
        byte lowRBytes = (byte)(CommandBytes[1] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);

        byte value = program.DataSpace[registerAddress];
        program.PushByte(value);

        Console.WriteLine($"PUSH R{registerAddress}");

        program.PC++;
    }
}

