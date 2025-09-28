using System.Globalization;
using System.Reflection.Metadata.Ecma335;

public class Program
{
    public static Dictionary<int, char> NumberToLetter = new Dictionary<int, char>()
    {
        [1] = '1',
        [2] = '2',
        [3] = '3',
        [4] = '4',
        [5] = '5',
        [6] = '6',
        [7] = '7',
        [8] = '8',
        [9] = '9',
        [10] = 'A',
        [11] = 'B',
        [12] = 'C',
        [13] = 'D',
        [14] = 'E',
        [15] = 'F'
    };
    
    public static string ConvertAsciiToHexRecursion(int number, int quotient, int remainder)
    {
        if (quotient == 0) return $"0x{NumberToLetter[remainder]}";

        string resultingString = ConvertAsciiToHexRecursion(number, quotient / 16, quotient % 16);

        resultingString += $"{NumberToLetter[remainder]}";

        return resultingString;
    }

    public static string ConvertAsciiToHex(int number)
    {
        return ConvertAsciiToHexRecursion(number, number / 16, number % 16);
    }

    public static int ConvertHexToDecimal(string hexNumber)
    {
        int powOfSixteen = hexNumber.Length - 1;
        int resultingNumber = 0;

        foreach (var character in hexNumber)
        {
            if (character >= '0' && character <= '9')
            {
                resultingNumber += (int)((character - '0') * Math.Pow(16, powOfSixteen));
            }
            else if (character >= 'A' && character <= 'F')
            {
                resultingNumber += (int)((character - ('A' - 10)) * Math.Pow(16, powOfSixteen));
            }
            powOfSixteen--;
        }
        return resultingNumber;
    }

    public static int ConvertAsciiToDecimal(int asciiNumber) => asciiNumber - '0';

    public static void Main()
    {

        // int decimalNumber = (int)ConvertHexToDecimal("0C");
        // string binaryNumber = Convert.ToString(decimalNumber, 2);
        // Console.WriteLine(binaryNumber);
    }
}