using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Threading;

namespace AulaManagerWpf;

public partial class MainWindow
{
    private sealed class LibreRelease
    {
        public string Version = "", FileName = "", Sha256 = "";
        public Uri Download = null!;
    }
    private static HttpClient CreateDownloadClient()
    {
        ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        return new HttpClient(new HttpClientHandler { AllowAutoRedirect = true, MaxAutomaticRedirections = 5 }) {
            Timeout = TimeSpan.FromMinutes(15)
        };
    }
    private static Version? LibreVersion(string value)
    {
        var match = Regex.Match(value ?? "", @"\d+\.\d+(?:\.\d+){0,2}");
        if (!match.Success || !Version.TryParse(match.Value, out var version)) return null;
        return new Version(version.Major, version.Minor, Math.Max(0, version.Build), Math.Max(0, version.Revision));
    }
    private static bool IsLegacyLibre(Version windows) => windows.Major < 10;
    private static bool IsLegacyLibreCompatible(Version version) => version < new Version(25, 8);
    private static string[] StableVersions(string html) => Regex.Matches(html, "href=\"(\\d+\\.\\d+\\.\\d+)/\"")
        .Cast<Match>().Select(m => m.Groups[1].Value).Distinct()
        .OrderByDescending(v => LibreVersion(v)).ToArray();

