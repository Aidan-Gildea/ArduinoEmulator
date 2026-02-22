class Program
{
    public static void Main()
    {
        File.WriteAllText("generated.c", @" #include <stdio.h> int main() { printf(""Hello from generated code!\n""); return 0; } ");
        
    }
}