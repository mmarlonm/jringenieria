import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Exporting from 'highcharts/modules/exporting';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventosService, Asistente, EventoEdicion } from '../eventos.service';
import { PersonalStaffService, PersonalStaff, MetricasFichasEvento, RankingPersonalFicha, InteraccionHistorialItem } from '../personal-staff/personal-staff.service';
import { DashboardEncuestasComponent } from '../encuestas/dashboard-encuestas.component';

Exporting(Highcharts);
Highcharts.setOptions({
  time: { useUTC: false },
  lang: {
    decimalPoint: '.',
    thousandsSep: ',',
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  }
});

@Component({
  selector: 'app-eventos-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DashboardEncuestasComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventosReportesComponent implements OnInit, OnDestroy {
  public Highcharts: typeof Highcharts = Highcharts;

  private _eventosService = inject(EventosService);
  private _personalStaffService = inject(PersonalStaffService);
  private _cdr = inject(ChangeDetectorRef);

  public ediciones: EventoEdicion[] = [];
  public selectedEventoId: number = 2026;
  public asistentes: Asistente[] = [];
  public personalStaff: PersonalStaff[] = [];
  public isLoading: boolean = true;

  // KPI Data
  public totalRegistros: number = 0;
  public totalAsistieron: number = 0;
  public tasaAsistencia: string = '0%';

  // Chart Options
  public chartEmpresasOptions: any = {};
  public chartUniversidadesOptions: any = {};
  public chartTiposAsistentesOptions: any = {};
  public chartTiposPersonalOptions: any = {};
  public chartRegistrosPorDiaOptions: any = {};

  // Métricas de Fichas Digitales & Códigos QR
  public metricasFichas: MetricasFichasEvento | null = null;
  public cargandoFichas: boolean = false;
  public chartFichasOptions: any = {};
  public personalSeleccionadoHistorial: RankingPersonalFicha | null = null;
  public modalHistorialAbierto: boolean = false;
  public filtroAccionHistorial: string = 'todas';
  public busquedaHistorial: string = '';

  private baseTheme: any = {
    chart: {
      backgroundColor: 'transparent',
      spacingBottom: 20,
      spacingTop: 10,
      spacingLeft: 10,
      spacingRight: 10,
      style: { fontFamily: 'Inter, sans-serif' }
    },
    title: { text: undefined },
    credits: { enabled: false },
    legend: {
      itemStyle: { color: '#4b5563', fontWeight: 'bold', fontSize: '11px' },
      margin: 10,
      padding: 5
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      style: { color: '#1f2937' },
      borderColor: '#e5e7eb',
      borderRadius: 12,
      shadow: true,
      padding: 12
    }
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._eventosService.ediciones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.ediciones = list || [];
        this._cdr.markForCheck();
      });

    this._eventosService.selectedEventoId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.selectedEventoId = id;
        this.loadReports();
        this._cdr.markForCheck();
      });

    this._eventosService.metricas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        if (metrics) {
          this.totalRegistros = metrics.totalRegistrados;
          this.totalAsistieron = metrics.totalAsistieron;
          this.tasaAsistencia = metrics.totalRegistrados > 0
            ? Math.round((metrics.totalAsistieron / metrics.totalRegistrados) * 100) + '%'
            : '0%';
          this._cdr.markForCheck();
        }
      });
  }

  loadReports(): void {
    this.isLoading = true;
    this._eventosService.loadDashboardMetrics(this.selectedEventoId);
    this.loadMetricasFichas();
    this._eventosService.getAsistentes(this.selectedEventoId).subscribe({
      next: (asistentes) => {
        this.asistentes = asistentes || [];
        this.loadPersonalStaff();
      },
      error: (err) => {
        console.error('Error loading asistentes:', err);
        this.isLoading = false;
        this._cdr.markForCheck();
      }
    });
  }

  private loadPersonalStaff(): void {
    this._personalStaffService.getAll().subscribe({
      next: (personal) => {
        this.personalStaff = (personal || []).filter(p =>
          p.eventoIds && p.eventoIds.includes(this.selectedEventoId)
        );
        this.generarReportes();
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading personal:', err);
        this.isLoading = false;
        this._cdr.markForCheck();
      }
    });
  }

  onEventoChanged(eventoId: number): void {
    this._eventosService.selectEventoId(eventoId);
  }

  private generarReportes(): void {
    this.calcularKPIs();
    this.generarGraficoRegistrosPorDia();
    this.generarGraficoEmpresas();
    this.generarGraficoUniversidades();
    this.generarGraficoTiposAsistentes();
    this.generarGraficoTiposPersonal();
  }

  private generarGraficoRegistrosPorDia(): void {
    const registrosPorDiaMap = new Map<string, number>();

    this.asistentes.forEach(a => {
      const rawDate = a.fechaRegistroRaw || a.fechaRegistro;
      if (rawDate) {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const key = `${year}-${month}-${day}`;
          registrosPorDiaMap.set(key, (registrosPorDiaMap.get(key) || 0) + 1);
        }
      }
    });

    this.personalStaff.forEach(p => {
      if (p.fechaRegistro) {
        const dateObj = new Date(p.fechaRegistro);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const key = `${year}-${month}-${day}`;
          registrosPorDiaMap.set(key, (registrosPorDiaMap.get(key) || 0) + 1);
        }
      }
    });

    const sortedEntries = Array.from(registrosPorDiaMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    const categories = sortedEntries.map(([dateStr]) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      }
      return dateStr;
    });

    const values = sortedEntries.map(([, count]) => count);

    this.chartRegistrosPorDiaOptions = {
      ...this.baseTheme,
      chart: { ...this.baseTheme.chart, type: 'spline' },
      xAxis: {
        categories: categories,
        title: { text: 'Fecha de Registro' },
        labels: { style: { fontSize: '11px', fontWeight: 'bold' } }
      },
      yAxis: {
        title: { text: 'Nuevos Registros' },
        min: 0,
        allowDecimals: false,
        labels: { style: { fontSize: '11px' } }
      },
      series: [
        {
          name: 'Registros Diarios',
          data: values,
          color: '#4f46e5',
          marker: {
            enabled: true,
            radius: 5,
            symbol: 'circle',
            fillColor: '#4f46e5'
          }
        }
      ],
      plotOptions: {
        spline: {
          dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 'bold', color: '#4f46e5' } },
          enableMouseTracking: true
        }
      }
    };
  }

  private calcularKPIs(): void {
    const asistieron = this.asistentes.filter(a => a.asistencia === 'Presente').length;
    this.totalRegistros = this.asistentes.length + this.personalStaff.length;
    this.totalAsistieron = asistieron;
    this.tasaAsistencia = this.totalRegistros > 0
      ? Math.round((this.totalAsistieron / this.totalRegistros) * 100) + '%'
      : '0%';
  }

  private generarGraficoEmpresas(): void {
    const empresasMap = new Map<string, number>();

    if (this.asistentes.length > 0) {
      this.asistentes
        .filter(a => a.empresa && a.empresa.trim() !== '' && a.empresa !== 'S/D')
        .forEach(a => {
          const empresa = a.empresa.trim();
          empresasMap.set(empresa, (empresasMap.get(empresa) || 0) + 1);
        });
    } else {
      this.personalStaff
        .filter(p => p.empresa && p.empresa.trim() !== '')
        .forEach(p => {
          const empresa = p.empresa.trim();
          empresasMap.set(empresa, (empresasMap.get(empresa) || 0) + 1);
        });
    }

    const datos = Array.from(empresasMap.entries())
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 15);

    const etiqueta = this.asistentes.length > 0 ? 'Asistentes' : 'Personal';

    this.chartEmpresasOptions = {
      ...this.baseTheme,
      chart: { ...this.baseTheme.chart, type: 'bar' },
      xAxis: {
        categories: datos.map(d => d.name),
        title: { text: null },
        labels: { style: { fontSize: '11px' } }
      },
      yAxis: {
        title: { text: 'Cantidad' },
        labels: { style: { fontSize: '11px' } }
      },
      series: [
        {
          name: etiqueta,
          data: datos.map(d => d.y),
          color: '#3b82f6'
        }
      ],
      plotOptions: {
        bar: { dataLabels: { enabled: true } }
      }
    };
  }

  private normalizeUniversidad(name: string): string {
    if (!name) return '';
    const upper = name.trim().toUpperCase();
    if (upper === 'UPMH' || upper === 'UMPH' || upper.includes('METROPOLITANA DE HIDALGO') || upper.includes('POLITÉCNICA METROPOLITANA DE HIDALGO') || upper.includes('POLITECNICA METROPOLITANA DE HIDALGO')) {
      return 'Universidad Politécnica Metropolitana de Hidalgo';
    }
    return name.trim();
  }

  private generarGraficoUniversidades(): void {
    const dataMap = new Map<string, number>();

    if (this.asistentes.length > 0) {
      this.asistentes
        .filter(a => a.universidad && a.universidad.trim() !== '')
        .forEach(a => {
          const univ = this.normalizeUniversidad(a.universidad);
          dataMap.set(univ, (dataMap.get(univ) || 0) + 1);
        });
    } else {
      this.personalStaff
        .filter(p => p.cargo && p.cargo.trim() !== '')
        .forEach(p => {
          const cargo = p.cargo.trim();
          dataMap.set(cargo, (dataMap.get(cargo) || 0) + 1);
        });
    }

    const datos = Array.from(dataMap.entries())
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 12);

    const etiqueta = this.asistentes.length > 0 ? 'Estudiantes' : 'Cargos';

    this.chartUniversidadesOptions = {
      ...this.baseTheme,
      chart: { ...this.baseTheme.chart, type: 'pie' },
      series: [
        {
          name: etiqueta,
          data: datos,
          colorByPoint: true
        }
      ],
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.y}'
          }
        }
      }
    };
  }

  private generarGraficoTiposAsistentes(): void {
    const tiposMap = new Map<string, number>();

    this.asistentes.forEach(a => {
      const tipo = a.tipo || 'Sin especificar';
      tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + 1);
    });

    const datos = Array.from(tiposMap.entries()).map(([name, y]) => ({ name, y }));

    this.chartTiposAsistentesOptions = {
      ...this.baseTheme,
      chart: { ...this.baseTheme.chart, type: 'pie' },
      series: [
        {
          name: 'Tipo de Asistente',
          data: datos,
          colorByPoint: true
        }
      ],
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.y} ({point.percentage:.1f}%)'
          }
        }
      }
    };
  }

  private generarGraficoTiposPersonal(): void {
    const tiposMap = new Map<string, number>();

    this.personalStaff.forEach(p => {
      tiposMap.set(p.tipoPersonal || 'Otro', (tiposMap.get(p.tipoPersonal || 'Otro') || 0) + 1);
    });

    const datos = Array.from(tiposMap.entries()).map(([name, y]) => ({ name, y }));

    this.chartTiposPersonalOptions = {
      ...this.baseTheme,
      chart: { ...this.baseTheme.chart, type: 'pie' },
      series: [
        {
          name: 'Tipo de Personal',
          data: datos,
          colorByPoint: true
        }
      ],
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          innerSize: '50%',
          dataLabels: {
            enabled: true,
            format: '{point.name}'
          }
        }
      }
    };
  }

  public loadMetricasFichas(): void {
    this.cargandoFichas = true;
    this._personalStaffService.getMetricasInteracciones(this.selectedEventoId).subscribe({
      next: (data) => {
        this.metricasFichas = data;
        this.cargandoFichas = false;
        this.generarGraficoFichas();
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar métricas de fichas:', err);
        this.cargandoFichas = false;
        this._cdr.markForCheck();
      }
    });
  }

  public generarGraficoFichas(): void {
    if (!this.metricasFichas || !this.metricasFichas.interaccionesPorDia) return;

    const dias = this.metricasFichas.interaccionesPorDia;
    const categories = dias.map(d => {
      const parts = d.fecha.split('-');
      if (parts.length === 3) {
        const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      }
      return d.fecha;
    });

    const vistasData = dias.map(d => d.vistas);
    const clicksData = dias.map(d => d.clicks);
    const compartidosData = dias.map(d => d.compartidos);

    this.chartFichasOptions = {
      ...this.baseTheme,
      chart: { ...this.baseTheme.chart, type: 'column' },
      xAxis: {
        categories: categories,
        title: { text: 'Fecha de Interacción' },
        labels: { style: { fontSize: '11px', fontWeight: 'bold' } }
      },
      yAxis: {
        title: { text: 'Total Interacciones' },
        min: 0,
        allowDecimals: false
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          stacking: 'normal',
          dataLabels: { enabled: true, style: { fontSize: '10px' } }
        }
      },
      series: [
        { name: 'Vistas de Perfil', data: vistasData, color: '#0284c7' },
        { name: 'Clics de Contacto', data: clicksData, color: '#10b981' },
        { name: 'Veces Compartido', data: compartidosData, color: '#8b5cf6' }
      ]
    };
  }

  public abrirHistorial(personal?: RankingPersonalFicha): void {
    this.personalSeleccionadoHistorial = personal || null;
    this.filtroAccionHistorial = 'todas';
    this.busquedaHistorial = '';
    this.modalHistorialAbierto = true;
    this._cdr.markForCheck();
  }

  public cerrarHistorial(): void {
    this.modalHistorialAbierto = false;
    this.personalSeleccionadoHistorial = null;
    this._cdr.markForCheck();
  }

  public getPhotoUrl(personalId: number): string {
    return this._personalStaffService.getPhotoUrl(personalId);
  }

  get historialFiltrado(): InteraccionHistorialItem[] {
    if (!this.metricasFichas || !this.metricasFichas.historialReciente) return [];
    let list = this.metricasFichas.historialReciente;

    if (this.personalSeleccionadoHistorial) {
      list = list.filter(h => h.personalStaffId === this.personalSeleccionadoHistorial?.personalStaffId);
    }

    if (this.filtroAccionHistorial !== 'todas') {
      list = list.filter(h => h.tipoAccion === this.filtroAccionHistorial);
    }

    if (this.busquedaHistorial.trim() !== '') {
      const q = this.busquedaHistorial.toLowerCase().trim();
      list = list.filter(h =>
        h.nombrePersonal.toLowerCase().includes(q) ||
        h.empresa.toLowerCase().includes(q) ||
        (h.ipOrigen && h.ipOrigen.toLowerCase().includes(q)) ||
        (h.dispositivo && h.dispositivo.toLowerCase().includes(q)) ||
        (h.detalle && h.detalle.toLowerCase().includes(q))
      );
    }

    return list;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
