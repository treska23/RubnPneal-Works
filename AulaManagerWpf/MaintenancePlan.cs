using System.Collections.Generic;
using System.Linq;

namespace AulaManagerWpf;

public partial class MainWindow
{
    private sealed class MaintenancePlan
    {
        public bool UserTemp, SystemTemp, Ceip, ExportReport, UpdateLibre;
        public string[] Services = new string[0];
        public bool ChangesSystem => SystemTemp || Ceip || Services.Length > 0;
        public bool HasTasks => UserTemp || SystemTemp || Ceip || UpdateLibre || Services.Length > 0;

        public static MaintenancePlan All() => new MaintenancePlan {
            UserTemp = true, SystemTemp = true, Ceip = true, ExportReport = true, UpdateLibre = true,
            Services = (string[])ServicesAllowlist.Clone()
        };

        public string Describe()
        {
            var tasks = new List<string>();
            if (UserTemp) tasks.Add("• Limpiar temporales del usuario de más de 7 días.");
            if (SystemTemp) tasks.Add("• Limpiar temporales de Windows de más de 7 días.");
            if (Ceip) tasks.Add("• Desactivar CEIP/SQM, guardando el estado anterior.");
            if (Services.Length > 0) tasks.Add("• Deshabilitar con respaldo: " + string.Join(", ", Services) + ".");
            if (Services.Contains("TabletInputService")) tasks.Add("  TabletInputService puede afectar la entrada táctil.");
            if (Services.Contains("RemoteRegistry")) tasks.Add("  RemoteRegistry puede afectar la administración remota.");
            if (UpdateLibre) tasks.Add("• Buscar, descargar, verificar e instalar LibreOffice compatible. Guarda y cierra tus documentos. En Windows 7/8 se usa la última serie compatible, 25.2, archivada.");
            if (ExportReport) tasks.Add("• Actualizar el inventario y guardar el informe final.");
            return string.Join("\n", tasks);
        }
    }

    private MaintenancePlan SelectedMaintenance()
    {
        var services = new List<string>();
        if (DiagCheck.IsChecked == true) services.AddRange(ServicesAllowlist.Take(2));
        if (ServicesCheck.IsChecked == true) services.AddRange(new[] { "Fax", "WMPNetworkSvc" });
        if (TabletCheck.IsChecked == true) services.Add("TabletInputService");
        if (RemoteCheck.IsChecked == true) services.Add("RemoteRegistry");
        return new MaintenancePlan {
            UserTemp = TempCheck.IsChecked == true, SystemTemp = SystemTempCheck.IsChecked == true,
            Ceip = CeipCheck.IsChecked == true, Services = services.Distinct().ToArray(),
            UpdateLibre = UpdateLibreCheck.IsChecked == true
        };
    }
}
