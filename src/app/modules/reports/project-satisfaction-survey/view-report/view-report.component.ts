import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Highcharts
import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import SolidGauge from 'highcharts/modules/solid-gauge';
import { HighchartsChartModule } from 'highcharts-angular';

// Services / Models
import { ProductSatisfactionSurveyService } from '../project-satisfaction-survey.service';
import { ServiceSatisfactionReport } from '../models/project-satisfaction-report.model';

// Init charts
HighchartsMore(Highcharts);
SolidGauge(Highcharts);

@Component({
  selector: 'products-satisfaction-survey-report-view',
  templateUrl: './view-report.component.html',
  styleUrls: ['./view-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,

    HighchartsChartModule
  ]
})
export class ProjectSatisfactionSurveyReportViewComponent implements OnInit {

  /** Formulario filtros */
  form!: FormGroup;

  /** Data backend */
  reportData: ServiceSatisfactionReport[] = [];

  /** Indicadores globales */
  totalRespuestas = 0;
  promotores = 0;
  neutros = 0;
  detractores = 0;
  npsGeneral = 0;

  /** Highcharts */
  Highcharts: typeof Highcharts = Highcharts;
  npsChartOptions!: Highcharts.Options;

  /** Catálogo sucursales */
  unidadesNegocio: any[] = [];

  constructor(
    private fb: FormBuilder,
    private productSatisfactionSurveyService: ProductSatisfactionSurveyService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.getUnidadesNegocio();
    this.getData();
  }

  /** Inicializa formulario */
  private initForm(): void {
    const today = new Date();

    this.form = this.fb.group({
      fechaInicio: [today, Validators.required],
      fechaFin: [today, Validators.required]
    });
  }

  /** Catálogo sucursales */
  private getUnidadesNegocio(): void {
    this.productSatisfactionSurveyService.getUnidadesDeNegocio().subscribe({
      next: (data) => this.unidadesNegocio = data ?? [],
      error: (err) => console.error('Error unidades negocio', err)
    });
  }

  /** Obtener reporte */
  getData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datePipe = new DatePipe('es-MX');

    const filter = {
      fechaInicio: datePipe.transform(this.form.value.fechaInicio, 'yyyy-MM-dd')!,
      fechaFin: datePipe.transform(this.form.value.fechaFin, 'yyyy-MM-dd')!
    };

    this.productSatisfactionSurveyService.getReport(filter).subscribe({
      next: (data) => {
        this.reportData = data ?? [];
        this.calculateGeneralIndicators(this.reportData);
      },
      error: (err) => console.error('Error al cargar reporte', err)
    });
  }

  /** Cálculo NPS GENERAL ponderado */
  private calculateGeneralIndicators(data: ServiceSatisfactionReport[]): void {

    if (!data.length) {
      this.resetIndicators();
      return;
    }

    this.totalRespuestas = data.reduce((acc, x) => acc + x.totalRespuestas, 0);
    this.promotores = data.reduce((acc, x) => acc + x.promotores, 0);
    this.neutros = data.reduce((acc, x) => acc + x.neutros, 0);
    this.detractores = data.reduce((acc, x) => acc + x.detractores, 0);

    const pctProm = (this.promotores / this.totalRespuestas) * 100;
    const pctDet = (this.detractores / this.totalRespuestas) * 100;

    this.npsGeneral = Math.round(pctProm - pctDet);

    this.buildNpsChart(this.npsGeneral);
  }

  private resetIndicators(): void {
    this.totalRespuestas = 0;
    this.promotores = 0;
    this.neutros = 0;
    this.detractores = 0;
    this.npsGeneral = 0;
    this.buildNpsChart(0);
  }

  /** Gauge NPS */
  private buildNpsChart(nps: number): void {
    this.npsChartOptions = {
      chart: { type: 'solidgauge' },
      title: undefined,
      pane: {
        center: ['50%', '60%'],
        size: '100%',
        startAngle: -90,
        endAngle: 90
      },
      tooltip: { enabled: false },
      yAxis: {
        min: -100,
        max: 100,
        stops: [
          [0.3, '#ef4444'],
          [0.6, '#facc15'],
          [1, '#22c55e']
        ],
        lineWidth: 0,
        tickWidth: 0,
        tickAmount: 5
      },
      plotOptions: {
        solidgauge: {
          dataLabels: {
            y: -20,
            borderWidth: 0,
            useHTML: true,
            format: `
              <div style="text-align:center">
                <span style="font-size:36px;font-weight:bold">${nps}</span><br/>
                <span style="font-size:12px;color:#666">NPS</span>
              </div>`
          }
        }
      },
      series: [{
        type: 'solidgauge',
        name: 'NPS',
        data: [nps]
      }]
    };
  }

  /** Nombre sucursal */
  getSucursalNombre(id: number): string {
    return this.unidadesNegocio.find(x => x.unidadId === id)?.nombre ?? `Sucursal ${id}`;
  }
}
