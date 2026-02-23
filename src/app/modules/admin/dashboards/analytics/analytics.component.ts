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
import * as L from "leaflet";
import { MatSelectModule } from "@angular/material/select";
import { MatTabChangeEvent } from "@angular/material/tabs";
import { FormsModule } from '@angular/forms';
import { HighchartsChartModule, HighchartsChartComponent } from 'highcharts-angular';
import { TaskService } from "app/modules/admin/dashboards/tasks/tasks.service";

import * as Highcharts from 'highcharts';
import HC_funnel from 'highcharts/modules/funnel';
import { ViewChild } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormGroup, FormControl } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from "@angular/common/http";
// Registrar español
registerLocaleData(localeEs);

// Inicializar el módulo
HC_funnel(Highcharts);

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
    MatSelectModule,
    FormsModule,
    HighchartsChartModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    ReactiveFormsModule
  ],
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  chartYearlyExpenses: ApexOptions = {};
  data: any;
  selectedProject: string = "Informacion general";
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  users: any[] = [];

  googleEvents: any[] = [];
  tasksSummary: any = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0
  };
  filteredEvents: any[] = [];
  calendarView: 'day' | 'week' | 'month' | 'custom' = 'day';
  selectedDate: Date = new Date();
  viewRangeTitle: string = '';
  chartTaskDistribution: ApexOptions = {};

  //informacion de usuario logeado
  user: User;

  analiticaData: any[] = [];
  salesData: any[] = [];

  chartSales: ApexOptions = {};
  connectedUsers: string[] = [];

  map!: L.Map;

  tipoSeleccionado: string = "cliente";
  marcadores: L.Marker[] = [];
  marker: any;

  proyectosSeries: ApexNonAxisChartSeries = [];
  proyectosLabels: string[] = [];

  cotizacionesSeries: ApexNonAxisChartSeries = [];
  cotizacionesLabels: string[] = [];

  productosSeries: ApexNonAxisChartSeries = [];
  productosLabels: string[] = [];

  chartOptions = {
    chart: { type: "donut", height: 300 },
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '50%' } } }
  };



  unidadesNegocio = [
    { UnidadId: 1, Nombre: 'Querétaro' },
    { UnidadId: 2, Nombre: 'Puebla' },
    { UnidadId: 3, Nombre: 'Hidalgo' },
  ];

  Highcharts: typeof Highcharts = Highcharts;
  chartOptionsEmbudo: Highcharts.Options = {
    chart: {
      type: 'funnel',
      height: 400
    },
    title: {
      text: 'Embudo de Cotizaciones por Unidad de Negocio'
    },
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}'
        },
      }
    },
    series: [{
      type: 'funnel',
      name: 'Hidalgo',
      data: [
        // Total por unidad (primer nivel)
        { name: 'Total', y: 1365, color: '#7cb5ec' },

        // Desglose por estatus (segundo nivel)
        { name: 'Pendiente', y: 1364, color: '#f7a35c' },
        { name: 'Aprobada', y: 0, color: '#8085e9' },
        { name: 'Rechazada', y: 0, color: '#f15c80' },
        { name: 'Finalizada', y: 0, color: '#e4d354' },
        { name: 'En Proceso', y: 1, color: '#00e396' },
      ]
    }]
  };
  selectedUnidadNegocio: number = this.unidadesNegocio[0].UnidadId; // valor por defecto

  datosEmbudo = [];

  @ViewChild('chartEmbudo', { static: false }) chartEmbudo!: HighchartsChartComponent;

  updateFlag = false; // bandera para forzar actualización

  // Mantener dateRange como objeto
  dateRangeForm = new FormGroup({
    start: new FormControl(new Date()),
    end: new FormControl(new Date())
  });
  // Colores por estatus
  coloresEstatus: { [key: string]: string } = {
    Total: '#7cb5ec',
    Pendiente: '#f7a35c',
    Aprobada: '#8085e9',
    Rechazada: '#f15c80',
    Finalizada: '#e4d354',
    EnProceso: '#00e396'
  };

  // Dentro de tu clase AnalyticsComponent
  formFiltro = new FormGroup({
    unidadNegocio: new FormControl(this.unidadesNegocio[0].UnidadId),
    fecha: new FormGroup({
      start: new FormControl(new Date()),
      end: new FormControl(new Date())
    })
  });

  usuarios: string[] = []; // Lista de nombres de usuario para el combo
  usuarioSeleccionado: string = ''; // Usuario filtrado

  private categorias = [
    { query: "fábrica automotriz", motivo: "Industrias automotrices con alto consumo eléctrico y automatización de procesos." },
    { query: "planta cementera", motivo: "Plantas cementeras requieren alta tensión y mantenimiento eléctrico especializado." },
    { query: "mina", motivo: "Mineras requieren instalaciones eléctricas robustas y seguras." },
    { query: "hotel", motivo: "Hoteles necesitan eficiencia energética, iluminación y automatización." },
    { query: "hospital", motivo: "Hospitales requieren energía confiable para equipos médicos y respaldo." },
    { query: "granja", motivo: "Granjas y empresas ganaderas usan sistemas eléctricos para producción." },
    { query: "parque industrial", motivo: "Parques industriales concentran múltiples empresas con alto potencial B2B." },
    { query: "oficinas", motivo: "Oficinas corporativas demandan cableado estructurado, seguridad y climatización." },
    { query: "centro comercial", motivo: "Centros comerciales requieren alta demanda de electricidad y mantenimiento." }
  ];



  prospectosExistentes: any[] = []; // Para almacenar los prospectos ya existentes

  mostrarFiltros = true; // inicialmente se muestran los filtros
  // 👇 flag para controlar la primera búsqueda
  isFirstSearch = true;

  rutaLayer: L.Polyline | null = null;
  /**
   * Constructor
   */
  constructor(
    private _analyticsService: AnalyticsService,
    private _router: Router,
    private _userService: UserService,
    private _usersService: UsersService,
    private _taskService: TaskService,
    private cdr: ChangeDetectorRef,
    private _salesService: SalesService,
    private presenceService: PresenceService,
    private http: HttpClient
  ) { }

  // -----------------------------------------------------------------------------------------------------
  // @ Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the data
    this._analyticsService.data$
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
        if (this.user) {
          this.getTasksSummary();
          this.getCalendarEvents();
          this._prepareTaskDistributionChart();
        }
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
    this.presenceService
      .onUsuarioConectado()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((newConnectedUsers: string[]) => {
        this.connectedUsers = newConnectedUsers;

        // 🔁 Actualizar la propiedad `online` en los usuarios
        this.users = this.users.map((user) => {
          const found: any = newConnectedUsers.find(
            (u: any) => u.userId === user.usuarioId.toString()
          );
          return {
            ...user,
            online: found ? found.status : false, // o `null`, según lo que signifique "desconectado"
          };
        });
        this.cdr.detectChanges(); // Forzar actualización en la vista
      });
    this.onUnidadNegocioChange();
    this.onBuscar();
  }

  private _prepareTaskDistributionChart(): void {
    this.chartTaskDistribution = {
      chart: {
        type: 'donut',
        height: 350,
        animations: {
          enabled: true,
          speed: 800
        }
      },
      labels: ['Pendientes', 'En Proceso', 'Finalizadas'],
      series: [this.tasksSummary.pending, this.tasksSummary.inProgress, this.tasksSummary.completed],
      colors: ['#f59e0b', '#6366f1', '#10b981'],
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Tareas',
                formatter: () => this.tasksSummary.total.toString()
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'dark'
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      ]
    };
  }

  /**
   * Get tasks summary
   */
  getTasksSummary(): void {
    if (!this.user?.['id'] && !this.user?.['usuarioId']) return;
    const userId = this.user['id'] || this.user['usuarioId'];

    this._taskService.getTasks(userId).subscribe((tasks) => {
      this.tasksSummary = {
        pending: tasks.filter(t => t.estatus === 1).length,
        inProgress: tasks.filter(t => t.estatus === 2).length,
        completed: tasks.filter(t => t.estatus === 3).length,
        total: tasks.length
      };
      this._prepareTaskDistributionChart();
      this.cdr.detectChanges();
    });
  }

  /**
   * Get Google Calendar events
   */
  getCalendarEvents(): void {
    if (!this.user?.['id'] && !this.user?.['usuarioId']) return;
    const userId = this.user['id'] || this.user['usuarioId'];

    // Usar la fecha seleccionada para determinar qué mes cargar
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth() + 1; // JS months are 0-indexed

    this._analyticsService.getGoogleEventsByMonth(userId, year, month).subscribe((events: any) => {
      this.googleEvents = Array.isArray(events) ? events : [];
      this.filterEvents();
      this.cdr.detectChanges();
    });
  }

  /**
   * Filter events based on active view
   */
  filterEvents(): void {
    if (!Array.isArray(this.googleEvents)) {
      this.googleEvents = [];
    }
    const referenceDate = this.selectedDate || new Date();

    if (this.calendarView === 'day' || this.calendarView === 'custom') {
      this.viewRangeTitle = referenceDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      this.filteredEvents = this.googleEvents.filter(e => {
        const start = e.fechaInicio || e.start?.dateTime || e.start?.date || e.start;
        if (!start) return false;
        const eventDate = new Date(start);
        return eventDate.toDateString() === referenceDate.toDateString();
      });
    } else if (this.calendarView === 'week') {
      const startOfWeek = new Date(referenceDate);
      startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      this.viewRangeTitle = `Semana del ${startOfWeek.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al ${endOfWeek.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;

      this.filteredEvents = this.googleEvents.filter(e => {
        const start = e.fechaInicio || e.start?.dateTime || e.start?.date || e.start;
        if (!start) return false;
        const eventDate = new Date(start);
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
      });
    } else if (this.calendarView === 'month') {
      this.viewRangeTitle = referenceDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      this.filteredEvents = this.googleEvents.filter(e => {
        const start = e.fechaInicio || e.start?.dateTime || e.start?.date || e.start;
        if (!start) return false;
        const eventDate = new Date(start);
        return eventDate.getMonth() === referenceDate.getMonth() &&
          eventDate.getFullYear() === referenceDate.getFullYear();
      });
    }

    // Capitalizar primera letra del título para mejor estética
    if (this.viewRangeTitle) {
      this.viewRangeTitle = this.viewRangeTitle.charAt(0).toUpperCase() + this.viewRangeTitle.slice(1);
    }
  }

  /**
   * Get colors for event status
   */
  getStatusColors(status: string): { bg: string, text: string } {
    switch (status) {
      case 'confirmed':
        return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-100' };
      case 'tentative':
        return { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-100' };
      case 'cancelled':
        return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-100' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-700 dark:text-gray-100' };
    }
  }

  /**
   * Get icon for attendee status
   */
  getAttendeeStatusIcon(status: string): string {
    switch (status) {
      case 'accepted':
        return 'heroicons_solid:check-circle';
      case 'declined':
        return 'heroicons_solid:x-circle';
      case 'tentative':
        return 'heroicons_solid:question-mark-circle';
      case 'needsAction':
        return 'heroicons_outline:envelope';
      default:
        return 'heroicons_solid:minus-circle';
    }
  }

  /**
   * Set calendar view
   */
  setCalendarView(view: 'day' | 'week' | 'month' | 'custom'): void {
    this.calendarView = view;
    // If switching to day, and it was custom, keep it. 
    // If switching from custom to day, just call it day.
    if (view === 'day') this.calendarView = 'day';

    this.filterEvents();
    this.cdr.detectChanges();
  }

  onDateChange(date: Date): void {
    if (date) {
      this.selectedDate = new Date(date);
      this.getCalendarEvents(); // Fetch data if month changed (or just always fetch for simplicity)
      this.cdr.detectChanges();
    }
  }

  onMonthSelected(date: Date, datepicker: any): void {
    if (this.calendarView === 'month') {
      this.selectedDate = new Date(date);
      this.getCalendarEvents();
      datepicker.close();
      this.cdr.detectChanges();
    }
  }

  next(): void {
    const nextDate = new Date(this.selectedDate);
    const currentMonth = this.selectedDate.getMonth();
    const currentYear = this.selectedDate.getFullYear();

    if (this.calendarView === 'month') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (this.calendarView === 'week') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    this.selectedDate = nextDate;

    if (nextDate.getMonth() !== currentMonth || nextDate.getFullYear() !== currentYear) {
      this.getCalendarEvents();
    } else {
      this.filterEvents();
    }
    this.cdr.detectChanges();
  }

  previous(): void {
    const prevDate = new Date(this.selectedDate);
    const currentMonth = this.selectedDate.getMonth();
    const currentYear = this.selectedDate.getFullYear();

    if (this.calendarView === 'month') {
      prevDate.setMonth(prevDate.getMonth() - 1);
    } else if (this.calendarView === 'week') {
      prevDate.setDate(prevDate.getDate() - 7);
    } else {
      prevDate.setDate(prevDate.getDate() - 1);
    }

    this.selectedDate = prevDate;

    if (prevDate.getMonth() !== currentMonth || prevDate.getFullYear() !== currentYear) {
      this.getCalendarEvents();
    } else {
      this.filterEvents();
    }
    this.cdr.detectChanges();
  }

  goToToday(): void {
    const today = new Date();
    const currentMonth = this.selectedDate.getMonth();
    const currentYear = this.selectedDate.getFullYear();

    this.selectedDate = today;

    if (today.getMonth() !== currentMonth || today.getFullYear() !== currentYear) {
      this.getCalendarEvents();
    } else {
      this.filterEvents();
    }
    this.cdr.detectChanges();
  }



  obtenerDatosEmbudo(unidadId: number) {
    const unidad = this.datosEmbudo.find(d => d.UnidadId === unidadId);
    if (!unidad) return [];

    return [
      { name: `${unidad.Unidad} - Total`, y: unidad.Total, color: '#7cb5ec' },
      { name: `${unidad.Unidad} - Pendiente`, y: unidad.Pendiente, color: '#f7a35c' },
      { name: `${unidad.Unidad} - Aprobada`, y: unidad.Aprobada, color: '#8085e9' },
      { name: `${unidad.Unidad} - Rechazada`, y: unidad.Rechazada, color: '#f15c80' },
      { name: `${unidad.Unidad} - Finalizada`, y: unidad.Finalizada, color: '#e4d354' },
    ];
  }

  getAnalitica(): void {
    this._analyticsService.getAnalitica().subscribe((analitica: any) => {
      this.analiticaData = analitica;
      // Proyectos
      if (analitica?.proyectos) {
        const filtered = analitica.proyectos.filter(p => p.totalProyectos > 0);
        this.proyectosSeries = filtered.map(p => p.totalProyectos);
        this.proyectosLabels = filtered.map(p => p.estatusNombre);
      }

      // Cotizaciones
      if (analitica?.cotizaciones) {
        const filtered = analitica.cotizaciones.filter(c => c.totalCotizaciones > 0);
        this.cotizacionesSeries = filtered.map(c => c.totalCotizaciones);
        this.cotizacionesLabels = filtered.map(c => c.estatusNombre);
      }

      // Cotizaciones Productos
      if (analitica?.cotizacionesProductos) {
        const filtered = analitica.cotizacionesProductos.filter(c => c.totalCotizaciones > 0);
        this.productosSeries = filtered.map(c => c.totalCotizaciones);
        this.productosLabels = filtered.map(c => c.estatusNombre);
      }
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
      this.presenceService.connectedUsers$
        .pipe(take(1))
        .subscribe((connectedIds) => {
          // Marcamos cada usuario como online si está en la lista
          this.users = filteredUsers.map((user) => {
            const found: any = connectedIds.find(
              (u: any) => u.userId === user.usuarioId.toString()
            );
            if (found) {
              return {
                ...user,
                online: found.status,
              };
            } else {
              return {
                ...user,
                online: "",
              };
            }
          });
          this.cdr.detectChanges(); // Forzar actualización en la vista
        });
    });
  }

  getSales() {
    this._salesService.getVentas().subscribe((sales: any) => {
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
    // This method can be used for any remaining or new ApexCharts
    // For now, we only have chartSales which is handled in prepateChartSales()
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
        type: "bar",
        height: 350,
        stacked: false,
      },
      colors: ["#008FFB", "#FF4560"],
      dataLabels: {
        enabled: true,
      },
      markers: {
        size: 4,
      },
      plotOptions: {
        bar: {
          columnWidth: "40%",
          distributed: true,
        },
      },
      series: this.getSalesSeries(),
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },
      tooltip: {
        shared: true,
        intersect: false,
      },
      xaxis: {
        categories: this.getCategories(),
      },
      yaxis: {
        title: {
          text: "Monto",
        },
      },
    };
    this.cdr.detectChanges(); // Forzar actualización en la vista
  }

  onTabChange(event: MatTabChangeEvent): void {
    if (event.tab.textLabel === "Ubicación") {
      setTimeout(() => {
        if (!this.map) {
          this.initMap();
          this.cargarMarcadores();
        }
      }, 0); // Esperar al siguiente ciclo para que el DOM se renderice
    }
  }

  initMap(): void {
    this.map = L.map("map").setView([23.6345, -102.5528], 2); // México

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);
  }

  async cargarMarcadores(): Promise<void> {
    // Limpiar marcadores existentes
    this.marcadores.forEach((m) => this.map.removeLayer(m));
    this.marcadores = [];
    this.usuarios = [];

    this._analyticsService.getMapa(this.tipoSeleccionado).subscribe((ubicaciones) => {
      this.prospectosExistentes = ubicaciones; // Guardar los prospectos ya existentes
      // Generar lista de usuarios únicos
      const usuariosUnicos = Array.from(new Set(ubicaciones.map(u => u.nombreUsuario ?? 'Desconocido')));
      this.usuarios = usuariosUnicos;

      // Colores disponibles
      const colores = ['blue', 'red', 'green', 'orange', 'purple', 'darkblue', 'cadetblue', 'darkred'];

      // Mapear cada usuario a un color
      const colorPorUsuario: { [key: string]: string } = {};
      usuariosUnicos.forEach((usuario, i) => {
        colorPorUsuario[usuario] = colores[i % colores.length];
      });

      // Filtrar ubicaciones según selección
      const ubicacionesFiltradas = this.usuarioSeleccionado
        ? ubicaciones.filter(u => (u.nombreUsuario ?? 'Desconocido') === this.usuarioSeleccionado)
        : ubicaciones;

      // Crear marcadores
      for (const u of ubicacionesFiltradas) {
        if (u.latitud && u.longitud) {
          const nombreUsuario = u.nombreUsuario ?? 'Desconocido';
          const nombre = u.nombre ?? 'Sin nombre';
          const tipo = u.tipo ?? 'Desconocido';

          // ⚡ Mantener el color asignado al usuario, incluso al filtrar
          const color = colorPorUsuario[nombreUsuario] || 'blue';

          const icon = L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });

          const marker = L.marker([u.latitud, u.longitud], { draggable: true, icon });

          const popupContent = `
          <strong>${nombre}</strong><br/>
          Cargado por: <em>${nombreUsuario}</em><br/>
          (${tipo})<br/>
          <a href="#" class="popup-link" data-id="${u.id}" data-tipo="${tipo}">Ver detalle</a>
        `;
          marker.bindPopup(popupContent);

          marker.on('popupopen', () => {
            setTimeout(() => {
              const link = document.querySelector('.popup-link');
              if (link) {
                link.addEventListener('click', (event: Event) => {
                  event.preventDefault();
                  const id = (link as HTMLElement).getAttribute('data-id');
                  const tipo = (link as HTMLElement).getAttribute('data-tipo');
                  if (tipo?.toLowerCase() === 'prospecto') {
                    this._router.navigate([`/dashboards/prospects/${id}`]);
                  } else if (tipo?.toLowerCase() === 'cliente') {
                    this._router.navigate([`/catalogs/clients/${id}`]);
                  }
                });
              }
            }, 0);
          });

          marker.addTo(this.map);
          this.marcadores.push(marker);
          this.cdr.detectChanges(); // Forzar actualización en la vista
        }
      }

      // Ajustar el mapa a los marcadores
      if (this.marcadores.length > 0) {
        const group = L.featureGroup(this.marcadores);
        this.map.fitBounds(group.getBounds().pad(0.2));
      }
    });
  }




  buildFunnelData(unidad: any) {
    return [
      { name: 'Total', y: unidad.Total, color: this.coloresEstatus['Total'] },
      { name: 'Pendiente', y: unidad.Pendiente, color: this.coloresEstatus['Pendiente'] },
      { name: 'Aprobada', y: unidad.Aprobada, color: this.coloresEstatus['Aprobada'] },
      { name: 'Rechazada', y: unidad.Rechazada, color: this.coloresEstatus['Rechazada'] },
      { name: 'Finalizada', y: unidad.Finalizada, color: this.coloresEstatus['Finalizada'] },
      { name: 'En Proceso', y: unidad.EnProceso, color: this.coloresEstatus['EnProceso'] }
    ];
  }


  onUnidadNegocioChange() {
    this.selectedUnidadNegocio = this.formFiltro.get('unidadNegocio')?.value;
    // actualizar gráfica
    const unidad = this.datosEmbudo.find(u => u.unidadId === this.selectedUnidadNegocio);
    if (!unidad) {
      // Si no hay datos para la unidad seleccionada, mostrar todos los valores en 0
      this.chartOptionsEmbudo.series = [{
        type: 'funnel',
        name: 'Sin datos',
        data: [
          { name: 'Total', y: 0, color: '#7cb5ec' },
          { name: 'Pendiente', y: 0, color: '#f7a35c' },
          { name: 'Aprobada', y: 0, color: '#8085e9' },
          { name: 'Rechazada', y: 0, color: '#f15c80' },
          { name: 'Finalizada', y: 0, color: '#e4d354' },
          { name: 'En Proceso', y: 0, color: '#00e396' }
        ]
      }];
      this.updateFlag = true;
      return;
    }

    this.chartOptionsEmbudo.series = [{
      type: 'funnel',
      name: unidad.unidadDeNegocio,
      data: [
        { name: 'Total', y: unidad.total, color: '#7cb5ec' },
        { name: 'Pendiente', y: unidad.pendiente, color: '#f7a35c' },
        { name: 'Aprobada', y: unidad.aprobada, color: '#8085e9' },
        { name: 'Rechazada', y: unidad.rechazada, color: '#f15c80' },
        { name: 'Finalizada', y: unidad.finalizada, color: '#e4d354' },
        { name: 'En Proceso', y: unidad.enProceso, color: '#00e396' }
      ]
    }];

    this.updateFlag = true;
  }

  onBuscar() {
    const unidadId = this.formFiltro.get('unidadNegocio')?.value;
    const fechaInicio = this.formFiltro.get('fecha.start')?.value;
    const fechaFin = this.formFiltro.get('fecha.end')?.value;

    if (!fechaInicio || !fechaFin) return;

    this._analyticsService.getDataGraf(fechaInicio, fechaFin)
      .subscribe((response: any[]) => {
        this.datosEmbudo = response || [];
        this.onUnidadNegocioChange(); // actualizar gráfica
        this.cdr.detectChanges()
      });
  }

  async asistenteProspeccion() {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      this.map.setView([lat, lon], 13);

      try {
        this._analyticsService.getProspectosIA(lat,
          lon,
          this.prospectosExistentes?.map(p => p.nombre) || []).subscribe((prospectos) => {

            prospectos.forEach(r => {
              if (this.prospectosExistentes.some(p => p.nombre.toLowerCase() === r.nombre.toLowerCase())) return;

              const marker = L.marker([r.latitud, r.longitud], { icon: this.getIconSugerencia() })
                .addTo(this.map)
                .bindPopup(`
            <b>${r.nombre}</b><br/>
            Tipo: ${r.tipo}<br/>
            <em>${r.motivo}</em><br/>
            ⚡ Prospecto sugerido por IA
          `);

              this.marcadores.push(marker);
            });

            if (this.marcadores.length > 0) {
              const group = L.featureGroup(this.marcadores);
              this.map.fitBounds(group.getBounds().pad(0.2));
            }
          });



      } catch (err) {
        console.error("Error consultando IA:", err);
        alert("No se pudieron generar prospectos con IA");
      }
    }, (err) => {
      console.error("Error obteniendo ubicación:", err);
      alert("No se pudo obtener tu ubicación actual.");
    });
  }

  private getIconSugerencia(): L.Icon {
    return L.icon({
      iconUrl: 'assets/images/lightning.png',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });
  }

  buscarProspectos() {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Siempre centrar en ubicación actual
        this.map.setView([lat, lon], 13);

        // 👉 Primera búsqueda: solo hospital, después todas
        const categoriasABuscar = this.categorias;

        categoriasABuscar.forEach(cat => {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${cat.query}&limit=10&viewbox=${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}&bounded=1`;

          this.http.get<any[]>(url).subscribe({
            next: (resultados) => {
              resultados.forEach(r => {
                const nombreLugar = r.display_name;

                // Evitar duplicados con prospectos existentes
                if (this.prospectosExistentes.some(p => nombreLugar.toLowerCase().includes(p.nombre.toLowerCase()))) {
                  return;
                }

                // Crear marcador sugerido
                const marker = L.marker([+r.lat, +r.lon], { icon: this.getIconSugerencia() })
                  .addTo(this.map)
                  .bindPopup(`
                  <b>${nombreLugar}</b><br/>
                  Categoría: ${cat.query}<br/>
                  <em>${cat.motivo}</em><br/>
                  ⚡ Prospecto sugerido
                `);

                this.marcadores.push(marker);
              });
            },
            error: (err) => {
              console.warn(`❌ Error buscando categoría "${cat.query}":`, err);
              // 👉 aquí simplemente seguimos con la siguiente categoría
            }
          });
        });

        // ✅ Después de la primera búsqueda, ya busca todas
        this.isFirstSearch = false;
      },
      (err) => {
        console.error("Error obteniendo ubicación:", err);
        alert("No se pudo obtener tu ubicación actual.");
      }
    );
  }

  optimizarRuta() {
    const prospectos = this.marcadores.map((m, i) => ({
      nombre: m.getPopup()?.getContent() || `Prospecto ${i + 1}`,
      lat: m.getLatLng().lat,
      lon: m.getLatLng().lng,
      categoria: "desconocida"
    }));
    const prospectosSugeridos = prospectos.filter(p =>
      String(p.nombre).includes("⚡ Prospecto sugerido")
    );


    this._analyticsService.optimizarRuta(prospectosSugeridos).subscribe({
      next: (resp: any) => {
        try {
          const rutaOrdenada = JSON.parse(resp); // Ajusta si tu backend devuelve JSON string
          this.dibujarRuta(rutaOrdenada);
        } catch (e) {
          console.error("Error procesando respuesta IA, usando TSP local:", e);
          const rutaLocal = this.tspLocal(prospectosSugeridos);
          this.dibujarRuta(rutaLocal);
        }
      },
      error: err => {
        console.warn("Error DeepSeek, fallback TSP local:", err);
        const rutaLocal = this.tspLocal(prospectosSugeridos);
        this.dibujarRuta(rutaLocal);
      }
    });
  }

  private dibujarRuta(ruta: any[]) {
    if (this.rutaLayer) this.map.removeLayer(this.rutaLayer);

    const coords = ruta.map(r => [r.lat, r.lon]) as [number, number][];
    this.rutaLayer = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(this.map);

    ruta.forEach((p, idx) => {
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: 'numero-icon',
          html: `<div style="background:#007bff;color:white;border-radius:50%;width:24px;height:24px;
                    display:flex;align-items:center;justify-content:center;font-size:12px;">${idx + 1}</div>`
        })
      }).addTo(this.map)
        .bindPopup(`<b>${p.nombre}</b><br/>Orden: ${idx + 1}<br/>${p.categoria}`);
    });

    this.map.fitBounds(this.rutaLayer.getBounds().pad(0.2));
  }



  // Reordenar prospectos por distancia (Nearest Neighbor)
  private tspLocal(prospectos: any[]): any[] {
    if (!prospectos.length) return [];

    const visitados = new Set<number>();
    const ruta: any[] = [];

    let actual = 0; // comenzamos con el primer prospecto
    visitados.add(actual);
    ruta.push({ ...prospectos[actual], orden: 1 });

    while (ruta.length < prospectos.length) {
      let nextIndex = -1;
      let minDist = Infinity;

      prospectos.forEach((p, i) => {
        if (!visitados.has(i)) {
          const dx = prospectos[actual].lat - p.lat;
          const dy = prospectos[actual].lon - p.lon;
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            nextIndex = i;
          }
        }
      });

      if (nextIndex === -1) break;

      visitados.add(nextIndex);
      ruta.push({ ...prospectos[nextIndex], orden: ruta.length + 1 });
      actual = nextIndex;
    }

    return ruta;
  }

}
