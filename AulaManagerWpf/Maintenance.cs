using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Threading.Tasks;

namespace AulaManagerWpf;

public partial class MainWindow
{
    private sealed class TempResult { public readonly int Scanned, Changed, Errors; public readonly long Bytes; public TempResult(int scanned, int changed, int errors, long bytes) { Scanned = scanned; Changed = changed; Errors = errors; Bytes = bytes; } }
    private static TempResult CleanTemp(bool preview, bool includeSystem, bool includeUser = true)
    {
        var roots = new List<string>();
        if (includeUser) roots.Add(Path.GetTempPath());
        if (includeSystem) roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Temp"));
        int scanned = 0, changed = 0, errors = 0;
        long bytes = 0;
        var cutoff = DateTime.Now.AddDays(-7);
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var root in roots)
        {
            var queue = new Stack<(string Path, int Depth)>();
            queue.Push((root, 0));
            while (queue.Count > 0)
            {
                var (dir, depth) = queue.Pop();
                if (depth > 12 || !visited.Add(dir)) continue;
                try
                {
                    if ((File.GetAttributes(dir) & FileAttributes.ReparsePoint) != 0) continue;
                    foreach (var item in Directory.EnumerateFileSystemEntries(dir))
                    {
                        try
                        {
                            var attributes = File.GetAttributes(item);
                            if ((attributes & FileAttributes.ReparsePoint) != 0) continue;
                            if ((attributes & FileAttributes.Directory) != 0)
                            { queue.Push((item, depth + 1)); continue; }
                            scanned++;
                            var info = new FileInfo(item);
                            if (info.LastWriteTime >= cutoff) continue;
                            var length = info.Length;
                            if (!preview) File.Delete(item);
                            changed++;
                            bytes += length;
                        }
                        catch (IOException) { errors++; }
                        catch (UnauthorizedAccessException) { errors++; }
                        catch (Exception) { errors++; }
                    }
                }
                catch (IOException) { errors++; }
                catch (UnauthorizedAccessException) { errors++; }
                catch (Exception) { errors++; }
            }
        }
        return new TempResult(scanned, changed, errors, bytes);
    }
    private async void Preview_Click(object sender, RoutedEventArgs e)
    {
        bool includeSystem = SystemTempCheck.IsChecked == true;
        TempResult result = null!;
        await RunBusyAsync(async () => result = await Task.Run(() => CleanTemp(true, includeSystem)));
        if (result == null) return;
        Log($"Vista previa: {result.Changed} temporales de más de 7 días, {result.Bytes / 1048576.0:N1} MiB, {result.Errors} incidencias.");
        Info($"Archivos candidatos: {result.Changed}\nEspacio aproximado: {result.Bytes / 1048576.0:N1} MiB\nNo se ha eliminado nada.");
    }

    public sealed class Backup
    {
        public Dictionary<string, int> Services { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public int? Ceip { get; set; }
        public bool CeipAbsent { get; set; }
        public bool CeipSaved { get; set; }
    }
    private Backup ReadBackup()
    {
        try
        {
            return File.Exists(BackupPath)
                ? new JavaScriptSerializer().Deserialize<Backup>(File.ReadAllText(BackupPath)) ?? new Backup()
                : new Backup();
        }
        catch { return new Backup(); }
    }
    private bool SaveBackup(Backup state)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(BackupPath)!);
            File.WriteAllText(BackupPath, new JavaScriptSerializer().Serialize(state),
                new UTF8Encoding(false));
            return true;
        }
        catch (Exception ex) { Warn("No se pudo guardar el estado previo: " + ex.Message); return false; }
    }
    private static readonly string[] ServicesAllowlist =
    {
        "DiagTrack", "dmwappushservice", "Fax", "WMPNetworkSvc",
        "TabletInputService", "RemoteRegistry"
    };
    private bool NeedAdminAndStation()
    {
        if (string.IsNullOrWhiteSpace(CenterBox.Text) || string.IsNullOrWhiteSpace(StationBox.Text))
        { Warn("Identifica centro y puesto físico en Resumen antes de modificar servicios."); return false; }
        if (!_isAdmin)
        { Warn("Necesitas permisos de administrador. Reinicia con el botón del Resumen."); return false; }
        return true;
    }
    private bool ChangeService(string name, bool disable, Backup backup)
    {
        if (!ServicesAllowlist.Contains(name, StringComparer.OrdinalIgnoreCase)) return false;
        var registryPath = $@"SYSTEM\CurrentControlSet\Services\{name}";
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(registryPath, writable: true);
            if (key?.GetValue("Start") is not int original)
            {
                Log($"Servicio ausente o inaccesible: {name}");
                return false;
            }
            if (disable && !backup.Services.ContainsKey(name))
            {
                backup.Services[name] = original;
                if (!SaveBackup(backup)) return false;
            }
            if (!disable && !backup.Services.ContainsKey(name)) return false;
            int target = disable ? 4 : backup.Services[name];
            if (target < 0 || target > 4) return false;
            key.SetValue("Start", target, RegistryValueKind.DWord);
            bool applied = Convert.ToInt32(key.GetValue("Start", -1)) == target;
            Log($"Servicio {name}: {(applied ? (disable ? "deshabilitado" : "restaurado") : "NO VERIFICADO")}. Inicio: {target}.");
            return applied;
        }
        catch (Exception ex) { Log($"Error de servicio {name}: {ex.Message}"); return false; }
    }
    private bool ChangeCeip(bool restore, Backup backup)
    {
        const string registryPath = @"SOFTWARE\Microsoft\SQMClient\Windows";
        try
        {
            using var machine = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, Environment.Is64BitOperatingSystem ? RegistryView.Registry64 : RegistryView.Registry32);
            using var key = machine.CreateSubKey(registryPath, writable: true);
            if (key == null) return false;
            var old = key.GetValue("CEIPEnable");
            if (!restore)
            {
                if (!backup.CeipSaved)
                {
                    backup.CeipSaved = true;
                    backup.CeipAbsent = old is null;
                    backup.Ceip = old is int n ? n : null;
                    if (!SaveBackup(backup)) return false;
                }
                key.SetValue("CEIPEnable", 0, RegistryValueKind.DWord);
            }
            else
            {
                if (!backup.CeipSaved) return false;
                if (backup.CeipAbsent) key.DeleteValue("CEIPEnable", false);
                else if (backup.Ceip.HasValue) key.SetValue("CEIPEnable", backup.Ceip.Value, RegistryValueKind.DWord);
                else return false;
            }
            Log(restore ? "CEIP restaurado." : "CEIP desactivado. No equivale a eliminar toda la telemetría.");
            return true;
        }
        catch (Exception ex) { Log("Error ajustando CEIP: " + ex.Message); return false; }
    }
    private async void Apply_Click(object sender, RoutedEventArgs e)
    {
        await ExecuteMaintenanceAsync(SelectedMaintenance(), false);
    }
    private async void RunAll_Click(object sender, RoutedEventArgs e)
    {
        await ExecuteMaintenanceAsync(MaintenancePlan.All(), true);
    }
    private async Task ExecuteMaintenanceAsync(MaintenancePlan plan, bool all)
    {
        if (_busy) return;
        if (!plan.HasTasks) { Warn("No hay tareas seleccionadas."); return; }
        if (plan.ChangesSystem && !NeedAdminAndStation()) return;
        if (!Confirm((all ? "¿Hacer todo el mantenimiento de este puesto?\n\n" : "¿Ejecutar las tareas seleccionadas?\n\n") +
            plan.Describe() + "\n\nLos temporales eliminados no se pueden recuperar. Los servicios y CEIP se respaldan antes de modificarlos."))
            return;
        SaveIdentity();
        await RunBusyAsync(async () => {
            var backup = ReadBackup();
            int success = 0, failure = 0;
            Log(all ? "Inicio de TODO el mantenimiento." : "Inicio de mantenimiento seleccionado.");
            Log(plan.Describe());
            if (plan.UserTemp || plan.SystemTemp)
            {
                StatusText.Text = "Limpiando temporales…";
                var temp = await Task.Run(() => CleanTemp(false, plan.SystemTemp, plan.UserTemp));
                Log($"Temporales eliminados: {temp.Changed} · {temp.Bytes / 1048576.0:N1} MiB · {temp.Errors} incidencias.");
                success += temp.Changed; failure += temp.Errors;
            }
            foreach (var name in plan.Services)
            {
                StatusText.Text = "Configurando " + name + "…";
                await Task.Yield();
                if (ChangeService(name, true, backup)) success++; else failure++;
            }
            if (plan.Ceip)
            {
                StatusText.Text = "Configurando CEIP/SQM…";
                await Task.Yield();
                if (ChangeCeip(false, backup)) success++; else failure++;
            }
            if (plan.UpdateLibre)
            {
                try { await UpdateLibreOfficeAsync(); success++; }
                catch (Exception ex) { failure++; Log("No se completó la actualización de LibreOffice: " + ex.Message); }
            }
            if (plan.ExportReport)
            {
                StatusText.Text = "Actualizando inventario…";
                await RefreshInventoryAsync();
                await RefreshSoftwareAsync();
            }
            Log($"Mantenimiento terminado: {success} cambios y archivos, {failure} incidencias.");
            string report = "";
            if (plan.ExportReport)
            {
                StatusText.Text = "Guardando informe…";
                report = WriteReport();
                Log("Informe de mantenimiento guardado: " + report);
            }
            StatusText.Text = failure == 0 ? "Mantenimiento terminado" : "Terminado con incidencias";
            Info($"Mantenimiento terminado.\nCambios y archivos: {success}\nIncidencias: {failure}\n" +
                (report.Length > 0 ? "Informe guardado:\n" + report : "Consulta el registro."));
        });
    }
    private void Restore_Click(object sender, RoutedEventArgs e)
    {
        if (!NeedAdminAndStation() || !Confirm("¿Restaurar los servicios de ESTE puesto desde su copia?")) return;
        var backup = ReadBackup();
        int ok = 0, fail = 0;
        foreach (var name in backup.Services.Keys.ToList())
            if (ChangeService(name, false, backup)) ok++; else fail++;
        Log($"Restauración de servicios: {ok} restaurados, {fail} errores.");
        Info($"Servicios restaurados: {ok}\nErrores: {fail}");
    }
    private void RestoreCeip_Click(object sender, RoutedEventArgs e)
    {
        if (!NeedAdminAndStation() || !Confirm("¿Restaurar CEIP desde la copia del puesto?")) return;
        Info(ChangeCeip(true, ReadBackup()) ? "CEIP restaurado." : "No se pudo restaurar CEIP. Revisa el registro.");
    }
}
