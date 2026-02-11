import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as Highcharts from 'highcharts';

// Angular Material Imports
import { MatIconModule } from "@angular/material/icon";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

// Services & Utils
import { ReportPortfolioOverdueService } from '../report-portfolio-overdue.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { HighchartsChartModule } from 'highcharts-angular';

/**
 * Interface para el mapeo de datos de Cartera Vencida
 */
export interface CarteraVencidaDto {
    sucursal: string;
    agente: string;
    cliente: string;
    rfc: string;
    documento: string;
    metodoPago: string;
    condicionesPago: string;
    fechaEmision: string;
    fechaVencimiento: string;
    diasVencido: number;
    totalFactura: number;
    saldoPendiente: number;
    estatus: string;
}

@Component({
    selector: 'app-report-portfolio-overdue-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'es-MX' } // Calendario en español
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        HighchartsChartModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatNativeDateModule,
        MatSelectModule
    ],
})
export class ReportPortfolioOverdueDashboardComponent implements OnInit {

    // Parámetros Highcharts
    Highcharts: typeof Highcharts = Highcharts;
    chartOptions!: Highcharts.Options;

    // Parámetros de Filtro (Inputs)
    // Se inicializan con tipos compatibles con Angular Material
    sucursal: string = 'SANTA JULIA';
    fechaInicio: Date = new Date();
    fechaFin: Date = new Date();
    esMoral: boolean = false;

    // Estado de la Data
    detalle: CarteraVencidaDto[] = [];
    loading: boolean = false;

    // Objeto de Resultados KPIs
    kpis = {
        totalFacturas: 0,
        totalClientes: 0,
        totalSaldo: 0,
        totalVencido: 0,
        promedioDiasVencido: 0
    };

    constructor(private service: ReportPortfolioOverdueService) { }

    ngOnInit(): void {
        this.consultar();
    }

    /**
     * Realiza la petición al servicio para obtener el reporte.
     * @returns void
     */
    consultar(): void {
        this.loading = true;

        // Se pasan los objetos Date directamente
        this.service
            .getDashboardReport(
                this.sucursal,
                this.fechaInicio,
                this.fechaFin,
                this.esMoral
            )
            .subscribe({
                next: (resp: CarteraVencidaDto[]) => {
                    this.loading = false;
                    this.detalle = resp ?? [];
                    this.calcularKpis();
                    this.buildCharts();
                },
                error: err => {
                    this.loading = false;
                    console.error('Error al consultar dashboard:', err);
                }
            });
    }

    /**
     * Procesa el arreglo 'detalle' para extraer métricas clave.
     * @returns void
     */
    calcularKpis(): void {
        const rows = this.detalle;

        const totalFacturas = rows.length;
        const totalClientes = new Set(rows.map(x => x.cliente)).size;
        const totalSaldo = rows.reduce((sum, x) => sum + x.saldoPendiente, 0);

        const totalVencido = rows
            .filter(x => x.diasVencido > 0)
            .reduce((sum, x) => sum + x.saldoPendiente, 0);

        const promedioDias = rows.length === 0
            ? 0
            : rows.reduce((sum, x) => sum + x.diasVencido, 0) / rows.length;

        this.kpis = {
            totalFacturas,
            totalClientes,
            totalSaldo,
            totalVencido,
            promedioDiasVencido: Math.round(promedioDias)
        };
    }

    /**
     * Configura y renderiza la gráfica de Highcharts con el Top 5 de saldos.
     * @returns void
     */
    buildCharts(): void {
        const top = [...this.detalle]
            .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
            .slice(0, 5);

        this.chartOptions = {
            chart: { type: 'bar', backgroundColor: 'transparent' },
            title: { text: 'Top 5 Clientes con Mayor Saldo', style: { fontWeight: 'bold' } },
            xAxis: {
                categories: top.map(x => x.cliente),
                title: { text: null }
            },
            yAxis: {
                title: { text: 'Saldo Pendiente (MXN)' },
                labels: { format: '${value}' }
            },
            tooltip: { valuePrefix: '$' },
            plotOptions: {
                bar: {
                    dataLabels: { enabled: true, format: '${point.y:,.2f}' },
                    color: '#3b82f6'
                }
            },
            legend: { enabled: false },
            series: [{
                type: 'bar',
                name: 'Saldo Pendiente',
                data: top.map(x => x.saldoPendiente)
            }],
            credits: { enabled: false }
        };
    }

    /**
     * Genera un archivo PDF a partir del elemento HTML #dashboard.
     * @returns Promise<void>
     */
    async exportarPDF(): Promise<void> {
        const element = document.getElementById('dashboard');
        if (!element) return;

        try {
            // Se usa scale 2 para mejorar la nitidez de las gráficas en el PDF
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = 297;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`cartera_${this.sucursal}_${this.fechaInicio.toLocaleDateString()}.pdf`);
        } catch (error) {
            console.error('Error al generar PDF:', error);
        }
    }
}