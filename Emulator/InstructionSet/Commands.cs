using System.Configuration.Assemblies;
using System.Data;
using System.Reflection.Metadata.Ecma335;
using Emulator;
using SharedDomainTypes;

public class ProgramData
{
    /// <summary>
    /// Sets SREG flags (Z, N, V, S, C, H) in ioSpace[0x3F] according to the result of a subtraction (for CP/CPI/SUBI/etc).
    /// </summary>
    public void SetSREGFlags(byte rdValue, byte K, byte result)
    {
        const int SREG_ADDR = 0x3F;
        if (ioSpace == null || ioSpace.Length <= SREG_ADDR) return;
        byte sreg = ioSpace[SREG_ADDR];

        // Helper to set/clear bit
        static byte SetBit(byte value, int bit, bool set)
        {
            int mask = 1 << bit;
            return set ? (byte)(value | mask) : (byte)(value & ~mask);
        }

        // Flags from AVR datasheet for CPI/CP/SUBI/SUB:
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

        ioSpace[SREG_ADDR] = sreg;
    }

    public int pc;
    public byte[] registers;
    public byte[] ioSpace;
    public byte[] dataSpace;

    public ProgramData()
    {
        pc = 0;
        registers = new byte[32];
        ioSpace = new byte[64];
        dataSpace = new byte[2000];
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

        Console.WriteLine($"JMP to {address}");
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

        Console.WriteLine($"R{dRegAddress} is now {program.registers[dRegAddress]} ");
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

        Console.WriteLine($"OUT IO Space at {IOAddress} is now {program.registers[registerAddress]}");
    }
}

public class LDI() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte lowKBytes = (byte)(commandBytes[0] & 0b1111);

        byte dBytes = (byte)((commandBytes[0] >> 4) & 0b1111); 
        dBytes += 16; // AVR instruction set uses R16-R31 for this command

        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);
        program.registers[dBytes] = kNumber;

        Console.WriteLine($"LDI R{dBytes} = {kNumber}");

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

        Console.WriteLine($"IN R{registerAddress} at IO Space {IOAddress}");
        program.pc++;
    }
}

public class RJMP() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte remainingKBytes = (byte)(commandBytes[0]);

        int kNumber = highKBytes << 8 | remainingKBytes;
        ThreeNibble threeNibble = kNumber;

        program.pc += 1 + threeNibble;

        Console.WriteLine($"RJMP to {threeNibble}");
    }
}

public class SUBI() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte lowKBytes = (byte)(commandBytes[0] & 0b1111);
        byte dBytes = (byte)((commandBytes[0] >> 4) & 0b1111);
        dBytes += 16; // AVR instruction set uses R16-R31 for this command
        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);

        byte result = (byte)(program.registers[dBytes] - kNumber);
        program.registers[dBytes] = result;
        program.pc++;
        Console.WriteLine($"SUBI R{dBytes} = {result} (was {program.registers[dBytes] + kNumber}, sub {kNumber})");
    }
}

public class CPI() : CommandTemplate
{
    // CPI (Compare with Immediate)
    // Opcode format: 0011 KKKK dddd KKKK
    // High 4 bits (0011) reside in the upper nibble of commandBytes[1]
    // dddd selects R16..R31 (add 16)
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highK = (byte)(commandBytes[1] & 0x0F);      // K high nibble
        byte lowK  = (byte)(commandBytes[0] & 0x0F);      // K low nibble
        byte dLow  = (byte)((commandBytes[0] >> 4) & 0x0F); // destination register low bits
        byte rdIndex = (byte)(dLow + 16);                 // R16..R31
        byte K = (byte)((highK << 4) | lowK);

        byte rdValue = program.registers[rdIndex];
        int diff = rdValue - K;
        byte result = (byte)diff;


        // SREG flag emulation (Z, N, V, S, C, H)
        const int SREG_ADDR = 0x3F;
        if (program.ioSpace != null && program.ioSpace.Length > SREG_ADDR)
        {
            byte sreg = program.ioSpace[SREG_ADDR];

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

            program.ioSpace[SREG_ADDR] = sreg;
        }

        Console.WriteLine($"CPI R{rdIndex}, 0x{K:X2} (R{rdIndex}=0x{rdValue:X2}, result=0x{result:X2})");

        program.pc++;
    }
}

public class STX() : CommandTemplate
{
    private enum Variant { None, X, XPostInc, XPreDec }
    private Variant detectedVariant = Variant.None;

    // ST X, Rr:    1001 001d dddd 1100
    // ST X+, Rr:   1001 001d dddd 1101
    // ST -X, Rr:   1001 001d dddd 1110
    public override bool ConfirmCommand(byte[] commandBytes)
    {
        int lastNibble = commandBytes[0] & 0xF;
        if (((commandBytes[1] >> 1) & 0b1) == 1)
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

    public override void RunCommand(ProgramData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // Get X pointer (R27:R26)
        int x = (program.registers[27] << 8) | program.registers[26];

        // Get source register
        byte highRByte = (byte)(commandBytes[1] & 0b1);
        byte lowRBytes = (byte)(commandBytes[0] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);

        switch (detectedVariant)
        {
            case Variant.X:
                program.dataSpace[x] = program.registers[registerAddress];
                break;
            case Variant.XPostInc:
                program.dataSpace[x] = program.registers[registerAddress];
                x++;
                program.registers[27] = (byte)(x >> 8);
                program.registers[26] = (byte)(x & 0xFF);
                break;
            case Variant.XPreDec:
                x--;
                program.registers[27] = (byte)(x >> 8);
                program.registers[26] = (byte)(x & 0xFF);
                program.dataSpace[x] = program.registers[registerAddress];
                break;
            default:
                throw new InvalidOperationException("Unknown STX variant");
        }

        Console.WriteLine($"STX put register {registerAddress} into dataspace {x}");

        program.pc++;
    }
}

