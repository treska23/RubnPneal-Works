using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Threading.Tasks;

namespace AulaManagerWpf;

public partial class MainWindow : Window
{
    private readonly string _baseFolder = AppContext.BaseDirectory;
    private readonly List<string> _session = new();
    private List<Software> _installed = new();
    private string _installerMsi = "";
    private string _isoFolder = "";
    private string _logPath = "";
    private readonly string _dataFolder;
    private PcInfo _pc = new();
    private bool _isAdmin;

    public MainWindow()
    {
        InitializeComponent();
        Width = Math.Min(Width, SystemParameters.WorkArea.Width);
        Height = Math.Min(Height, SystemParameters.WorkArea.Height);
        _dataFolder = Path.Combine(_baseFolder, "Datos");
        try { Directory.CreateDirectory(_dataFolder); }
        catch (Exception ex) { Warn("No se puede escribir en el pendrive: " + ex.Message); }
        LoadIdentity();
        Loaded += async (_, __) => {
            await RunBusyAsync(async () => { await RefreshInventoryAsync(); await RefreshSoftwareAsync(); });
            if (Environment.GetCommandLineArgs().Contains("--smoke-test")) await SmokeTestAsync();
        };
        ShowPage(0);
        Log("Inicio de Aula Manager WPF. Ninguna tarea automática ejecutada.");
    }

