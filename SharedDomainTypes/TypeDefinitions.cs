namespace SharedDomainTypes;

using threeNib = ThreeNibble;

public class ThreeNibble(short num)
{
    short numValue = num;

    public static implicit operator int(ThreeNibble threeNib)
    {
        if (threeNib.numValue >> 11 == 1)
        {
            return threeNib.numValue + 2048;
        }
        return threeNib.numValue;
    }

    public static implicit operator ThreeNibble(int number)
    {
        int numberToReturn = number;

        if (number >> 11 == 1)
        {
            numberToReturn -= 2048;
        }

        return new ThreeNibble((short)numberToReturn);
    }
}
