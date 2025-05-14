import { CurrencyPipe, NgClass } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ChangeDetectorRef,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatRippleModule } from "@angular/material/core";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { Router } from "@angular/router";
import { TranslocoModule } from "@ngneat/transloco";
import { AnalyticsService } from "app/modules/admin/dashboards/analytics/analytics.service";
import { ApexOptions, NgApexchartsModule } from "ng-apexcharts";
import { Subject, take, takeUntil } from "rxjs";
import { User } from "app/core/user/user.types";
import { UserService } from "app/core/user/user.service";
import { UsersService } from "../../security/users/users.service";
import { SalesService } from "../sales/sales.services";
import { CommonModule } from "@angular/common";
import { PresenceService } from "app/presence.service";
@Component({
  selector: "analytics",
  templateUrl: "./analytics.component.html",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslocoModule,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatMenuModule,
    MatTabsModule,
    MatButtonToggleModule,
    NgApexchartsModule,
    MatTableModule,
    NgClass,
    CurrencyPipe,
    CommonModule,
  ],
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  chartGithubIssues: ApexOptions = {};
  chartTaskDistribution: ApexOptions = {};
  chartBudgetDistribution: ApexOptions = {};
  chartWeeklyExpenses: ApexOptions = {};
  chartMonthlyExpenses: ApexOptions = {};
  chartYearlyExpenses: ApexOptions = {};
  data: any;
  selectedProject: string = "Informacion general";
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  users: any[] = [];

  //informacion de usuario logeado
  user: User;

  analiticaData: any[] = [];
  salesData: any[] = [];

  chartSales: ApexOptions = {};
  connectedUsers: string[] = [];

  /**
   * Constructor
   */
  constructor(
    private _projectService: AnalyticsService,
    private _router: Router,
    private _userService: UserService,
    private _usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private _salesService: SalesService,
    private presenceService: PresenceService
  ) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the data
    this._projectService.data$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((data) => {
        // Store the data
        this.data = data;

        // Prepare the chart data
        this._prepareChartData();
      });

    // Subscribe to the user service
    this._userService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((user: User) => {
        this.user = user["usuario"];
      });

    // Attach SVG fill fixer to all ApexCharts
    window["Apex"] = {
      chart: {
        events: {
          mounted: (chart: any, options?: any): void => {
            this._fixSvgFill(chart.el);
          },
          updated: (chart: any, options?: any): void => {
            this._fixSvgFill(chart.el);
          },
        },
      },
    };

    this.getUsers();
    this.getAnalitica();
    this.getSales();
    this.presenceService.onUsuarioConectado()
  .pipe(takeUntil(this._unsubscribeAll))
  .subscribe((newConnectedUsers: string[]) => {

    this.connectedUsers = newConnectedUsers;

    // 🔁 Actualizar la propiedad `online` en los usuarios
    this.users = this.users.map(user => {
      const found: any = newConnectedUsers.find((u: any) => u.userId === user.usuarioId.toString());
      return {
        ...user,
        online: found ? found.status : false // o `null`, según lo que signifique "desconectado"
      };
    });
    this.cdr.detectChanges(); // Forzar actualización en la vista
  });
  }

  getAnalitica(): void {
    this._projectService.getAnalitica().subscribe((analitica) => {
      this.analiticaData = analitica;
      this.cdr.detectChanges(); // Forzar actualización en la vista
    });
  }

  getUsers(): void {
    this._usersService.getUsers().subscribe((users) => {
      // Primero, filtramos por roles/activo
      let filteredUsers = users.filter(
        (user) => user.rolId !== 3 && user.activo !== false
      );
  
      // Ahora obtenemos la lista de conectados desde PresenceService
      this.presenceService.connectedUsers$.pipe(take(1)).subscribe((connectedIds) => {
        // Marcamos cada usuario como online si está en la lista
        this.users = filteredUsers.map(user => {
          const found :any = connectedIds.find((u:any) => u.userId === user.usuarioId.toString());
          if (found) {
          return {
            ...user,
            online: found.status
          };
          }
          else {
            return {
              ...user,
              online: ""
            };
          }
          
        });
        this.cdr.detectChanges(); // Forzar actualización en la vista
      });
    });
  }

  getSales() {
    this._salesService.getVentas().subscribe((sales:any) => {
      // Aquí puedes manejar los datos de las ventas
      this.salesData = sales.data;
      this.prepateChartSales();
    });
  }

  getSalesSeries() {
    // Agrupar las ventas por unidad de negocio
    const groupedData = this.salesData.reduce((acc, sale) => {
      const key = sale.unidadDeNegocioNombre;
      if (!acc[key]) {
        acc[key] = { total: 0, pendiente: 0 };
      }
      acc[key].total += sale.total;
      acc[key].pendiente += sale.pendiente;
      return acc;
    }, {});

    // Preparar las series para el gráfico
    const categories = Object.keys(groupedData);
    const totalData = categories.map((category) => groupedData[category].total);
    const pendienteData = categories.map(
      (category) => groupedData[category].pendiente
    );

    return [
      { name: "Total", data: totalData },
      { name: "Pendiente", data: pendienteData },
    ];
  }

  // Obtener las categorías de manera dinámica
  getCategories() {
    const categories = [
      ...new Set(this.salesData.map((sale) => sale.unidadDeNegocioNombre)),
    ];
    return categories;
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Track by function for ngFor loops
   *
   * @param index
   * @param item
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Fix the SVG fill references. This fix must be applied to all ApexCharts
   * charts in order to fix 'black color on gradient fills on certain browsers'
   * issue caused by the '<base>' tag.
   *
   * Fix based on https://gist.github.com/Kamshak/c84cdc175209d1a30f711abd6a81d472
   *
   * @param element
   * @private
   */
  private _fixSvgFill(element: Element): void {
    // Current URL
    const currentURL = this._router.url;

    // 1. Find all elements with 'fill' attribute within the element
    // 2. Filter out the ones that doesn't have cross reference so we only left with the ones that use the 'url(#id)' syntax
    // 3. Insert the 'currentURL' at the front of the 'fill' attribute value
    Array.from(element.querySelectorAll("*[fill]"))
      .filter((el) => el.getAttribute("fill").indexOf("url(") !== -1)
      .forEach((el) => {
        const attrVal = el.getAttribute("fill");
        el.setAttribute(
          "fill",
          `url(${currentURL}${attrVal.slice(attrVal.indexOf("#"))}`
        );
      });
  }

  /**
   * Prepare the chart data from the data
   *
   * @private
   */
  private _prepareChartData(): void {
    // Github issues
    this.chartGithubIssues = {
      chart: {
        fontFamily: "inherit",
        foreColor: "inherit",
        height: "100%",
        type: "line",
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ["#64748B", "#94A3B8"],
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0],
        background: {
          borderWidth: 0,
        },
      },
      grid: {
        borderColor: "var(--fuse-border)",
      },
      labels: this.data.githubIssues.labels,
      legend: {
        show: false,
      },
      plotOptions: {
        bar: {
          columnWidth: "50%",
        },
      },
      series: this.data.githubIssues.series,
      states: {
        hover: {
          filter: {
            type: "darken",
          },
        },
      },
      stroke: {
        width: [3, 0],
      },
      tooltip: {
        followCursor: true,
        theme: "dark",
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        axisTicks: {
          color: "var(--fuse-border)",
        },
        labels: {
          style: {
            colors: "var(--fuse-text-secondary)",
          },
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        labels: {
          offsetX: -16,
          style: {
            colors: "var(--fuse-text-secondary)",
          },
        },
      },
    };

    // Task distribution
    this.chartTaskDistribution = {
      chart: {
        fontFamily: "inherit",
        foreColor: "inherit",
        height: "100%",
        type: "polarArea",
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      labels: this.data.taskDistribution.labels,
      legend: {
        position: "bottom",
      },
      plotOptions: {
        polarArea: {
          spokes: {
            connectorColors: "var(--fuse-border)",
          },
          rings: {
            strokeColor: "var(--fuse-border)",
          },
        },
      },
      series: this.data.taskDistribution.series,
      states: {
        hover: {
          filter: {
            type: "darken",
          },
        },
      },
      stroke: {
        width: 2,
      },
      theme: {
        monochrome: {
          enabled: true,
          color: "#93C5FD",
          shadeIntensity: 0.75,
          shadeTo: "dark",
        },
      },
      tooltip: {
        followCursor: true,
        theme: "dark",
      },
      yaxis: {
        labels: {
          style: {
            colors: "var(--fuse-text-secondary)",
          },
        },
      },
    };

    // Budget distribution
    this.chartBudgetDistribution = {
      chart: {
        fontFamily: "inherit",
        foreColor: "inherit",
        height: "100%",
        type: "radar",
        sparkline: {
          enabled: true,
        },
      },
      colors: ["#818CF8"],
      dataLabels: {
        enabled: true,
        formatter: (val: number): string | number => `${val}%`,
        textAnchor: "start",
        style: {
          fontSize: "13px",
          fontWeight: 500,
        },
        background: {
          borderWidth: 0,
          padding: 4,
        },
        offsetY: -15,
      },
      markers: {
        strokeColors: "#818CF8",
        strokeWidth: 4,
      },
      plotOptions: {
        radar: {
          polygons: {
            strokeColors: "var(--fuse-border)",
            connectorColors: "var(--fuse-border)",
          },
        },
      },
      series: this.data.budgetDistribution.series,
      stroke: {
        width: 2,
      },
      tooltip: {
        theme: "dark",
        y: {
          formatter: (val: number): string => `${val}%`,
        },
      },
      xaxis: {
        labels: {
          show: true,
          style: {
            fontSize: "12px",
            fontWeight: "500",
          },
        },
        categories: this.data.budgetDistribution.categories,
      },
      yaxis: {
        max: (max: number): number => parseInt((max + 10).toFixed(0), 10),
        tickAmount: 7,
      },
    };

    // Weekly expenses
    this.chartWeeklyExpenses = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: "inherit",
        foreColor: "inherit",
        height: "100%",
        type: "line",
        sparkline: {
          enabled: true,
        },
      },
      colors: ["#22D3EE"],
      series: this.data.weeklyExpenses.series,
      stroke: {
        curve: "smooth",
      },
      tooltip: {
        theme: "dark",
      },
      xaxis: {
        type: "category",
        categories: this.data.weeklyExpenses.labels,
      },
      yaxis: {
        labels: {
          formatter: (val): string => `$${val}`,
        },
      },
    };

    // Monthly expenses
    this.chartMonthlyExpenses = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: "inherit",
        foreColor: "inherit",
        height: "100%",
        type: "line",
        sparkline: {
          enabled: true,
        },
      },
      colors: ["#4ADE80"],
      series: this.data.monthlyExpenses.series,
      stroke: {
        curve: "smooth",
      },
      tooltip: {
        theme: "dark",
      },
      xaxis: {
        type: "category",
        categories: this.data.monthlyExpenses.labels,
      },
      yaxis: {
        labels: {
          formatter: (val): string => `$${val}`,
        },
      },
    };

    // Yearly expenses
    this.chartYearlyExpenses = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: "inherit",
        foreColor: "inherit",
        height: "100%",
        type: "line",
        sparkline: {
          enabled: true,
        },
      },
      colors: ["#FB7185"],
      series: this.data.yearlyExpenses.series,
      stroke: {
        curve: "smooth",
      },
      tooltip: {
        theme: "dark",
      },
      xaxis: {
        type: "category",
        categories: this.data.yearlyExpenses.labels,
      },
      yaxis: {
        labels: {
          formatter: (val): string => `$${val}`,
        },
      },
    };
  }

  getColorClass(estatusId: number): string {
    switch (estatusId) {
      case 1:
        return "text-yellow-500"; // Pendiente
      case 2:
        return "text-green-500"; // Aprobada
      case 3:
        return "text-red-500"; // Rechazada
      case 4:
        return "text-blue-500"; // En Proceso
      case 5:
        return "text-purple-500"; // Finalizada
      default:
        return "text-gray-500";
    }
  }

  prepateChartSales(): void {
    //sales chart
    this.chartSales = {
      chart: {
        type: 'bar',
        height: 350,
        stacked: false
      },
      colors: ['#008FFB', '#FF4560'],
      dataLabels: {
        enabled: true
      },
      markers: {
        size: 4
      },
      plotOptions: {
        bar: {
          columnWidth: '40%',
          distributed: true
        }
      },
      series: this.getSalesSeries(),
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      tooltip: {
        shared: true,
        intersect: false
      },
      xaxis: {
        categories: this.getCategories()
      },
      yaxis: {
        title: {
          text: 'Monto'
        }
      }
    };
    this.cdr.detectChanges(); // Forzar actualización en la vista
    }
}