    private static bool Confirm(string message) => MessageBox.Show(message, "Aula Manager · Confirmación",
        MessageBoxButton.YesNo, MessageBoxImage.Warning, MessageBoxResult.No) == MessageBoxResult.Yes;
    private static void Warn(string message) => MessageBox.Show(message, "Aula Manager", MessageBoxButton.OK, MessageBoxImage.Warning);
    private static void Info(string message) => MessageBox.Show(message, "Aula Manager", MessageBoxButton.OK, MessageBoxImage.Information);
    private static string Clean(string value)
    {
        var t = new string(value.Where(c => char.IsLetterOrDigit(c) || c is ' ' or '-' or '_').Take(55).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(t) ? "Sin_dato" : t;
    }

    private string ConfigPath => Path.Combine(_baseFolder, "AulaManager.json");
    private string BackupPath => Path.Combine(_dataFolder, "Respaldos", $"{Clean(CenterBox.Text)}_{Clean(StationBox.Text)}.json");

    private void LoadIdentity()
    {
        try
        {
            if (!File.Exists(ConfigPath)) return;
            var value = new JavaScriptSerializer().Deserialize<Identity>(File.ReadAllText(ConfigPath, Encoding.UTF8));
            CenterBox.Text = value?.Center ?? "";
            StationBox.Text = value?.Station ?? "";
        }
        catch (Exception ex) { _session.Add("Error cargando identidad: " + ex.Message); }
    }
    private void SaveIdentity()
    {
        try
        {
            var content = new JavaScriptSerializer().Serialize(new Identity { Center = CenterBox.Text.Trim(), Station = StationBox.Text.Trim() });
            File.WriteAllText(ConfigPath, content, new UTF8Encoding(false));
        }
        catch (Exception ex) { Warn("No se pudo guardar la identidad: " + ex.Message); }
    }
    private void SaveIdentity_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(CenterBox.Text) || string.IsNullOrWhiteSpace(StationBox.Text))
        { Warn("Indica el centro y el puesto físico."); return; }
        SaveIdentity();
        IdentityText.Text = $"Centro: {CenterBox.Text} · Puesto físico: {StationBox.Text}";
        Log($"Puesto guardado: {CenterBox.Text} · {StationBox.Text}");
        Info("Identificación guardada junto al ejecutable.");
    }
    private void Log(string message)
    {
        string line = $"[{DateTime.Now:dd/MM/yyyy HH:mm:ss}] {message}";
        _session.Add(line);
        LogText.Text = string.Join(Environment.NewLine, _session);
        LogText.ScrollToEnd();
        try
        {
            string folder = Path.Combine(_dataFolder, "Registros");
            Directory.CreateDirectory(folder);
            if (_logPath.Length == 0)
                _logPath = Path.Combine(folder, $"{DateTime.Now:yyyyMMdd_HHmmss}_{Clean(Environment.MachineName)}.txt");
            File.AppendAllText(_logPath, line + Environment.NewLine, new UTF8Encoding(false));
        }
        catch { /* Se conserva en memoria si el USB es de solo lectura. */ }
    }
    private async void Navigate_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button b && int.TryParse(b.Tag?.ToString(), out int index)) { ShowPage(index); if (index == 2) await RunBusyAsync(RefreshSoftwareAsync); }
    }
    private void ShowPage(int index)
    {
        FrameworkElement[] pages = { PageOverview, PageMaintenance, PagePrograms, PageLibre, PageMigration, PageReports };
        Button[] nav = { NavOverview, NavMaintenance, NavPrograms, NavLibre, NavMigration, NavReports };
        for (int n = 0; n < pages.Length; n++)
        {
            pages[n].Visibility = n == index ? Visibility.Visible : Visibility.Collapsed;
            nav[n].Background = new SolidColorBrush(n == index ? Color.FromRgb(32, 143, 230) : Color.FromRgb(243, 250, 255));
            nav[n].Foreground = new SolidColorBrush(n == index ? Colors.White : Color.FromRgb(19, 57, 104));
        }

        if (index == 3) LibreInstalledText.Text = "Instalado: " + _pc.LibreOffice;
        if (index == 5) IdentityText.Text = $"Centro: {CenterBox.Text} · Puesto: {StationBox.Text} · Equipo: {_pc.Machine}";
    }

    private async Task RefreshInventoryAsync()
    {
        _isAdmin = IsAdministrator();
        _pc = await Task.Run(Inspect);
        PcNameText.Text = _pc.Machine;
        OsText.Text = _pc.Windows;
        ArchText.Text = _pc.Architecture;
        CpuText.Text = _pc.Cpu;
        RamText.Text = $"{_pc.RamMb:N0} MB";
        DiskText.Text = $"{_pc.DiskFreeGb:N1} GB";
        LibreText.Text = _pc.LibreOffice;
        AdminText.Text = _isAdmin ? "Sí" : "No";
        ElevateButton.Visibility = _isAdmin ? Visibility.Collapsed : Visibility.Visible;
        StateOS.Text = "✓ Sistema operativo identificado";
        StateDisk.Text = _pc.DiskFreeGb >= 25 ? "✓ Espacio libre suficiente" : "⚠ Revisar espacio en disco";
        StateAV.Text = "Antivirus de terceros: comprobación disponible";
        MemoryText.Text = $"RAM: {_pc.RamUsedPercent}% en uso";
        MemoryBar.Value = Math.Max(0, Math.Min(100, _pc.RamUsedPercent));
        FreeDiskText.Text = $"Disco libre: {_pc.DiskFreeGb:N1} GB";
        MigrationSpecsText.Text = $"Sistema: {_pc.Windows} · {_pc.Architecture} · RAM: {_pc.RamMb:N0} MB · Libre: {_pc.DiskFreeGb:N1} GB";
        LibreWarningText.Text = _pc.IsWindows7
            ? "Windows 7 SP1: actualización automática a LibreOffice 25.2 (última serie compatible, archivada). Puede requerir actualizaciones de Windows, incluida KB3063858."
            : "Comprueba firma digital, arquitectura e idioma del MSI antes de instalarlo.";
    }
    private static bool IsAdministrator()
    {
        using var identity = WindowsIdentity.GetCurrent();
        return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
    }
    private void Elevate_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            SaveIdentity();
            var exe = Process.GetCurrentProcess().MainModule?.FileName;
            if (string.IsNullOrWhiteSpace(exe)) throw new InvalidOperationException("Ejecutable no encontrado.");
            Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true, Verb = "runas", WorkingDirectory = _baseFolder });
            Close();
        }
        catch (Exception ex) { Warn("No se pudo elevar: " + ex.Message); }
    }
    private string ReportDirectory => Path.Combine(_dataFolder, "Informes");
    private string WriteReport()
    {
        Directory.CreateDirectory(ReportDirectory);
        string file = Path.Combine(ReportDirectory,
            $"{Clean(CenterBox.Text)}_{Clean(StationBox.Text)}_{DateTime.Now:yyyyMMdd_HHmmss}.txt");
        string header = $"AULA MANAGER — INFORME\nCentro: {CenterBox.Text}\nPuesto físico: {StationBox.Text}\nWindows: {_pc.Windows}\nCPU: {_pc.Cpu}\nRAM: {_pc.RamMb} MB\nFecha: {DateTime.Now:dd/MM/yyyy HH:mm:ss}\n\nACTUACIONES REGISTRADAS\n";
        File.WriteAllText(file, header + string.Join(Environment.NewLine, _session), new UTF8Encoding(true));
        return file;
    }
    private void ExportReport_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            string file = WriteReport();
            Log("Informe exportado: " + file);
            Info("Informe guardado:\n" + file);
        }
        catch (Exception ex) { Warn("No se pudo exportar: " + ex.Message); }
    }
    private void OpenReportFolder_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Directory.CreateDirectory(ReportDirectory);
            Process.Start(new ProcessStartInfo(ReportDirectory) { UseShellExecute = true });
        }
        catch (Exception ex) { Warn(ex.Message); }
    }

    public sealed class Identity { public string Center { get; set; } = ""; public string Station { get; set; } = ""; }
    private sealed class PcInfo
    {
        public string Machine = "", Windows = "", Architecture = "", Cpu = "", LibreOffice = "";
        public bool IsWindows7;
        public long RamMb;
        public int RamUsedPercent;
        public double DiskFreeGb;
    }
    private sealed class Software
    {
        public string Name { get; set; } = "";
        public string Version { get; set; } = "";
        public string UninstallCommand { get; set; } = "";
        public string Guid { get; set; } = "";
        public bool Msi, IsAntivirus, Is64Bit;
        public string Display => (IsAntivirus ? "[POSIBLE ANTIVIRUS] " : "") + Name +
                                 (Version.Length > 0 ? $"  ({Version})" : "");
    }
}
