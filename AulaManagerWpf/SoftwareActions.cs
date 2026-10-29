using System;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows;

namespace AulaManagerWpf;

public partial class MainWindow
{
    [DllImport("shell32.dll", SetLastError = true)]
    private static extern IntPtr CommandLineToArgvW([MarshalAs(UnmanagedType.LPWStr)] string command, out int argc);
    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    private async void RefreshSoftware_Click(object sender, RoutedEventArgs e)
    {
        await RunBusyAsync(RefreshSoftwareAsync);
        Log($"Listado actualizado: {_installed.Count} programas encontrados.");
    }
    private void ControlPanel_Click(object sender, RoutedEventArgs e)
    {
        try { Process.Start(new ProcessStartInfo("control.exe", "appwiz.cpl") { UseShellExecute = true }); }
        catch (Exception ex) { Warn(ex.Message); }
    }
    private void Uninstall_Click(object sender, RoutedEventArgs e)
    {
        if (SoftwareList.SelectedItem is not Software selected)
        {
            Warn("Selecciona un programa del listado.");
            return;
        }
        var message = $"¿Abrir el desinstalador de «{selected.Name}»?\n\nAl terminar, comprueba si sigue registrado.";
        if (selected.IsAntivirus)
            message += "\n\nAVISO: no retires la última protección de un equipo sin alternativa.";
        if (!Confirm(message)) return;
        try
        {
            if (selected.Msi && !string.IsNullOrWhiteSpace(selected.Guid))
            {
                var msi = new ProcessStartInfo("msiexec.exe") { UseShellExecute = true, Verb = "runas" };
                msi.Arguments = "/x " + QuoteArgument(selected.Guid);
                Process.Start(msi);
            }
            else
            {
                if (string.IsNullOrWhiteSpace(selected.UninstallCommand))
                {
                    Warn("No hay desinstalador registrado. Usa Programas de Windows.");
                    return;
                }
                var parsed = CommandLineToArgvW(Environment.ExpandEnvironmentVariables(selected.UninstallCommand), out int argc);
                if (parsed == IntPtr.Zero || argc < 1)
                {
                    Warn("Comando de desinstalación no interpretable.");
                    return;
                }
                string[] args;
                try
                {
                    args = Enumerable.Range(0, argc)
                        .Select(i => Marshal.PtrToStringUni(Marshal.ReadIntPtr(parsed, i * IntPtr.Size)) ?? "")
                        .ToArray();
                }
                finally { LocalFree(parsed); }
                string exe = args[0];
                if (!exe.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ||
                    exe.EndsWith("cmd.exe", StringComparison.OrdinalIgnoreCase) ||
                    exe.EndsWith("powershell.exe", StringComparison.OrdinalIgnoreCase))
                {
                    Warn("Por seguridad abre este programa desde Programas de Windows.");
                    return;
                }
                var start = new ProcessStartInfo(exe) { UseShellExecute = true, Verb = "runas" };
                start.Arguments = string.Join(" ", args.Skip(1).Select(QuoteArgument));
                Process.Start(start);
            }
            Log($"Desinstalador iniciado para {selected.Name}. Eliminación PENDIENTE de verificación.");
            Info("Desinstalador abierto. Al terminar, actualiza el listado y verifica el resultado.");
        }
        catch (Exception ex)
        {
            Log($"No se inició la desinstalación de {selected.Name}: {ex.Message}");
            Warn("No se pudo iniciar: " + ex.Message);
        }
    }
}