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
            var plan = MaintenancePlan.All();
            if (!plan.UserTemp || !plan.SystemTemp || !plan.Ceip || !plan.ExportReport || !plan.UpdateLibre ||
                !plan.HasTasks || !plan.ChangesSystem ||
                !System.Linq.Enumerable.SequenceEqual(plan.Services, ServicesAllowlist))
                throw new Exception("Run-all plan omitted maintenance tasks");
            plan.Services[0] = "changed-for-test";
            if (MaintenancePlan.All().Services[0] != "DiagTrack") throw new Exception("Run-all plan shares mutable state");
            if (!RunAllOverviewButton.Content.ToString().Contains("todo") ||
                !RunAllMaintenanceButton.Content.ToString().Contains("todo"))
                throw new Exception("Run-all buttons missing");
            if (!IsLegacyLibreCompatible(new Version(25, 2, 7, 2)) || IsLegacyLibreCompatible(new Version(25, 8, 0, 0)) ||
                !IsLegacyLibre(new Version(6, 1)) || IsLegacyLibre(new Version(10, 0)) ||
                LibreVersion("7.6.4.1") != new Version(7, 6, 4, 1)) throw new Exception("LibreOffice compatibility policy failed");
            if (StableVersions("<a href=\"26.2.6/\">x</a><a href=\"26.8.1/\">x</a><a href=\"27.2.0-rc1/\">x</a>")[0] != "26.8.1")
                throw new Exception("Stable release discovery failed");
            string center = CenterBox.Text, station = StationBox.Text;
            try
            {
                CenterBox.Text = "SmokeTest";
                StationBox.Text = Guid.NewGuid().ToString("N");
                string report = WriteReport();
                if (!File.ReadAllText(report).Contains("Centro: SmokeTest")) throw new Exception("Report not generated");
                File.Delete(report);
            }
            finally { CenterBox.Text = center; StationBox.Text = station; }
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
            var args = Environment.GetCommandLineArgs();
            if (System.Linq.Enumerable.Contains(args, "--libre-network-test"))
            {
                foreach (bool legacy in new[] { true, false }) foreach (bool x64 in new[] { true, false }) {
                    var release = await GetLibreReleaseAsync(legacy, x64);
                    if (legacy && !IsLegacyLibreCompatible(LibreVersion(release.Version)!)) throw new Exception("Incompatible Windows 7 release offered");
                    File.AppendAllText("smoke-results/libre-metadata.txt", $"{legacy} / {x64}: {release.Download}\nSHA256 {release.Sha256}\n");
                }
            }
            if (System.Linq.Enumerable.Contains(args, "--libre-install-test"))
            {
                var release = await GetLibreReleaseAsync(!Environment.Is64BitProcess, Environment.Is64BitProcess);
                string file = await DownloadLibreAsync(release);
                await InstallLibreAsync(release, file);
                File.WriteAllText("smoke-results/libre-install-passed.txt", "Downloaded, SHA256 verified, installed and registry version verified: " + release.FileName);
            }
            File.WriteAllText("smoke-results/passed.txt", "PASS: WPF startup, inventory, six pages at three widths, run-all plan/buttons, report generation, compatibility policy, identity/backup JSON and Windows argument quoting. System cleanup/CEIP/services were not changed.");
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
