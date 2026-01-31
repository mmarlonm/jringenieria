import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as Highcharts from 'highcharts';
import { MatIconModule } from "@angular/material/icon";
import { ReportVentasService } from '../report-ventas.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
@Component({
    selector: 'app-reporte-ventas-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule
    ]
})
export class ReportVentasDashboardComponent implements OnInit {

    // 🔹 Highcharts
    Highcharts: typeof Highcharts = Highcharts;

    // 🔹 Filtros
    sucursal: string = 'PACHUCA';
    fechaInicio!: string;
    fechaFin!: string;

    // 🔹 KPIs (alineados al JSON)
    kpis = {
        totalVentas: 0,
        totalFacturas: 0,
        totalClientes: 0,
        ventaPromedio: 0,
        utilidadBruta: 0
    };

    // 🔹 Drilldown
    detalleVentas: any[] = [];

    esMoral: boolean = false; // default persona física
    constructor(private reportVentasService: ReportVentasService) { }

    ngOnInit(): void {
        const today = new Date();
        this.fechaInicio = today.toISOString().substring(0, 10);
        this.fechaFin = today.toISOString().substring(0, 10);

        this.consultar();
    }

    // 🔹 Consulta principal
    consultar(): void {
        this.reportVentasService
            .getDashboardVentas(
                this.sucursal,
                new Date(this.fechaInicio),
                new Date(this.fechaFin),
                this.esMoral
            )
            .subscribe({
                next: resp => {
                    if (!resp) return;

                    this.mapearKPIs(resp);
                    this.mapearGraficas(resp);
                    this.detalleVentas = resp.detalle ?? [];
                },
                error: err => console.error('Error dashboard ventas', err)
            });
    }

    // =============================
    // 🔹 KPIs
    // =============================
    private mapearKPIs(data: any): void {
        if (!data.kpis) return;

        this.kpis.totalVentas = data.kpis.totalVentas ?? 0;
        this.kpis.totalFacturas = data.kpis.totalFacturas ?? 0;
        this.kpis.totalClientes = data.kpis.totalClientes ?? 0;
        this.kpis.ventaPromedio = data.kpis.ventaPromedio ?? 0;
        this.kpis.utilidadBruta = data.kpis.utilidadBruta ?? 0;
    }

    // =============================
    // 🔹 Graficas
    // =============================
    private mapearGraficas(data: any): void {

        if (Array.isArray(data.ventasPorMes) && data.ventasPorMes.length) {
            this.graficaVentasPorMes(data.ventasPorMes);
        }

        if (Array.isArray(data.topProductos) && data.topProductos.length) {
            this.graficaTopProductos(data.topProductos);
        }

        if (Array.isArray(data.topVendedores) && data.topVendedores.length) {
            this.graficaTopVendedores(data.topVendedores);
        }
    }

    // 📈 Ventas por mes
    private graficaVentasPorMes(data: any[]): void {
        Highcharts.chart('chartVentasMes', {
            chart: { type: 'line' },
            title: { text: '' },
            xAxis: {
                categories: data.map(x => `${x.mes}/${x.anio}`)
            },
            yAxis: {
                title: { text: 'Ventas ($)' }
            },
            tooltip: {
                pointFormat: '<b>${point.y:,.2f}</b>'
            },
            series: [{
                name: 'Ventas',
                type: 'line',
                data: data.map(x => x.totalMes)
            }]
        });
    }

    // 📊 Top productos
    private graficaTopProductos(data: any[]): void {
        Highcharts.chart('chartTopProductos', {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Top Productos',
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                style: {
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            tooltip: {
                pointFormat: '<b>{point.y:,.0f}</b> vendidos'
            },
            credits: {
                enabled: false
            },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}<br><span style="opacity:.7">{point.percentage:.1f}%</span>',
                        style: {
                            fontSize: '11px',
                            fontWeight: '500'
                        }
                    },
                    states: {
                        hover: {
                            brightness: 0.05
                        }
                    }
                }
            },
            series: [{
                name: 'Productos',
                type: 'pie',
                data: data.map(x => ({
                    name: x.producto,
                    y: x.cantidadVendida
                }))
            }]
        });
    }


    // 🧑‍💼 Top vendedores
    private graficaTopVendedores(data: any[]): void {
        Highcharts.chart('chartTopVendedores', {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Ventas por Vendedor',
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                style: {
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            tooltip: {
                pointFormat: '<b>${point.y:,.2f}</b>'
            },
            credits: {
                enabled: false
            },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}<br><span style="opacity:.7">${point.y:,.0f}</span>',
                        style: {
                            fontSize: '11px',
                            fontWeight: '500'
                        }
                    },
                    states: {
                        hover: {
                            brightness: 0.05
                        }
                    }
                }
            },
            series: [{
                name: 'Ventas',
                type: 'pie',
                data: data.map(x => ({
                    name: x.vendedor,
                    y: x.totalVendido
                }))
            }]
        });
    }


    exportarPDF(): void {
        const element = document.getElementById('pdf-content');
        if (!element) {
            console.error('No se encontró el contenido a exportar');
            return;
        }

        html2canvas(element, {
            scale: 2,           // mejora calidad
            useCORS: true,
            scrollY: -window.scrollY
        }).then(canvas => {

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(
                imgData,
                'PNG',
                0,
                0,
                pdfWidth,
                pdfHeight
            );

            pdf.save(`reporte-ventas-${new Date().getTime()}.pdf`);
        });
    }
}
