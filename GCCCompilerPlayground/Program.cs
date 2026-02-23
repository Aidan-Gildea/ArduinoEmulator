using System.Diagnostics;
using System.Runtime.CompilerServices;

class Program
{
    private static string GetProjectDirectory([CallerFilePath] string sourceFilePath = "")
    {
        return Path.GetDirectoryName(sourceFilePath)!;
    }

    private static int RunCommand(string fileName, string arguments)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        Process? process;
        try
        {
            process = Process.Start(startInfo);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Could not start '{fileName}': {ex.Message}");
            return -1;
        }

        if (process is null)
        {
            Console.WriteLine($"Could not start '{fileName}' process.");
            return -1;
        }

        using (process)
        {
            var stdOut = process.StandardOutput.ReadToEnd();
            var stdErr = process.StandardError.ReadToEnd();
            process.WaitForExit();

            if (!string.IsNullOrWhiteSpace(stdOut))
            {
                Console.WriteLine($"{fileName} stdout:");
                Console.WriteLine(stdOut);
            }

            if (!string.IsNullOrWhiteSpace(stdErr))
            {
                Console.WriteLine($"{fileName} stderr:");
                Console.WriteLine(stdErr);
            }

            return process.ExitCode;
        }
    }

    public static void Main()
    {
        var projectDirectory = GetProjectDirectory();
        var generatedFilePath = Path.Combine(projectDirectory, "generated.c");
        var elfOutputPath = Path.Combine(projectDirectory, "generated.elf");
        var hexOutputPath = Path.Combine(projectDirectory, "generated.hex");

        File.WriteAllText(
            generatedFilePath,
            @"#include <avr/io.h>

int main(void)
{
    while (1)
    {
    }

    return 0;
}");

        Console.WriteLine($"Generated C file at: {generatedFilePath}");

        var compileExitCode = RunCommand(
            "avr-gcc",
            $"-mmcu=atmega328p -Os \"{generatedFilePath}\" -o \"{elfOutputPath}\"");

        if (compileExitCode != 0)
        {
            Console.WriteLine($"AVR compile failed with exit code: {compileExitCode}");
            return;
        }

        var objcopyExitCode = RunCommand(
            "avr-objcopy",
            $"-O ihex -R .eeprom \"{elfOutputPath}\" \"{hexOutputPath}\"");

        if (objcopyExitCode == 0)
        {
            Console.WriteLine($"HEX generation succeeded: {hexOutputPath}");
        }
        else
        {
            Console.WriteLine($"HEX generation failed with exit code: {objcopyExitCode}");
        }
    }
}