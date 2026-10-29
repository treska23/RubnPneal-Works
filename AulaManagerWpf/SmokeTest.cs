using System;
using System.IO;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace AulaManagerWpf;

public partial class MainWindow
{
    // Read-only functional smoke test: never invokes cleanup or system changes.
    private async Task SmokeTestAsync()
    {
        try
        {
            if (string.IsNullOrWhiteSpace(PcNameText.Text) || _pc.RamMb <= 0)
                throw new InvalidOperationException("Inventory did not populate");
            var serializer = new JavaScriptSerializer();
            var identity = serializer.Deserialize<Identity>(serializer.Serialize(new Identity { Center = "Centro ñ", Station = "PC1" }));
            if (identity.Center != "Centro ñ" || identity.Station != "PC1") throw new Exception("Identity JSON roundtrip");
            var backup = new Backup { CeipSaved = true, CeipAbsent = true };
            backup.Services["DiagTrack"] = 2;
            var restored = serializer.Deserialize<Backup>(serializer.Serialize(backup));
            if (restored.Services["DiagTrack"] != 2 || !restored.CeipSaved || !restored.CeipAbsent) throw new Exception("Backup JSON roundtrip");
            foreach (string value in new[] { "", "C:\\USB con espacios\\", "a\"b", "x\\\"y" })
            {
                var parsed = CommandLineToArgvW("test.exe " + QuoteArgument(value), out int argc);
                try {
                    if (argc != 2 || System.Runtime.InteropServices.Marshal.PtrToStringUni(System.Runtime.InteropServices.Marshal.ReadIntPtr(parsed, IntPtr.Size)) != value)
                        throw new Exception("Argument quoting roundtrip");
                } finally { if (parsed != IntPtr.Zero) LocalFree(parsed); }
            }
            Directory.CreateDirectory("smoke-results");
            foreach (int width in new[] { 800, 1390, 1920 })
            {
                Width = width; Height = 800;
                for (int page = 0; page < 6; page++)
                {
                    ShowPage(page);
                    await Task.Delay(100); // Dispatcher must remain available while waiting.
                    UpdateLayout();
                    var bitmap = new RenderTargetBitmap((int)ActualWidth, (int)ActualHeight, 96, 96, PixelFormats.Pbgra32);
                    bitmap.Render(this);
                    var encoder = new PngBitmapEncoder();
                    encoder.Frames.Add(BitmapFrame.Create(bitmap));
                    using (var file = File.Create($"smoke-results/page-{page}-{width}.png")) encoder.Save(file);
                }
            }
            File.WriteAllText("smoke-results/passed.txt", "PASS: WPF startup, inventory, six pages at three widths, identity/backup JSON and Windows argument quoting. No maintenance applied.");
            Application.Current.Shutdown(0);
        }
        catch (Exception ex)
        {
            Directory.CreateDirectory("smoke-results");
            File.WriteAllText("smoke-results/failed.txt", ex.ToString());
            Application.Current.Shutdown(1);
        }
    }
}
