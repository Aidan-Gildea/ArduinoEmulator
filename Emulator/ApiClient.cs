using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using SharedDomainTypes;

namespace Emulator;

public class ApiClient
{
    private readonly HttpClient _http;

    public ApiClient(string baseAddress)
    {
        if (string.IsNullOrWhiteSpace(baseAddress)) throw new ArgumentException("baseAddress required", nameof(baseAddress));
        if (!baseAddress.EndsWith('/')) baseAddress += '/';
        _http = new HttpClient { BaseAddress = new Uri(baseAddress) };
    }

    public async Task<List<CommandTemplate>> FindAllInstructionsAsync(string[] dataLines)
    {
        var resp = await _http.PostAsJsonAsync("Visualizer/FindAllInstructions", dataLines);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<List<CommandTemplate>>() 
            ?? throw new InvalidOperationException("Failed to deserialize response");
    }
}
