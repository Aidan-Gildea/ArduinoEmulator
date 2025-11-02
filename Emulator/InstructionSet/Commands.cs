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
    // Simple stack pointer for CALL/RET (points to next free byte)
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
    public abstract bool ConfirmCommand(byte[] commandBytes);
    public abstract void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex);
}

public class JMP() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => (commandBytes[0] >> 1) == 0b110;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        ushort lastByte = fileSpan.Slice2Char();
        ushort nextByte = fileSpan.Slice2Char();

        int address = (byte)(commandBytes[1] & 1) << 22 | (byte)(commandBytes[0] >> 4) << 17 | (byte)(commandBytes[0] & 1) << 16 | (byte)(nextByte) << 8 | (byte)lastByte;
        commandIndex += 2;

        program.PC = address;

        Console.WriteLine($"JMP to {address}");
    }
}

public class EOR() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highR = (byte)((commandBytes[1] >> 1) & 1);
        byte highD = (byte)(commandBytes[1] & 1);

        byte remainingD = (byte)(commandBytes[0] >> 4);
        byte remainingR = (byte)(commandBytes[0] & 0b1111);

        byte rRegAddress = (byte)((highR << 5) | remainingR);
        byte dRegAddress = (byte)((highD << 5) | remainingD);

        program.DataSpace[dRegAddress] = (byte)(program.DataSpace[dRegAddress] ^ program.DataSpace[rRegAddress]);

        program.PC++;

        Console.WriteLine($"R{dRegAddress} is now {program.DataSpace[dRegAddress]} ");
    }
}

public class OUT() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => ((commandBytes[1] >> 3) & 0b1) == 1;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte twoHighAABytes = (byte)((commandBytes[1] >> 1) & 0b11);
        byte highRByte = (byte)(commandBytes[1] & 1);

        byte IOAddress = (byte)((twoHighAABytes << 4) | commandBytes[0] & 0b1111);
        byte registerAddress = (byte)((highRByte << 4) | (commandBytes[0] >> 4));

        program.DataSpace[IOAddress + 31] = program.DataSpace[registerAddress]; // Adding 31 bc that is the last index for GP registers
        program.PC++;

        Console.WriteLine($"OUT IO Space at {IOAddress} is now {program.DataSpace[registerAddress]}");
    }
}

public class LDI() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte lowKBytes = (byte)(commandBytes[0] & 0b1111);

        byte dBytes = (byte)((commandBytes[0] >> 4) & 0b1111); 
        dBytes += 16; // AVR instruction set uses R16-R31 for this command

        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);
        program.DataSpace[dBytes] = kNumber;

        Console.WriteLine($"LDI R{dBytes} = {kNumber}");

        program.PC++;
    }
}

public class IN() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => ((commandBytes[1] >> 3) & 0b1) == 0;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte twoHighAABytes = (byte)((commandBytes[1] >> 1) & 0b11);
        byte highDByte = (byte)(commandBytes[1] & 1);

        byte IOAddress = (byte)((twoHighAABytes << 4) | commandBytes[0] & 0b1111);
        byte registerAddress = (byte)((highDByte << 4) | (commandBytes[0] >> 4));

        program.DataSpace[registerAddress] = program.DataSpace[IOAddress];

        Console.WriteLine($"IN R{registerAddress} at IO Space {IOAddress}");
        program.PC++;
    }
}

public class RJMP() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte remainingKBytes = (byte)(commandBytes[0]);

        int kNumber = highKBytes << 8 | remainingKBytes;
        ThreeNibble threeNibble = kNumber;

        program.PC += 1 + threeNibble;

        Console.WriteLine($"RJMP to {threeNibble}");
    }
}

public class SUBI() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highKBytes = (byte)(commandBytes[1] & 0b1111);
        byte lowKBytes = (byte)(commandBytes[0] & 0b1111);
        byte dBytes = (byte)((commandBytes[0] >> 4) & 0b1111);
        dBytes += 16; // AVR instruction set uses R16-R31 for this command
        byte kNumber = (byte)((highKBytes << 4) | lowKBytes);

        byte result = (byte)(program.DataSpace[dBytes] - kNumber);
        program.DataSpace[dBytes] = result;
        program.PC++;
        Console.WriteLine($"SUBI R{dBytes} = {result} (was {program.DataSpace[dBytes] + kNumber}, sub {kNumber})");
    }
}

public class CPI() : CommandTemplate
{
    // CPI (Compare with Immediate)
    // Opcode format: 0011 KKKK dddd KKKK
    // High 4 bits (0011) reside in the upper nibble of commandBytes[1]
    // dddd selects R16..R31 (add 16)
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highK = (byte)(commandBytes[1] & 0x0F);         // K high nibble
        byte lowK  = (byte)(commandBytes[0] & 0x0F);         // K low nibble
        byte dLow  = (byte)((commandBytes[0] >> 4) & 0x0F);  // destination register low bits
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
        

        Console.WriteLine($"CPI R{rdIndex}, 0x{K:X2} (R{rdIndex}=0x{rdValue:X2}, result=0x{result:X2})");

        program.PC++;
    }
}

