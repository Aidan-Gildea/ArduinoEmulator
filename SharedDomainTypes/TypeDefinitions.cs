namespace SharedDomainTypes;

using threeNib = ThreeNibble;

public class ThreeNibble(short num)
{
    short numValue = num;

    public static implicit operator int(ThreeNibble threeNib)
    {
        if (threeNib.numValue >> 11 == 1)
        {
            return threeNib.numValue + 2047;
        }
        return threeNib.numValue;
    }

    public static explicit operator ThreeNibble(int number)
    {
        int numberToReturn = number;

        if (number >> 11 == 1)
        {
            number -= 2048;
        }

        return new ThreeNibble((short)numberToReturn);
    }
}
