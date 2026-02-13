import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

import { ReportCustomersService } from '../report-customers.service';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


@Component({
    selector: 'app-reporte-customers-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        HighchartsChartModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule
    ]
})
export class ReportCustomersDashboardComponent implements OnInit {
    Highcharts: typeof Highcharts = Highcharts;
    updateFlag = false;
    chartOptions: Highcharts.Options = {};

    esMoral = false;
    sucursal = 'TODAS'; // Cambiado a TODAS por defecto
    fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1);
    fechaFin: Date = new Date();

    // Data y KPIs
    detalle: any[] = [];
    totalNuevos = 0;
    maxAcumulado = 0;
    promedioMensual = 0;

    constructor(private reportVentasProductService: ReportCustomersService) { }

    ngOnInit(): void {
        this.consultar();
    }

    consultar(): void {
        this.reportVentasProductService
            .getDashboardCustomers(this.sucursal, this.fechaInicio, this.fechaFin, this.esMoral)
            .subscribe(resp => {
                this.detalle = resp || [];
                this.calcularKpis();
                this.buildChart();
            });
    }

    calcularKpis(): void {
        if (this.detalle.length === 0) {
            this.totalNuevos = 0;
            this.maxAcumulado = 0;
            this.promedioMensual = 0;
            return;
        }

        this.totalNuevos = this.detalle.reduce((acc, curr) => acc + curr.clientesNuevos, 0);
        this.maxAcumulado = this.detalle[this.detalle.length - 1]?.acumulado || 0;
        this.promedioMensual = Math.round(this.totalNuevos / this.detalle.length);
    }

    buildChart(): void {
        this.chartOptions = {
            chart: {
                type: 'spline', // 🔹 AMBAS SON SPLINE
                backgroundColor: 'transparent',
                style: { fontFamily: 'Inter, sans-serif' },
                // Aumentamos un poco el margen derecho para que quepan bien las etiquetas
                marginRight: 80
            },
            title: {
                text: 'Crecimiento Histórico de Clientes',
                align: 'left',
                style: { fontWeight: '600' }
            },
            xAxis: {
                categories: this.detalle.map(x => x.nombreMes),
                crosshair: true,
                lineColor: '#e5e7eb', // Gris suave
                tickColor: '#e5e7eb'
            },
            yAxis: [
                {
                    // --- EJE 0: CLIENTES NUEVOS (ABAJO) ---
                    title: {
                        text: 'Nuevos',
                        style: { color: '#3B82F6' }
                    },
                    labels: { style: { color: '#3B82F6' } },
                    gridLineDashStyle: 'Dash',

                    // 🔹 MAGIA AQUÍ: Definimos altura y posición para enviarlo abajo
                    top: '55%',   // Empieza al 55% de la altura del gráfico
                    height: '45%', // Ocupa el 45% restante hacia abajo
                    offset: 0,
                    lineWidth: 1
                },
                {
                    // --- EJE 1: ACUMULADO (ARRIBA) ---
                    title: {
                        text: 'Acumulado',
                        style: { color: '#10B981' }
                    },
                    labels: { style: { color: '#10B981' } },
                    opposite: true, // Eje a la derecha

                    // 🔹 MAGIA AQUÍ: Definimos altura y posición para enviarlo arriba
                    top: '0%',     // Empieza desde el tope
                    height: '45%', // Ocupa el 45% hacia abajo
                    offset: 0,
                    lineWidth: 1
                }
            ],
            tooltip: {
                shared: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 8,
                shadow: true,
                borderWidth: 0
            },
            plotOptions: {
                spline: {
                    dataLabels: { enabled: true },
                    enableMouseTracking: true,
                    marker: { radius: 4, symbol: 'circle' }
                }
            },
            series: [
                {
                    name: 'Clientes Nuevos',
                    type: 'spline', // 🔹 TIPO SPLINE
                    yAxis: 0, // Asignado al eje de ABAJO
                    data: this.detalle.map(x => x.clientesNuevos),
                    color: '#3B82F6', // Blue 500
                    lineWidth: 2,
                    tooltip: { valuePrefix: '+' } // Para que se vea "+15" en el tooltip
                },
                {
                    name: 'Acumulado',
                    type: 'spline', // 🔹 TIPO SPLINE
                    yAxis: 1, // Asignado al eje de ARRIBA
                    data: this.detalle.map(x => x.acumulado),
                    color: '#10B981', // Emerald 500
                    lineWidth: 3, // Línea un poco más gruesa para destacar
                    dashStyle: 'Solid' // Línea sólida para mayor claridad
                }
            ],
            credits: { enabled: false },
            legend: {
                align: 'center',
                verticalAlign: 'bottom',
                layout: 'horizontal'
            }
        };

        this.updateFlag = true;
    }

    // =================================================
    // 🔹 EXPORTAR PDF
    // =================================================
    exportarPDF(): void {

        const element = document.getElementById('pdf-content');
        if (!element) return;

        html2canvas(element, {
            scale: 2,
            useCORS: true,
            scrollY: -window.scrollY
        }).then(canvas => {

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`reporte-ventas-producto-${Date.now()}.pdf`);
        });
    }
}