    private static async Task<LibreRelease> GetLibreReleaseAsync(bool legacyWindows, bool x64)
    {
        using var client = CreateDownloadClient();
        client.Timeout = TimeSpan.FromSeconds(45);
        string root = legacyWindows ? "https://downloadarchive.documentfoundation.org/libreoffice/old/" :
            "https://download.documentfoundation.org/libreoffice/stable/";
        // 25.2 is the last Windows 7/8 series. Do not offer newer releases there.
        string[] versions = legacyWindows ? new[] { "25.2.7.2" } : StableVersions(await client.GetStringAsync(root));
        foreach (string version in versions)
        {
            string file = $"LibreOffice_{version}_Win_{(x64 ? "x86-64" : "x86")}.msi";
            var url = new Uri(root + version + "/win/" + (x64 ? "x86_64" : "x86") + "/" + file);
            using var response = await client.GetAsync(url.AbsoluteUri + ".sha256");
            if (response.StatusCode == HttpStatusCode.NotFound) continue;
            response.EnsureSuccessStatusCode();
            string hash = (await response.Content.ReadAsStringAsync()).Trim();
            var match = Regex.Match(hash, @"\A([0-9a-fA-F]{64})\s+\*?" + Regex.Escape(file) + @"\s*\z");
            if (!match.Success) throw new InvalidDataException("El servidor oficial no devolvió un SHA-256 válido.");
            return new LibreRelease { Version = version, FileName = file, Download = url, Sha256 = match.Groups[1].Value };
        }
        throw new InvalidOperationException("No se encuentra un instalador oficial compatible con este Windows y arquitectura.");
    }
    private static bool FileMatchesHash(string file, string expected)
    {
        using var stream = File.OpenRead(file);
        using var sha = SHA256.Create();
        string actual = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "");
        return string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase);
    }
    private async Task<string> DownloadLibreAsync(LibreRelease release)
    {
        string directory = Path.Combine(_baseFolder, "Descargas");
        Directory.CreateDirectory(directory);
        string file = Path.Combine(directory, release.FileName);
        if (File.Exists(file) && await Task.Run(() => FileMatchesHash(file, release.Sha256)))
        { Log("Instalador oficial en caché verificado: " + release.FileName); return file; }
        string partial = file + ".partial";
        try
        {
            using (var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(15)))
            using (var client = CreateDownloadClient())
            using (var response = await client.GetAsync(release.Download, HttpCompletionOption.ResponseHeadersRead, timeout.Token))
            {
                response.EnsureSuccessStatusCode();
                if (response.RequestMessage.RequestUri.Scheme != Uri.UriSchemeHttps)
                    throw new InvalidDataException("La descarga se ha redirigido a una conexión sin HTTPS.");
                long total = response.Content.Headers.ContentLength ?? 0, received = 0;
                if (total > 1073741824) throw new InvalidDataException("Tamaño inesperado del instalador.");
                using var input = await response.Content.ReadAsStreamAsync();
                using var output = new FileStream(partial, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);
                var buffer = new byte[81920];
                int read, lastProgress = -1;
                while ((read = await input.ReadAsync(buffer, 0, buffer.Length, timeout.Token)) > 0)
                {
                    received += read;
                    if (received > 1073741824) throw new InvalidDataException("Tamaño inesperado del instalador.");
                    await output.WriteAsync(buffer, 0, read, timeout.Token);
                    int progress = total > 0 ? (int)(received * 100 / total) : (int)(received / 1048576);
                    if (progress != lastProgress) {
                        StatusText.Text = total > 0 ? $"Descargando LibreOffice: {progress}%" : $"Descargando LibreOffice: {progress} MB";
                        lastProgress = progress;
                    }
                }
                if (received < 65536 || (total > 0 && received != total)) throw new InvalidDataException("Descarga incompleta.");
            }
            StatusText.Text = "Verificando el instalador de LibreOffice…";
            if (!await Task.Run(() => FileMatchesHash(partial, release.Sha256))) throw new InvalidDataException("SHA-256 incorrecto. No se instalará el archivo.");
            if (File.Exists(file)) File.Delete(file);
            File.Move(partial, file);
            Log("Descarga oficial y SHA-256 verificados: " + release.FileName);
            return file;
        }
        catch { if (File.Exists(partial)) File.Delete(partial); throw; }
    }
    private async Task InstallLibreAsync(LibreRelease release, string file)
    {
        if (Process.GetProcessesByName("soffice").Length > 0 || Process.GetProcessesByName("soffice.bin").Length > 0)
            throw new InvalidOperationException("Cierra los documentos y LibreOffice antes de actualizar. No se han cerrado por la fuerza.");
        StatusText.Text = "Instalando LibreOffice " + release.Version + "…";
        string log = Path.Combine(_dataFolder, "LibreOffice-instalacion.log");
        Directory.CreateDirectory(_dataFolder);
        var start = new ProcessStartInfo("msiexec.exe") { UseShellExecute = true, Verb = "runas",
            Arguments = "/i " + QuoteArgument(file) + " /passive /norestart /L*v " + QuoteArgument(log) };
        using var process = Process.Start(start) ?? throw new InvalidOperationException("No se pudo iniciar Windows Installer.");
        await Task.Run(() => process.WaitForExit());
        if (process.ExitCode != 0 && process.ExitCode != 3010)
            throw new InvalidOperationException($"Windows Installer terminó con código {process.ExitCode}. Consulta {log}");
        var installed = await Task.Run(FindSoftware);
        var target = LibreVersion(release.Version)!;
        if (!installed.Any(x => IsLibreProduct(x) && LibreVersion(x.Version) is Version version && version >= target))
            throw new InvalidOperationException("El instalador terminó, pero no se ha podido verificar la nueva versión de LibreOffice.");
        Log("LibreOffice " + release.Version + " instalado y verificado." + (process.ExitCode == 3010 ? " Es necesario reiniciar Windows." : ""));
        LibreUpdateText.Text = "LibreOffice " + release.Version + " instalado y verificado.";
    }
    private static bool IsLibreProduct(Software software) => Regex.IsMatch(software.Name, @"^LibreOffice(?:\s+\d|\s*$)", RegexOptions.IgnoreCase);
    private async Task UpdateLibreOfficeAsync()
    {
        StatusText.Text = "Buscando la versión compatible de LibreOffice…";
        var installed = (await Task.Run(FindSoftware)).Where(IsLibreProduct)
            .OrderByDescending(x => LibreVersion(x.Version)).FirstOrDefault();
        bool x64 = installed?.Is64Bit ?? Environment.Is64BitOperatingSystem;
        bool legacy = IsLegacyLibre(Environment.OSVersion.Version);
        var release = await GetLibreReleaseAsync(legacy, x64);
        Log($"LibreOffice compatible: {release.Version}, {(x64 ? "64" : "32")} bits" + (legacy ? " (última serie para Windows 7/8, archivada)." : "."));
        if (installed != null && LibreVersion(installed.Version) is Version current && current >= LibreVersion(release.Version))
        {
            LibreUpdateText.Text = "Ya está instalada una versión igual o posterior: " + installed.Version;
            Log(LibreUpdateText.Text); return;
        }
        string file = await DownloadLibreAsync(release);
        _installerMsi = file; LibreInstallerBox.Text = file;
        await InstallLibreAsync(release, file);
        await RefreshInventoryAsync(); await RefreshSoftwareAsync();
        LibreInstalledText.Text = "Instalado: " + _pc.LibreOffice;
    }
    private async void AutoLibre_Click(object sender, System.Windows.RoutedEventArgs e)
    {
        if (_busy) return;
        if (!Confirm("¿Buscar, descargar e instalar automáticamente la versión compatible de LibreOffice?\n\nGuarda tus documentos y cierra LibreOffice. Se verificará el SHA-256 oficial antes de instalar. En Windows 7/8 se utiliza la última serie compatible, 25.2, ya archivada.")) return;
        await RunBusyAsync(async () => { await UpdateLibreOfficeAsync(); StatusText.Text = "LibreOffice comprobado"; });
    }
}
