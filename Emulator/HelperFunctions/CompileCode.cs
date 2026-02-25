using System.Diagnostics;

namespace Emulator;

public class CompileCode
{
    public string ReturnHexFile(string sourceCode)
    {
        if (string.IsNullOrWhiteSpace(sourceCode))
        {
            throw new ArgumentException("sourceCode cannot be empty.", nameof(sourceCode));
        }

        var tempRoot = Path.Combine(Path.GetTempPath(), "arduino-emulator-build", Guid.NewGuid().ToString("N"));
        var sketchName = "GeneratedSketch";
        var sketchDirectory = Path.Combine(tempRoot, sketchName);
        var outputDirectory = Path.Combine(tempRoot, "build");

        Directory.CreateDirectory(sketchDirectory);
        Directory.CreateDirectory(outputDirectory);

        var inoPath = Path.Combine(sketchDirectory, $"{sketchName}.ino");
        File.WriteAllText(inoPath, sourceCode);

        var arduinoCliPath = ResolveArduinoCliPath();

        var compileExitCode = RunCommand(
            arduinoCliPath,
            $"compile --fqbn arduino:avr:uno --output-dir \"{outputDirectory}\" \"{sketchDirectory}\"");

        if (compileExitCode != 0)
        {
            throw new InvalidOperationException("Arduino compilation failed. See server logs for arduino-cli output.");
        }

        var hexFilePath = Directory
            .EnumerateFiles(outputDirectory, "*.hex", SearchOption.AllDirectories)
            .FirstOrDefault(path => !path.EndsWith("with_bootloader.hex", StringComparison.OrdinalIgnoreCase))
            ?? Directory.EnumerateFiles(outputDirectory, "*.hex", SearchOption.AllDirectories).FirstOrDefault();

        if (hexFilePath is null)
        {
            throw new FileNotFoundException("No .hex file was produced by arduino-cli.");
        }

        return File.ReadAllText(hexFilePath);
    }

    private static string ResolveArduinoCliPath()
    {
        var candidates = new List<string>
        {
            "/opt/homebrew/bin/arduino-cli",
            "/usr/local/bin/arduino-cli"
        };

        var pathEnvironment = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        var pathSegments = pathEnvironment
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var segment in pathSegments)
        {
            var combined = Path.Combine(segment, "arduino-cli");
            candidates.Add(combined);
        }

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        throw new FileNotFoundException(
            "Could not find 'arduino-cli'. Install it and ensure it is available in PATH (or at /opt/homebrew/bin/arduino-cli). " +
            $"Current PATH: '{pathEnvironment}'.");
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
            throw new InvalidOperationException(
                $"Failed to start process '{fileName}' with args '{arguments}'.", ex);
        }

        if (process is null)
        {
            throw new InvalidOperationException($"Could not start process '{fileName}'.");
        }

        using (process)
        {
            var stdout = process.StandardOutput.ReadToEnd();
            var stderr = process.StandardError.ReadToEnd();
            process.WaitForExit();

            if (!string.IsNullOrWhiteSpace(stdout))
            {
                Console.WriteLine($"{fileName} stdout:\n{stdout}");
            }

            if (!string.IsNullOrWhiteSpace(stderr))
            {
                Console.WriteLine($"{fileName} stderr:\n{stderr}");
            }

            return process.ExitCode;
        }
    }
}