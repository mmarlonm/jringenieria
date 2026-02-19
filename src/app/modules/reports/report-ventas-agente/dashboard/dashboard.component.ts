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
// 🔹 NUEVO: Importar la interfaz Agente
import { ReportVentasAgenteService, Agente } from '../report-ventas-agente.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-reporte-ventas-agente-dashboard',
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
export class ReportVentasAgenteDashboardComponent implements OnInit {

    // 🔹 Highcharts
    public Highcharts: typeof Highcharts = Highcharts;
    public chartOptions: Highcharts.Options = {
        title: { text: '' },
        series: [{ type: 'column', data: [] }]
    };
    public updateFlag: boolean = false;

    // 🔹 Filtros
    public esMoral: number = 0;
    public sucursal: string = 'PACHUCA';
    public fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1); // 1 de Enero
    public fechaFin: Date = new Date();

    // 🔹 NUEVO: Variables para los Agentes
    public listaAgentes: Agente[] = [];
    public agenteSeleccionado: number = 0; // 0 = TODOS

    // 🔹 KPIs
    kpis = {
        totalVentas: 0,
        totalFacturas: 0,
        totalClientes: 0,
        ventaPromedio: 0,
        utilidadBruta: 0
    };

    // 🔹 Drilldown
    detalleVentas: any[] = [];
    private datosClasificacionOriginal: any[] = [];
    public marcaSeleccionada: string | null = null;

    public metaAnual: number = 0;
    public ventasAgenteActual: number = 0;
    public porcentajeMeta: number = 0;

    constructor(private reportVentasService: ReportVentasAgenteService) { }

    ngOnInit(): void {
        this.cargarAgentes(); // 🔹 NUEVO: Precargar los agentes al iniciar
        this.consultar();
    }

    // 🔹 NUEVO: Método para obtener la lista de agentes
    cargarAgentes(): void {
        this.reportVentasService.getAgentes().subscribe({
            next: (agentes) => {
                this.listaAgentes = agentes;
            },
            error: (err) => console.error('Error al cargar el catálogo de agentes', err)
        });
    }

    // 🔹 Consulta principal
    consultar(): void {
        this.reportVentasService
            .getDashboardVentasAgente(
                this.sucursal,
                this.agenteSeleccionado, // 🔹 NUEVO: Se envía el ID del agente seleccionado (o 0 para todos)
                new Date(this.fechaInicio),
                new Date(this.fechaFin),
                this.esMoral
            )
            .subscribe({
                next: resp => {

                    // ✅ Si no hay respuesta o viene vacío → reset
                    if (!resp || !resp.detalle || resp.detalle.length === 0) {
                        this.resetDashboard();
                        return;
                    }

                    this.mapearKPIs(resp);
                    this.mapearGraficas(resp);
                    this.detalleVentas = resp.detalle;

                    if (this.agenteSeleccionado !== 0) {
                        this.metaAnual = resp.metaAnual || 0;
                        if (resp.topVendedores && resp.topVendedores.length > 0) {
                            this.ventasAgenteActual = resp.topVendedores[0].totalVendido;
                        } else {
                            this.ventasAgenteActual = resp.kpis?.totalVentas || 0;
                        }

                        // Cálculo del porcentaje evitando división por cero
                        if (this.metaAnual > 0) {
                            this.porcentajeMeta = (this.ventasAgenteActual / this.metaAnual) * 100;
                        } else {
                            this.porcentajeMeta = 0;
                        }
                    }



                    this.datosClasificacionOriginal = resp.ventasPorClasificacion || []; // 🔹 Ajustado al nombre del DTO que definimos
                    this.generarGraficaMarcas();
                    this.generarGraficaLineas();
                },
                error: err => {
                    console.error('Error dashboard ventas', err);
                    this.resetDashboard();
                }
            });
    }

    private resetDashboard(): void {

        this.kpis = {
            totalVentas: 0,
            totalFacturas: 0,
            totalClientes: 0,
            ventaPromedio: 0,
            utilidadBruta: 0
        };

        this.detalleVentas = [];

        this.chartOptions = {
            title: { text: '' },
            series: [{ type: 'column', data: [] }]
        };

        this.updateFlag = true;

        ['chartComparativaMes', 'chartTopProductos', 'chartTopVendedores', 'chartMarcas', 'chartLineas']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

        this.metaAnual = 0;
        this.ventasAgenteActual = 0;
        this.porcentajeMeta = 0;
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


    private graficaVentasPorMes(data: any[]): void {
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        setTimeout(() => {
            const lineaTiempo = data
                .filter(d => d.periodo.toLowerCase() === 'actual')
                .map(d => ({ anio: d.anio, mes: d.mes }))
                .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));

            const categorias = lineaTiempo.map(p => `${mesesNombres[p.mes - 1]} ${p.anio.toString().slice(-2)}`);

            const serieActual = lineaTiempo.map(p => {
                const item = data.find(d => d.anio === p.anio && d.mes === p.mes && d.periodo.toLowerCase() === 'actual');
                return item ? item.totalMes : 0;
            });

            const serieAnterior = lineaTiempo.map(p => {
                const item = data.find(d => d.anio === p.anio && d.mes === p.mes && d.periodo.toLowerCase() === 'anterior');
                return item ? item.totalMes : 0;
            });

            const container = document.getElementById('chartComparativaMes');
            if (container) {
                (Highcharts as any).chart(container, {
                    chart: { type: 'column', backgroundColor: 'transparent' },
                    title: { text: '' },
                    xAxis: { categories: categorias, crosshair: true },
                    yAxis: {
                        min: 0,
                        title: { text: 'Monto ($)' },
                        labels: { format: '${value:,.0f}' }
                    },
                    plotOptions: {
                        column: { grouping: true, pointPadding: 0.1, groupPadding: 0.2, borderWidth: 0, borderRadius: 3 }
                    },
                    tooltip: {
                        shared: true,
                        useHTML: true,
                        formatter: function (this: any) {
                            const anterior = this.points[0]?.y || 0;
                            const actual = this.points[1]?.y || 0;

                            let crecimientoHtml = '';
                            if (anterior > 0) {
                                const porcentaje = ((actual - anterior) / anterior) * 100;
                                const color = porcentaje >= 0 ? '#10b981' : '#ef4444';
                                const icono = porcentaje >= 0 ? '▲' : '▼';

                                crecimientoHtml = `
                                <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #EEE;">
                                    <span style="color: ${color}; font-weight: bold;">
                                        Crecimiento: ${icono} ${porcentaje.toFixed(2)}%
                                    </span>
                                </div>`;
                            } else if (actual > 0) {
                                crecimientoHtml = `
                                <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #EEE;">
                                    <span style="color: #10b981; font-weight: bold;">Crecimiento: N/A (Nuevo)</span>
                                </div>`;
                            }

                            let s = `<span style="font-size: 10px; font-weight: bold;">${this.x}</span><br/>`;
                            this.points.forEach((point: any) => {
                                s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>$${point.y.toLocaleString()}</b><br/>`;
                            });

                            return s + crecimientoHtml;
                        }
                    },
                    series: [
                        { name: 'Año Anterior', color: '#94a3b8', data: serieAnterior },
                        { name: 'Año Actual', color: '#3b82f6', data: serieActual }
                    ],
                    credits: { enabled: false }
                });
            }
        }, 200);
    }

    private graficaTopProductos(data: any[]): void {
        Highcharts.chart('chartTopProductos', {
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: {
                text: 'Top Productos', align: 'center', verticalAlign: 'middle', y: 10,
                style: { fontSize: '14px', fontWeight: '600' }
            },
            tooltip: { pointFormat: '<b>{point.y:,.0f}</b> vendidos' },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '65%', borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}<br><span style="opacity:.7">{point.percentage:.1f}%</span>',
                        style: { fontSize: '11px', fontWeight: '500' }
                    },
                    states: { hover: { brightness: 0.05 } }
                }
            },
            series: [{
                name: 'Productos', type: 'pie',
                data: data.map(x => ({ name: x.producto, y: x.cantidadVendida }))
            }]
        });
    }

    private graficaTopVendedores(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#FFFFFF' : '#333333';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        const tooltipBorder = isDark ? '#1E293B' : '#E2E8F0';

        Highcharts.chart('chartTopVendedores', {
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: {
                text: 'Ventas por Vendedor', align: 'center', verticalAlign: 'middle', y: 10,
                style: { fontSize: '14px', fontWeight: '600', color: textColor }
            },
            tooltip: {
                backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
                style: { color: textColor },
                pointFormat: '<span style="color:' + textColor + '">Monto: <b>${point.y:,.2f}</b></span><br>' +
                    '<span style="color:' + textColor + '">Participación: <b>{point.percentage:.1f}%</b></span>'
            },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '65%', borderWidth: isDark ? 2 : 1, borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    dataLabels: {
                        enabled: true,
                        format: '<span style="color:' + textColor + '; font-weight: bold;">{point.name} ({point.percentage:.0f}%)</span><br>' +
                            '<span style="opacity:.6; color:' + textColor + '">${point.y:,.0f}</span>',
                        connectorColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                        connectorPadding: 5, distance: 20,
                        style: { fontSize: '11px', textOutline: 'none' }
                    },
                    states: { hover: { brightness: 0.05 } }
                }
            },
            series: [{
                name: 'Ventas', type: 'pie',
                data: data.map(x => ({ name: x.vendedor, y: x.totalVendido }))
            }]
        });
    }

    exportarPDF(): void {
        const element = document.getElementById('pdf-content');
        if (!element) return;

        html2canvas(element, { scale: 2, useCORS: true, scrollY: -window.scrollY }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`reporte-ventas-${new Date().getTime()}.pdf`);
        });
    }

    // 📊 Gráfica 1: Marcas (Padre)
    private generarGraficaMarcas(): void {
        const dataMarcas = this.datosClasificacionOriginal.reduce((acc, curr) => {
            const existe = acc.find(x => x.name === curr.marca);
            if (existe) {
                existe.y += curr.totalVendido;
            } else {
                acc.push({ name: curr.marca, y: curr.totalVendido });
            }
            return acc;
        }, [] as any[]);

        const self = this;

        Highcharts.chart('chartMarcas', {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Ventas por Marca',
                style: { fontSize: '14px', fontWeight: 'bold' }
            },
            subtitle: {
                text: 'Haga clic para filtrar líneas',
                style: { fontSize: '11px' }
            },
            tooltip: {
                pointFormat: 'Venta: <b>${point.y:,.2f}</b><br/>Participación: <b>{point.percentage:.1f}%</b>'
            },
            credits: { enabled: false },
            // 🔹 DESACTIVAR LEYENDA (Igual que en líneas)
            legend: { enabled: false },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    // 🔹 ETIQUETAS CON PORCENTAJE
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b><br>{point.percentage:.1f} %',
                        distance: 20,
                        style: {
                            fontSize: '10px',
                            textOutline: 'none',
                            fontWeight: 'normal'
                        }
                    },
                    showInLegend: false,
                    point: {
                        events: {
                            click: function () {
                                self.marcaSeleccionada = this.name;
                                self.generarGraficaLineas(this.name);
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Marcas',
                type: 'pie',
                innerSize: '60%', // 🔹 MISMO ESTILO DONUT
                data: dataMarcas
            }]
        });
    }

    // 📊 Gráfica 2: Líneas (Hijo)
    private generarGraficaLineas(marca?: string): void {
        let filtrados = this.datosClasificacionOriginal;

        if (marca) {
            filtrados = this.datosClasificacionOriginal.filter(x => x.marca === marca);
        }

        const dataLineas = filtrados.reduce((acc, curr) => {
            const existe = acc.find(x => x.name === curr.linea);
            if (existe) {
                existe.y += curr.totalVendido;
            } else {
                acc.push({ name: curr.linea, y: curr.totalVendido });
            }
            return acc;
        }, [] as any[]);

        Highcharts.chart('chartLineas', {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: marca ? `Líneas de ${marca}` : 'Todas las Líneas',
                style: { fontSize: '14px', fontWeight: 'bold' }
            },
            subtitle: {
                text: marca ? 'Participación por venta neta' : 'Seleccione una marca para filtrar',
                style: { fontSize: '11px' }
            },
            tooltip: {
                pointFormat: 'Venta: <b>${point.y:,.2f}</b><br/>Participación: <b>{point.percentage:.1f}%</b>'
            },
            credits: { enabled: false },
            // 🔹 DESACTIVAR LEYENDA
            legend: { enabled: false },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    // 🔹 ETIQUETAS CON PORCENTAJE
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b><br>{point.percentage:.1f} %',
                        distance: 20, // Distancia de la línea a la gráfica
                        style: {
                            fontSize: '10px',
                            textOutline: 'none',
                            fontWeight: 'normal'
                        }
                    },
                    // 🔹 ASEGURAR QUE NO SE MUESTREN EN LEYENDA
                    showInLegend: false
                }
            },
            series: [{
                name: 'Líneas',
                type: 'pie',
                innerSize: '60%', // Estilo Donut
                data: dataLineas
            }]
        });
    }

    public resetFiltroMarca(): void {
        this.marcaSeleccionada = null;
        this.generarGraficaLineas();
    }
}