public class CPC() : CommandTemplate
{
    // CPC: Compare with Carry (Rd - Rr - C)
    // Opcode format similar to other two-register instructions; parsing follows existing register decoding used elsewhere in this file.
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // Decode Rd and Rr (5-bit register indices)
        byte highRBit = (byte)((commandBytes[1] >> 1) & 0x1);
        byte highDBit = (byte)(commandBytes[1] & 0x1);
        byte dLow = (byte)((commandBytes[0] >> 4) & 0x0F);
        byte rLow = (byte)(commandBytes[0] & 0x0F);

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

        Console.WriteLine($"CPC R{rdIndex} - R{rrIndex} - {(carryIn ? 1 : 0)} => result=0x{result:X2} (R{rdIndex}=0x{rdValue:X2}, R{rrIndex}=0x{rrValue:X2})");

        program.PC++;
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

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // Get X pointer (R27:R26)
        int x = (program.DataSpace[27] << 8) | program.DataSpace[26];

        // Get source register
        byte highRByte = (byte)(commandBytes[1] & 0b1);
        byte lowRBytes = (byte)(commandBytes[0] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);

        switch (detectedVariant)
        {
            case Variant.X:
                program.DataSpace[x] = program.DataSpace[registerAddress];
                break;
            case Variant.XPostInc:
                program.DataSpace[x] = program.DataSpace[registerAddress];
                x++;
                program.DataSpace[27] = (byte)(x >> 8);
                program.DataSpace[26] = (byte)(x & 0xFF);
                break;
            case Variant.XPreDec:
                x--;
                program.DataSpace[27] = (byte)(x >> 8);
                program.DataSpace[26] = (byte)(x & 0xFF);
                program.DataSpace[x] = program.DataSpace[registerAddress];
                break;
            default:
                throw new InvalidOperationException("Unknown STX variant");
        }

        Console.WriteLine($"STX put register {registerAddress} into dataspace {x}");

        program.PC++;
    }
}

public class BRBC() : CommandTemplate
{
    // BRBC: Branch if bit in SREG is cleared
    // Encoding (summary): contains a 7-bit relative displacement and a 3-bit SREG bit index
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // SREG bit index is stored in the low 3 bits of the high byte
        byte sregIndex = (byte)(commandBytes[1] & 0b111);

        // Build 7-bit signed displacement from bits across the two bytes
        byte highK = (byte)(commandBytes[0] & 0b11);          // top 2 bits of K
        byte lowK = (byte)(commandBytes[1] >> 3);             // low 5 bits of K
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
            Console.WriteLine($"BRBC bit {sregIndex} cleared -> branch {signedK + 1}");
        }
        else
        {
            // Not taken: just advance to next instruction
            program.PC++;
            Console.WriteLine($"BRBC bit {sregIndex} set -> no branch");
        }
    }
}

public class CALL() : CommandTemplate
{
    // CALL: Long Call (22-bit absolute address)
    // Opcode encoding is similar to JMP; we'll decode a 22-bit address from the instruction stream.
    public override bool ConfirmCommand(byte[] commandBytes) => (((commandBytes[0] >> 1) & 0b111) == 0b111) && (((commandBytes[1] >> 1) & 0b0) == 0b0); // heuristic: CALL/JMP family

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // Read the next two words from the source (each Slice2Char reads a 16-bit word as ushort)
        ushort lowWord = fileSpan.Slice2Char();
        ushort highWord = fileSpan.Slice2Char();
        commandIndex += 2;

        // Build 22-bit address: bits come from commandBytes and the two following words similar to JMP
        int address = (byte)(commandBytes[1] & 1) << 22 | (byte)(commandBytes[0] >> 4) << 17 | (byte)(commandBytes[0] & 1) << 16 | (highWord << 8) | (lowWord);

        // Push return address (address of next instruction) onto the stack
        int returnAddress = program.PC + 1; // next instruction after CALL
        program.PushInt32(returnAddress);

        program.PC = address;

        Console.WriteLine($"CALL to {address}, return addr {returnAddress}, SP={program.SP}");
    }
}

public class RET() : CommandTemplate
{
    // RET: Return from subroutine
    public override bool ConfirmCommand(byte[] commandBytes) => ((commandBytes[0] & 0xFF) == 0x95 && ((commandBytes[1] >> 4) & 0xF) == 0x08) || true; // conservative true fallback

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // Pop 4-byte return address
        int returnAddress = program.PopInt32();
        program.PC = returnAddress;
        Console.WriteLine($"RET to {returnAddress}, SP={program.SP}");
    }
}

public class PUSH() : CommandTemplate
{
    // PUSH: push register Rr onto the stack
    // Encoding: many single-register instructions place the register in the same bits; we'll decode accordingly.
    public override bool ConfirmCommand(byte[] commandBytes) => (commandBytes[0] & 0b1111) == 0b1111;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        // Decode register (common pattern used elsewhere)
        byte highRByte = (byte)(commandBytes[1] & 0b1);
        byte lowRBytes = (byte)(commandBytes[0] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);

        byte value = program.DataSpace[registerAddress];
        program.PushByte(value);

        Console.WriteLine($"PUSH R{registerAddress} = 0x{value:X2}, SP={program.SP}");

        program.PC++;
    }
}

