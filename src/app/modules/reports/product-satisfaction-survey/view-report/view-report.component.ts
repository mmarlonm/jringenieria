import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

// Highcharts
import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import SolidGauge from 'highcharts/modules/solid-gauge';
import { HighchartsChartModule } from 'highcharts-angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';


import { ProductSatisfactionSurveyService } from '../product-satisfaction-survey.service';
import { ProductSatisfactionReport } from '../models/product-satisfaction-report.model';

// Inicializar módulos Highcharts
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

        // Pipes (solo para HTML)
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
        MatSelectModule,
        HighchartsChartModule,
        MatDatepickerModule,
        MatNativeDateModule
    ]
})
export class ProductsSatisfactionSurveyReportViewComponent implements OnInit {

    /** Formulario de filtros */
    form!: FormGroup;

    /** Data cruda del backend (agregada por sucursal) */
    reportData: ProductSatisfactionReport[] = [];

    /** Data filtrada por sucursal (frontend) */
    filteredData: ProductSatisfactionReport[] = [];

    /** Indicadores generales */
    npsGeneral = 0;
    promotores = 0;
    detractores = 0;
    neutros = 0;
    totalRespuestas = 0;

    /** Highcharts */
    Highcharts: typeof Highcharts = Highcharts;
    npsChartOptions!: Highcharts.Options;
    sucursalChartOptions!: Highcharts.Options;

    /** Catálogo de unidades */
    unidadesNegocio: any[] = [];

    /** Filtro de sucursal */
    selectedSucursal = 0; // 0 = Todas

    constructor(
        private fb: FormBuilder,
        private productSatisfactionSurveyService: ProductSatisfactionSurveyService
    ) { }

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
            fechaFin: [today, Validators.required],
            unidadNegocioId: [0] // solo frontend
        });
    }

    /** Catálogo de unidades */
    private getUnidadesNegocio(): void {
        this.productSatisfactionSurveyService.getUnidadesDeNegocio().subscribe({
            next: (data) => this.unidadesNegocio = data ?? [],
            error: (err) => console.error('Error unidades negocio', err)
        });
    }

    /** Obtiene datos del backend */
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
                this.applySucursalFilter();
            },
            error: (err) => console.error('Error al cargar reporte', err)
        });
    }

    /** Filtra SOLO en frontend */
    applySucursalFilter(): void {

        this.selectedSucursal = this.form.value.unidadNegocioId;

        if (this.selectedSucursal === 0) {
            this.filteredData = [...this.reportData];
        } else {
            this.filteredData = this.reportData.filter(
                x => x.sucursalId === this.selectedSucursal
            );
        }

        this.calculateGeneralIndicators(this.filteredData);
        this.buildSucursalChart(this.filteredData);
    }

    /** Cálculo GENERAL (ponderado) */
    private calculateGeneralIndicators(data: ProductSatisfactionReport[]): void {

        if (!data.length) {
            this.resetIndicators();
            return;
        }

        this.totalRespuestas = data.reduce((s, x) => s + x.totalRespuestas, 0);
        this.promotores = data.reduce((s, x) => s + x.promotores, 0);
        this.detractores = data.reduce((s, x) => s + x.detractores, 0);
        this.neutros = data.reduce((s, x) => s + x.neutros, 0);

        const pctProm = (this.promotores / this.totalRespuestas) * 100;
        const pctDet = (this.detractores / this.totalRespuestas) * 100;

        this.npsGeneral = Math.round(pctProm - pctDet);

        this.buildNpsChart(this.npsGeneral);
    }

    private resetIndicators(): void {
        this.npsGeneral = 0;
        this.promotores = 0;
        this.neutros = 0;
        this.detractores = 0;
        this.totalRespuestas = 0;
        this.buildNpsChart(0);
    }

    /** Gráfica NPS general */
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

    /** Gráfica por sucursal */
    private buildSucursalChart(data: ProductSatisfactionReport[]): void {

        this.sucursalChartOptions = {
            chart: { type: 'column' },
            title: { text: 'NPS por sucursal' },
            xAxis: {
                categories: data.map(x => this.getSucursalNombre(x.sucursalId))
            },
            yAxis: {
                min: -100,
                max: 100,
                title: { text: 'NPS' }
            },
            series: [{
                type: 'column',
                name: 'NPS',
                data: data.map(x => x.nps)
            }]
        };
    }

    /** Nombre legible */
    getSucursalNombre(id: number): string {
        return this.unidadesNegocio.find(x => x.unidadId === id)?.nombre ?? `Sucursal ${id}`;
    }

}
    