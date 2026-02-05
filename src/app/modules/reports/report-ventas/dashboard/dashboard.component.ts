import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 🔹 Highcharts
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

// 🔹 Angular Material
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

// 🔹 Servicios y Librerías Externas
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
        MatIconModule,
        HighchartsChartModule, // Corregido: se eliminó la coma doble
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule
    ]
})
export class ReportVentasDashboardComponent implements OnInit {

    // 🔹 Highcharts
    public Highcharts: typeof Highcharts = Highcharts;
    // En la declaración de variables de tu componente
    public chartOptions: Highcharts.Options = {
        title: { text: '' },
        series: [{ type: 'column', data: [] }] // Estructura mínima
    };
    public updateFlag: boolean = false;

    // 🔹 Filtros
    public esMoral: boolean = false;
    public sucursal: string = 'PACHUCA';
    public fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1); // 1 de Enero
    public fechaFin: Date = new Date();

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
    constructor(private reportVentasService: ReportVentasService) { }

    ngOnInit(): void {
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


    /**
 * Genera la gráfica comparativa alineando cronológicamente el periodo actual vs el anterior.
 * @param data Array de objetos con { anio: number, mes: number, periodo: string, totalMes: number }
 */
    private graficaVentasPorMes(data: any[]): void {
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        setTimeout(() => {
            // 1. Identificar la línea de tiempo basada EXCLUSIVAMENTE en los registros "Actual"
            // Esto define cuántos grupos de barras veremos (Ene 25, Feb 25... Ene 26)
            const lineaTiempo = data
                .filter(d => d.periodo.toLowerCase() === 'actual')
                .map(d => ({ anio: d.anio, mes: d.mes }))
                .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));

            // 2. Crear las etiquetas del eje X (ej. "Ene 25", "Feb 26")
            const categorias = lineaTiempo.map(p => `${mesesNombres[p.mes - 1]} ${p.anio.toString().slice(-2)}`);

            // 3. Construir las series buscando el match exacto con la data del SP
            const serieActual = lineaTiempo.map(p => {
                const item = data.find(d =>
                    d.anio === p.anio &&
                    d.mes === p.mes &&
                    d.periodo.toLowerCase() === 'actual'
                );
                return item ? item.totalMes : 0;
            });

            const serieAnterior = lineaTiempo.map(p => {
                // Gracias al ajuste en el SP, el registro 'Anterior' viene con el mismo Año 
                // que su pareja 'Actual' para facilitar esta búsqueda
                const item = data.find(d =>
                    d.anio === p.anio &&
                    d.mes === p.mes &&
                    d.periodo.toLowerCase() === 'anterior'
                );
                return item ? item.totalMes : 0;
            });

            // 4. Renderizado al contenedor
            const container = document.getElementById('chartComparativaMes');
            if (container) {
                (Highcharts as any).chart(container, {
                    chart: {
                        type: 'column',
                        backgroundColor: 'transparent'
                    },
                    title: { text: '' },
                    xAxis: {
                        categories: categorias,
                        crosshair: true
                    },
                    yAxis: {
                        min: 0,
                        title: { text: 'Monto ($)' },
                        labels: { format: '${value:,.0f}' }
                    },
                    plotOptions: {
                        column: {
                            grouping: true,        // Barras una al lado de la otra
                            pointPadding: 0.1,
                            groupPadding: 0.2,
                            borderWidth: 0,
                            borderRadius: 3,
                            minPointLength: 5      // Asegura que montos pequeños sean visibles
                        }
                    },
                    series: [
                        {
                            name: 'Año Anterior',
                            color: '#10b981', // Verde
                            data: serieAnterior
                        },
                        {
                            name: 'Año Actual',
                            color: '#3b82f6', // Azul
                            data: serieActual
                        }
                    ],
                    tooltip: {
                        shared: true,
                        valuePrefix: '$',
                        valueDecimals: 2
                    },
                    credits: { enabled: false }
                });
            }
        }, 200);
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
