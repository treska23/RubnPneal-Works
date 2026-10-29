using System.Linq;
using System.Text;
using System;
using System.Threading.Tasks;
using System.Windows.Controls;

namespace AulaManagerWpf;

public partial class MainWindow
{
    private bool _busy;
    private async Task RunBusyAsync(Func<Task> work)
    {
        if (_busy) return;
        _busy = true;
        // Keep the window repainting/resizable, but prevent overlapping operations.
        var content = (Panel)Content;
        content.IsEnabled = false;
        try { await work(); }
        catch (Exception ex) { Log("Error: " + ex.Message); Warn(ex.Message); }
        finally { content.IsEnabled = true; _busy = false; }
    }
    // Windows argv quoting: preserve embedded quotes and trailing backslashes.
    internal static string QuoteArgument(string value)
    {
        var result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value)
        {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') result.Append('\\', slashes * 2 + 1);
            else result.Append('\\', slashes);
            result.Append(c);
            slashes = 0;
        }
        return result.Append('\\', slashes * 2).Append('"').ToString();
    }
}
