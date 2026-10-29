using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.IO;
using System.Windows;

namespace AulaManagerWpf;

public partial class MainWindow
{
    private void ChooseLibre_Click(object sender, RoutedEventArgs e)
    {
        var picker = new OpenFileDialog
        {
            Filter = "Instalador MSI de LibreOffice (*.msi)|*.msi",
            CheckFileExists = true,
            Title = "Elegir instalador oficial de LibreOffice"
        };
        if (picker.ShowDialog() == true)
        {
            _installerMsi = picker.FileName;
            LibreInstallerBox.Text = _installerMsi;
        }
    }
    private void RunLibre_Click(object sender, RoutedEventArgs e)
    {
        if (!File.Exists(_installerMsi) ||
            Path.GetFileName(_installerMsi).IndexOf("LibreOffice", StringComparison.OrdinalIgnoreCase) < 0)
        {
            Warn("Selecciona un instalador MSI de LibreOffice válido.");
            return;
        }
        var version = LibreVersion(Path.GetFileName(_installerMsi));
        if (version == null || (IsLegacyLibre(Environment.OSVersion.Version) && !IsLegacyLibreCompatible(version)))
        {
            Warn("Ese instalador no corresponde a una versión compatible. Usa Actualizar automáticamente.");
            return;
        }
        if (!Confirm("¿Abrir este instalador de LibreOffice?\n\nComprueba su firma, arquitectura e idioma. Guarda todos los documentos antes de iniciar."))
            return;
        try
        {
            var psi = new ProcessStartInfo("msiexec.exe") { UseShellExecute = true, Verb = "runas" };
            psi.Arguments = "/i " + QuoteArgument(_installerMsi) + " /passive /norestart";
            Process.Start(psi);
            Log("Instalador LibreOffice iniciado. Resultado PENDIENTE de verificación.");
            Info("Instalador abierto. Verifica la versión de LibreOffice al terminar.");
        }
        catch (Exception ex)
        {
            Log("No se inició MSI LibreOffice: " + ex.Message);
            Warn(ex.Message);
        }
    }
    private void LibreWebsite_Click(object sender, RoutedEventArgs e)
    {
        Process.Start(new ProcessStartInfo("https://es.libreoffice.org/descarga/libreoffice/") { UseShellExecute = true });
    }
    private void ChooseIso_Click(object sender, RoutedEventArgs e)
    {
        using var picker = new System.Windows.Forms.FolderBrowserDialog
        {
            Description = "Selecciona la carpeta raíz del USB o de la ISO extraída",
            ShowNewFolderButton = false
        };
        if (picker.ShowDialog() == System.Windows.Forms.DialogResult.OK)
        {
            _isoFolder = picker.SelectedPath;
            InstallerFolderBox.Text = _isoFolder;
            MigrationResultText.Text = "";
        }
    }
    private bool VerifyIso(out string result)
    {
        if (string.IsNullOrWhiteSpace(_isoFolder) || !File.Exists(Path.Combine(_isoFolder, "setup.exe")))
        {
            result = "No se encuentra setup.exe en la carpeta seleccionada.";
            return false;
        }
        var sources = Path.Combine(_isoFolder, "sources");
        if (!File.Exists(Path.Combine(sources, "install.wim")) && !File.Exists(Path.Combine(sources, "install.esd")))
        {
            result = "No se encuentra sources\\install.wim ni sources\\install.esd.";
            return false;
        }
        if (_pc.DiskFreeGb < 25)
        {
            result = "Hay menos de 25 GB libres. No se recomienda iniciar la actualización.";
            return false;
        }
        if (_pc.RamMb < 1900)
        {
            result = "El equipo tiene menos de 2 GB RAM. Comprueba los requisitos.";
            return false;
        }
        result = "Medio reconocido. Antes de continuar comprueba por separado edición, idioma, arquitectura y licencia. El instalador de Microsoft determina la compatibilidad final.";
        return true;
    }
    private void CheckIso_Click(object sender, RoutedEventArgs e)
    {
        bool result = VerifyIso(out var message);
        MigrationResultText.Text = message;
        Log("Comprobación de medios: " + (result ? "reconocido" : "bloqueado") + ". " + message);
    }
    private void LaunchMigration_Click(object sender, RoutedEventArgs e)
    {
        if (!VerifyIso(out var validation))
        {
            Warn(validation);
            return;
        }
        if (BackupCheck.IsChecked != true || LicenseCheck.IsChecked != true)
        {
            Warn("Primero confirma la copia de seguridad, la licencia y la compatibilidad del medio.");
            return;
        }
        if (!Confirm("¿Abrir setup.exe desde Windows?\n\nAula Manager no reparticiona ni formatea. La instalación es responsabilidad del asistente de Microsoft y requiere una copia de seguridad."))
            return;
        try
        {
            Process.Start(new ProcessStartInfo(Path.Combine(_isoFolder, "setup.exe"))
            {
                UseShellExecute = true,
                Verb = "runas",
                WorkingDirectory = _isoFolder
            });
            Log("Instalador de Windows iniciado. Migración PENDIENTE de verificación.");
        }
        catch (Exception ex)
        {
            Log("No se inició instalador de Windows: " + ex.Message);
            Warn(ex.Message);
        }
    }
}