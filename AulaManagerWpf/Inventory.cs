using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Runtime.InteropServices;

namespace AulaManagerWpf;

public partial class MainWindow
{
    [StructLayout(LayoutKind.Sequential)]
    private struct MemoryStatus
    {
        public uint Length, MemoryLoad;
        public ulong TotalPhys, AvailPhys, TotalPageFile, AvailPageFile;
        public ulong TotalVirtual, AvailVirtual, AvailExtendedVirtual;
    }
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx(ref MemoryStatus buffer);

    private static PcInfo Inspect()
    {
        var p = new PcInfo
        {
            Machine = Environment.MachineName,
            Architecture = Environment.Is64BitOperatingSystem ? "64 bits" : "32 bits",
            IsWindows7 = Environment.OSVersion.Version.Major == 6 && Environment.OSVersion.Version.Minor == 1
        };
        using (var nt = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion"))
            p.Windows = nt?.GetValue("ProductName")?.ToString() ?? Environment.OSVersion.VersionString;
        p.Windows += $" (build {Environment.OSVersion.Version.Build})";
        using (var cpu = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0"))
            p.Cpu = cpu?.GetValue("ProcessorNameString")?.ToString()?.Trim() ?? "No detectado";
        MemoryStatus mem = new() { Length = (uint)Marshal.SizeOf<MemoryStatus>() };
        if (GlobalMemoryStatusEx(ref mem))
        {
            p.RamMb = (long)(mem.TotalPhys / (1024UL * 1024UL));
            p.RamUsedPercent = (int)mem.MemoryLoad;
        }
        try
        {
            var root = Path.GetPathRoot(Environment.SystemDirectory) ?? "C:\\";
            p.DiskFreeGb = new DriveInfo(root).AvailableFreeSpace / 1073741824.0;
        }
        catch { p.DiskFreeGb = 0; }
        p.LibreOffice = FindSoftware()
            .FirstOrDefault(x => x.Name.StartsWith("LibreOffice", StringComparison.OrdinalIgnoreCase))
            ?.Display ?? "No detectado";
        return p;
    }

    private static readonly string[] AvKeywords =
    {
        "avast free antivirus", "avast premium security", "avg antivirus",
        "avg internet security", "avira security", "norton", "mcafee",
        "kaspersky", "eset", "bitdefender", "panda dome", "sophos",
        "trend micro", "360 total security", "webroot", "f-secure",
        "g data", "malwarebytes", "antivirus", "internet security"
    };
    private static List<Software> FindSoftware()
    {
        var results = new List<Software>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        void Visit(RegistryHive hive, RegistryView view)
        {
            try
            {
                using var h = RegistryKey.OpenBaseKey(hive, view);
                using var uninstall = h.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
                if (uninstall == null) return;
                foreach (string subname in uninstall.GetSubKeyNames())
                {
                    using var k = uninstall.OpenSubKey(subname);
                    var name = k?.GetValue("DisplayName")?.ToString() ?? "";
                    if (string.IsNullOrWhiteSpace(name) || Convert.ToString(k?.GetValue("SystemComponent")) == "1")
                        continue;
                    var version = k?.GetValue("DisplayVersion")?.ToString() ?? "";
                    var cmd = k?.GetValue("UninstallString")?.ToString() ?? "";
                    if (!seen.Add(name + "|" + version + "|" + subname)) continue;
                    results.Add(new Software
                    {
                        Name = name,
                        Version = version,
                        UninstallCommand = cmd,
                        Guid = Guid.TryParse(subname, out var id) ? id.ToString("B") : "",
                        Msi = Convert.ToString(k?.GetValue("WindowsInstaller")) == "1",
                        Is64Bit = view == RegistryView.Registry64,
                        IsAntivirus = AvKeywords.Any(word => name.IndexOf(word, StringComparison.OrdinalIgnoreCase) >= 0)
                    });
                }
            }
            catch { /* Otros programas todavía pueden inventariarse. */ }
        }
        Visit(RegistryHive.LocalMachine, RegistryView.Registry32);
        if (Environment.Is64BitOperatingSystem) Visit(RegistryHive.LocalMachine, RegistryView.Registry64);
        Visit(RegistryHive.CurrentUser, RegistryView.Default);
        return results.OrderByDescending(x => x.IsAntivirus).ThenBy(x => x.Name).ToList();
    }

    private async Task RefreshSoftwareAsync()
    {
        _installed = await Task.Run(FindSoftware);
        SoftwareList.ItemsSource = null;
        SoftwareList.ItemsSource = _installed;
    }
}