import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

import { ProjectProgressService } from '../project-progress.service';

import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import SolidGauge from 'highcharts/modules/solid-gauge';
import Exporting from 'highcharts/modules/exporting';

// Inicializar módulos (orden importante)
HighchartsMore(Highcharts);
SolidGauge(Highcharts);
if (typeof Exporting === 'function') {
    Exporting(Highcharts);
}

// Configuración global de idioma para Highcharts en Español
const spanishLang: any = {
    contextButtonTitle: 'Menú contextual de la gráfica',
    decimalPoint: '.',
    downloadJPEG: 'Descargar imagen JPEG',
    downloadPDF: 'Descargar documento PDF',
    downloadPNG: 'Descargar imagen PNG',
    downloadSVG: 'Descargar imagen vectorial SVG',
    drillUpText: 'Regresar a {series.name}',
    loading: 'Cargando...',
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    noData: 'Sin datos para mostrar',
    printChart: 'Imprimir gráfica',
    resetZoom: 'Reiniciar zoom',
    resetZoomTitle: 'Reiniciar zoom nivel 1:1',
    shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    thousandsSep: ',',
    weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    viewFullscreen: 'Ver en pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    viewData: 'Ver tabla de datos',
    hideData: 'Ocultar tabla de datos'
};

Highcharts.setOptions({ lang: spanishLang });

@Component({
  selector: 'app-projects-report-view',
  templateUrl: './view-report.component.html',
  styleUrls: ['./view-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // Pipes
    DatePipe,
    CurrencyPipe,

    // Angular Material
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ]
})
export class ProjectsReportViewComponent implements OnInit {

  projectName = '';
  location = 'Sin ubicación';
  startDate: any = null;
  dueDate: any = null;
  projectStatus = 'EN PROGRESO';

  overallProgress = 0;

  financials = {
    projectValue: 0,
    pendingPayment: 0,
    totalAnticipo: 0
  };

  projectAreas: any[] = [];

  suppliesData = [
    { component: 'Estructura Metálica', value: 12500, progress: 80 },
    { component: 'Paneles', value: 8500, progress: 60 },
    { component: 'Tornillería', value: 1200, progress: 100 },
    { component: 'Pintura', value: 4300, progress: 40 }
  ];

  displayedColumns = ['component', 'value', 'progress'];

  projectLeaders = '';
  operationalLeaders = '';

  anticipoPercent = 0;

  searchProjectId: number | null = null;

  projectlist: any[] = [];

  areasChart: Highcharts.Chart | null = null;

  private anticipoChart: Highcharts.Chart | null = null;

  constructor(private projectService: ProjectProgressService) { }

  ngOnInit(): void {
    this.getProjectsList();
  }

  getProjectsList(): void {
    this.projectService.getProjects().subscribe((projects: any) => {
      this.projectlist = projects.data || [];
    });
  }

  // 🔥🔥🔥 FUNCIÓN PARA CARGAR EL GAUGE HIGHCHARTS
  loadAnticipoGauge() {
    if (this.anticipoChart) {
      try { this.anticipoChart.destroy(); } catch { }
      this.anticipoChart = null;
    }

    const options: Highcharts.Options = {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 260
      },
      title: null,
      tooltip: { enabled: false },
      plotOptions: {
        pie: {
          startAngle: -90,
          endAngle: 90,
          center: ['50%', '100%'],
          size: '190%',
          innerSize: '80%',
          dataLabels: { enabled: false }
        }
      },
      legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'bottom',
      layout: 'horizontal',
      itemStyle: {
        color: '#333',
        fontSize: '13px'
      },
      labelFormatter: function () {
        return `${this.name}: ${(this as any).y?.toFixed(1)}%`;
      }
    },
      series: [{
        type: 'pie',
        name: 'Anticipo',
        data: [
          {
            name: 'Anticipo',
            y: this.anticipoPercent,
            color: '#1976d2'
          },
          {
            name: 'Pendiente',
            y: 100 - this.anticipoPercent,
            color: '#e0e0e0'
          }
        ]
      }],
      credits: { enabled: false }
    };

    this.anticipoChart = (Highcharts as any).chart('anticipoSemiDonutContainer', options);
  }

  loadAreasBarChart() {
  if (this.areasChart) {
    try { this.areasChart.destroy(); } catch {}
    this.areasChart = null;
  }

  const categories = this.projectAreas.map(a => a.name);
  const values = this.projectAreas.map(a => a.progress);

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      backgroundColor: 'transparent',
      height: 240, 
      // 🔥 Ajusta la altura según número de áreas
    },
    title: null,
    xAxis: {
      categories,
      labels: {
        style: { fontSize: '11px', color: '#333' }
      }
    },
    yAxis: {
      min: 0,
      max: 100,
      title: null
    },
    legend: { enabled: false },
    tooltip: { valueSuffix: '%' },
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          format: '{y}%',
          style: {
            fontSize: '11px',
            fontWeight: 'bold'
          }
        }
      },
      bar: {
        pointWidth: 14,  // 🔥 barras más delgadas
        borderWidth: 0,
        color: '#1976d2'
      }
    },
    series: [{
      type: 'bar',
      name: 'Avance',
      data: values
    }],
    credits: { enabled: false }
  };

  this.areasChart = Highcharts.chart('areasBarChartContainer', options);
}




  // 🔥🔥🔥 LLAMADA AUTOMÁTICA AL CARGAR LOS DATOS
  loadProjectData() {
    this.projectService.getProjectById(this.searchProjectId ?? 0).subscribe((data: any) => {

      this.projectName = data.nombre || 'N/A';
      this.location = data.ubicacion || 'Sin ubicación';
      this.startDate = data.fechaInicio ? new Date(data.fechaInicio) : null;
      this.dueDate = data.fechaFin ? new Date(data.fechaFin) : null;
      this.projectStatus = data.estatus || 'EN PROGRESO';
      this.overallProgress = data.avanceGeneral ?? 0;

      this.projectLeaders = data.responsableProyecto || 'N/A';
      this.operationalLeaders = data.responsableOperativo || 'N/A';

      const totalProyecto = data.pagoTotal ?? 0;

      // Convertir anticipos
      let totalAnticipo = 0;

      if (data.anticipoList) {
        totalAnticipo = data.anticipoList
          .split(',')
          .map(x => Number(x.trim()))
          .reduce((a, b) => a + b, 0);
      }

      const pendiente = totalProyecto - totalAnticipo;

      this.financials = {
        projectValue: totalProyecto,
        totalAnticipo: totalAnticipo,
        pendingPayment: pendiente < 0 ? 0 : pendiente
      };

      this.anticipoPercent = totalProyecto > 0
        ? (totalAnticipo / totalProyecto) * 100
        : 0;

      // Avances
      this.projectAreas = Array.isArray(data.avances)
        ? data.avances.map((a: any) => ({
          name: a.descripcion,
          progress: a.valor
        }))
        : [];

      // 🔥🔥🔥 Cargar el Gauge
      setTimeout(() => {
        this.loadAnticipoGauge();
        this.loadAreasBarChart();
      }, 200);
    });
  }

  get projectStatusClass(): string {
    if (!this.projectStatus) return '';

    const normalized = this.projectStatus.toLowerCase().replace(/\s+/g, '-');
    return `status-${normalized}`;
  }

  getProgressClass(progress: number): string {
    if (progress === 100) return 'complete';
    if (progress > 0) return 'in-progress';
    return 'pending';
  }
}
