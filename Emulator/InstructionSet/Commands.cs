using System.Configuration.Assemblies;
using System.Data;
using System.IO.Compression;
using System.Reflection.Metadata.Ecma335;
using System.Security.Cryptography;
using Emulator;
using SharedDomainTypes;

public class MachineData
{
    public int PC;
    public byte[] Registers;
    public byte[] IOSpace;
    public byte[] DataSpace;

    public SREG StatusRegister = new SREG();

    public MachineData()
    {
        PC = 0;
        Registers = new byte[32];
        IOSpace = new byte[64];
        DataSpace = new byte[2000];
    }
}

public class SREG
{
    public byte SREGByte = 0;
    /*
        C: Carry                0
        Z: Zero                 1
        N: Negative             2
        V: Two's Complement     3
        S: Sign                 4
        H: Half Carry           5
        T: Transfer             6
        I: Global               7
    */

    public void SetBit(byte index, bool bit)
    {
        byte mask = (byte)(1 << index);

        if (bit) SREGByte |= mask;
        else SREGByte &= (byte)~mask;
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

        program.Registers[dRegAddress] = (byte)(program.Registers[dRegAddress] ^ program.Registers[rRegAddress]);

        program.PC++;

        Console.WriteLine($"R{dRegAddress} is now {program.Registers[dRegAddress]} ");
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

        program.IOSpace[IOAddress] = program.Registers[registerAddress];
        program.PC++;

        Console.WriteLine($"OUT IO Space at {IOAddress} is now {program.Registers[registerAddress]}");
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
        program.Registers[dBytes] = kNumber;

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

        program.Registers[registerAddress] = program.IOSpace[IOAddress];

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

        byte result = (byte)(program.Registers[dBytes] - kNumber);
        program.Registers[dBytes] = result;
        program.PC++;
        Console.WriteLine($"SUBI R{dBytes} = {result} (was {program.Registers[dBytes] + kNumber}, sub {kNumber})");
    }
}

public class CPI() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highK = (byte)(commandBytes[1] & 0b1111);
        byte lowK = (byte)(commandBytes[0] & 0b1111);
        byte dLow = (byte)((commandBytes[0] >> 4) & 0b111);
        byte rdIndex = (byte)(dLow + 16); // AVR instruction set uses R16-R31 for this command               
        byte K = (byte)((highK << 4) | lowK);

        byte rdValue = program.Registers[rdIndex];
        int diff = rdValue - K;
        byte result = (byte)diff;

        program.StatusRegister.SetBit(5, (((~(rdValue >> 3) & K >> 3) | (K >> 3 & result >> 3) | (result >> 3 & ~(rdValue >> 3))) & 0b1) != 0);
        program.StatusRegister.SetBit(4, ((program.StatusRegister.SREGByte >> 2 ^ program.StatusRegister.SREGByte >> 3) & 0b1) != 0);
        program.StatusRegister.SetBit(3, ((rdValue >> 7 & ~(K >> 7) & (~(result >> 7) | ~(rdValue >> 7)) & K >> 7 & result >> 7) & 0b1) != 0);
        program.StatusRegister.SetBit(2, result >> 7 == 1);
        program.StatusRegister.SetBit(1, result == 0);
        program.StatusRegister.SetBit(0, Math.Abs(K) > Math.Abs(rdValue));

        Console.WriteLine($"CPI R{rdIndex}, 0x{K:X2} (R{rdIndex}=0x{rdValue:X2}, result=0x{result:X2})");

        program.PC++;
    }
}

public class CPC() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => (commandBytes[1] >> 2 & 0b01) == 0b01;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte highRBit = (byte)(commandBytes[1] >> 1 & 0b1);
        byte highDBit = (byte)(commandBytes[1] & 0b1);

        byte dBytes = (byte)(commandBytes[0] >> 4);
        byte rBytes = (byte)(commandBytes[0] & 0b1111);

        byte dAddress = (byte)(highDBit << 4 | dBytes);
        byte rAddress = (byte)(highRBit << 4 | rBytes);

        byte carry = (byte)(program.StatusRegister.SREGByte & 0b1);
        byte result = (byte)(program.Registers[dAddress] - program.Registers[rAddress] - carry);
        byte rdValue = program.Registers[dAddress];
        byte rrValue = program.Registers[rAddress];

        program.StatusRegister.SetBit(5, (~(rdValue >> 3) & (rrValue >> 3) | (rrValue >> 3) & (result >> 3) | (result >> 3) & ~(rdValue >> 3) & 0b1) == 1);
        program.StatusRegister.SetBit(4, (program.StatusRegister.SREGByte >> 2 ^ program.StatusRegister.SREGByte >> 3) == 1);
        program.StatusRegister.SetBit(2, result >> 7 == 1);
        program.StatusRegister.SetBit(1, result == 0);
        program.StatusRegister.SetBit(0, (Math.Abs(rrValue) + carry) > Math.Abs(rdValue));

        Console.WriteLine($"CPC R{dAddress} - R{rAddress} - {carry}");

        program.PC++;
    }
}

public class BRBC() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => true; 
    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        byte SREGIndex = (byte)(commandBytes[1] & 0b111);
        byte highK = (byte)(commandBytes[0] & 0b11);
        byte lowK = (byte)(commandBytes[1] >> 3);

        bool isNegative = highK >> 1 == 1;
        byte k = (byte)((highK << 5) | lowK);

        if (isNegative) k = (byte)-k;

        if (program.StatusRegister.SREGByte >> SREGIndex == 0)
        {
            program.PC += k + 1;
        }
        else
        {
            program.PC++;
        }

        Console.WriteLine($"BRBC {SREGIndex}, {k}");
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
        int x = (program.Registers[27] << 8) | program.Registers[26];

        // Get source register
        byte highRByte = (byte)(commandBytes[1] & 0b1);
        byte lowRBytes = (byte)(commandBytes[0] >> 4);
        byte registerAddress = (byte)((highRByte << 4) | lowRBytes);

        switch (detectedVariant)
        {
            case Variant.X:
                program.DataSpace[x] = program.Registers[registerAddress];
                break;
            case Variant.XPostInc:
                program.DataSpace[x] = program.Registers[registerAddress];
                x++;
                program.Registers[27] = (byte)(x >> 8);
                program.Registers[26] = (byte)(x & 0xFF);
                break;
            case Variant.XPreDec:
                x--;
                program.Registers[27] = (byte)(x >> 8);
                program.Registers[26] = (byte)(x & 0xFF);
                program.DataSpace[x] = program.Registers[registerAddress];
                break;
            default:
                throw new InvalidOperationException("Unknown STX variant");
        }

        Console.WriteLine($"STX put register {registerAddress} into dataspace {x}");

        program.PC++;
    }
}

public class CALL() : CommandTemplate
{
    public override bool ConfirmCommand(byte[] commandBytes) => ((commandBytes[0] >> 1) & 0b111) == 0b111;

    public override void RunCommand(MachineData program, byte[] commandBytes, ref ReadOnlySpan<char> fileSpan, ref int commandIndex)
    {
        ushort lastByte = fileSpan.Slice2Char();
        ushort nextByte = fileSpan.Slice2Char();

        int address = (byte)(commandBytes[1] & 1) << 22 | (byte)(commandBytes[0] >> 4) << 17 | (byte)(commandBytes[0] & 1) << 16 | (byte)(nextByte) << 8 | (byte)lastByte;
        commandIndex += 2;

        program.PC = address;

        Console.WriteLine($"CALL {address}");
    }
}