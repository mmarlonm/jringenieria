import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { HighchartsChartModule } from 'highcharts-angular';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { ReportCustomersSegmentationService } from '../report-customers-segmentation.service';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import * as Highcharts from 'highcharts/highmaps';
import ExportingModule from 'highcharts/modules/exporting';
import Drilldown from 'highcharts/modules/drilldown';

// Inicializar módulos adicionales
if (typeof ExportingModule === 'function') {
    ExportingModule(Highcharts);
}
if (typeof Drilldown === 'function') {
    Drilldown(Highcharts);
}

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
        MatButtonModule,
        HttpClientModule
    ]
})
export class ReportCustomersDashboardComponent implements OnInit {
    Highcharts: typeof Highcharts = Highcharts;
    updateFlag = false;

    // Opciones para múltiples gráficas
    chartDonaLealtad: Highcharts.Options = {};
    chartSplineSegmento: Highcharts.Options = {};
    chartTopProductos: Highcharts.Options = {};
    chartVentasEstado: Highcharts.Options = {};
    chartMapHeatmap: any = null;
    chartMapHighlight: any = null;

    // Filtros
    esMoral = 0;
    sucursal = 'TODAS';
    fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1);
    fechaFin: Date = new Date();

    // Datos
    kpis: any[] = [];
    kpisOriginales: any[] = [];
    listaClientes: any[] = [];
    listaClientesOriginal: any[] = [];
    listaClientesFiltrada: any[] = [];
    detallesProductos: any[] = [];
    resumenGeograficoOriginal: any[] = [];
    totalVendido: number = 0;

    // Filtros
    clienteFiltroGlobal: any = 'TODOS';
    filtroNombre: string = '';
    filtroClasificacion: string = 'TODAS';

    constructor(
        private _reportService: ReportCustomersSegmentationService,
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.consultar();
    }

    consultar(): void {
        this._reportService
            .getDashboardCustomersSegmentation(this.sucursal, this.fechaInicio, this.fechaFin, this.esMoral)
            .subscribe({
                next: (resp: any) => {
                    if (resp) {
                        this.kpisOriginales = resp.resumenSegmentos || [];

                        // Ordenar para que Cliente Nuevo aparezca al inicio
                        this.kpisOriginales.sort((a, b) => {
                            if (a.clasificacion === 'Cliente Nuevo') return -1;
                            if (b.clasificacion === 'Cliente Nuevo') return 1;
                            return 0;
                        });

                        this.kpis = [...this.kpisOriginales];
                        this.listaClientesOriginal = resp.clientes || [];
                        this.listaClientes = [...this.listaClientesOriginal];
                        this.listaClientesFiltrada = [...this.listaClientes];
                        this.detallesProductos = resp.detallesProductos || [];
                        this.resumenGeograficoOriginal = resp.resumenGeografico || [];

                        this.clienteFiltroGlobal = 'TODOS';
                        this.actualizarDashboardGlobal();
                    }
                }
            });
    }

    actualizarDashboardGlobal(): void {
        // 1. Filtrar lista de clientes para la tabla
        this.aplicarFiltrosTabla();

        // 2. Si hay un cliente global seleccionado, recalculamos KPIs y totales
        if (this.clienteFiltroGlobal !== 'TODOS') {
            const cli = this.listaClientesOriginal.find(c => c.nombreCliente === this.clienteFiltroGlobal);
            if (cli) {
                this.kpis = this.kpisOriginales.map(s => {
                    const esMismoSegmento = s.clasificacion === cli.clasificacion;
                    return {
                        ...s,
                        numeroClientes: esMismoSegmento ? 1 : 0,
                        valorSegmento: esMismoSegmento ? cli.montoTotal : 0
                    };
                });
                this.totalVendido = cli.montoTotal;
            }
        } else {
            this.kpis = [...this.kpisOriginales];
            this.totalVendido = this.listaClientesOriginal.reduce((acc, curr) => acc + (curr.montoTotal || 0), 0);
        }
        // 3. Renderizar todas las gráficas
        this.renderGraficaDona();
        this.renderGraficaSpline();
        this.renderGraficaTopProductos();
        this.renderGraficaVentasEstado();
        this.renderMapas();
        this.updateFlag = true;
    }

    aplicarFiltrosTabla(): void {
        this.listaClientesFiltrada = this.listaClientesOriginal.filter(cli => {
            const matchGlobal = this.clienteFiltroGlobal === 'TODOS' || cli.nombreCliente === this.clienteFiltroGlobal;
            const matchNombre = (cli.nombreCliente || '').toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                (cli.rfc || '').toLowerCase().includes(this.filtroNombre.toLowerCase());
            const matchClasificacion = this.filtroClasificacion === 'TODAS' || cli.clasificacion === this.filtroClasificacion;

            return matchGlobal && matchNombre && matchClasificacion;
        });
    }

    private renderGraficaDona(): void {
        this.chartDonaLealtad = {
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: { text: 'Volumen de Clientes', style: { fontSize: '14px' } },
            plotOptions: { pie: { innerSize: '70%', dataLabels: { enabled: true, format: '{point.name}' } } },
            series: [{
                name: 'Clientes',
                data: this.kpis.map(s => ({
                    name: s.clasificacion,
                    y: s.numeroClientes,
                    color: this.getClasificacionColor(s.clasificacion)
                }))
            } as any]
        };
    }

    private renderGraficaSpline(): void {
        this.chartSplineSegmento = {
            chart: { type: 'spline', backgroundColor: 'transparent' },
            title: { text: 'Relación Valor vs. Volumen por Segmento', style: { fontSize: '14px', fontWeight: 'bold' } },
            xAxis: {
                categories: this.kpis.map(s => s.clasificacion),
                crosshair: true
            },
            yAxis: [{
                title: { text: 'Inversión Total ($)' },
                labels: { format: '${value:,.0f}' }
            }, {
                title: { text: 'Cant. Clientes' },
                opposite: true
            }],
            tooltip: { shared: true, borderRadius: 10 },
            series: [
                {
                    name: 'Monto Acumulado',
                    yAxis: 0,
                    data: this.kpis.map(s => s.valorSegmento),
                    color: '#6366f1',
                    marker: { enabled: true, radius: 5, symbol: 'circle' }
                },
                {
                    name: 'Número de Clientes',
                    yAxis: 1,
                    data: this.kpis.map(s => s.numeroClientes),
                    color: '#f59e0b',
                    dashStyle: 'ShortDash',
                    marker: { enabled: true, radius: 4, symbol: 'diamond' }
                }
            ] as any
        };
    }

    private renderGraficaTopProductos(): void {
        let dataFiltrada = [...this.detallesProductos];
        if (this.clienteFiltroGlobal !== 'TODOS') {
            const cli = this.listaClientesOriginal.find(c => c.nombreCliente === this.clienteFiltroGlobal);
            if (cli) {
                // Ahora usamos clienteId para filtrar con precisión
                dataFiltrada = this.detallesProductos.filter(p => p.clienteId === cli.clienteId);
            }
        }

        const productosMap = new Map<string, { monto: number, unidades: number }>();

        dataFiltrada.forEach(p => {
            const nombreProd = (p.producto || 'SIN NOMBRE').trim();

            /* Obtenemos el objeto actual o inicializamos uno nuevo */
            const actual = productosMap.get(nombreProd) || { monto: 0, unidades: 0 };

            productosMap.set(nombreProd, {
                monto: actual.monto + p.totalVendido,
                unidades: actual.unidades + (p.unidades || 0)
            });
        });

        /* Generamos el Top 10 basado en el monto */
        const top10 = Array.from(productosMap.entries())
            .sort((a, b) => b[1].monto - a[1].monto)
            .slice(0, 10);

        this.chartTopProductos = {
            chart: { type: 'bar', backgroundColor: 'transparent' },
            title: { text: 'Top 10 Productos Más Vendidos', style: { fontSize: '14px' } },
            xAxis: {
                categories: top10.map(p => p[0]),
                labels: { style: { fontSize: '9px' } }
            },
            yAxis: { title: { text: 'Venta Total' } },

            /* 🔹 Agregamos el formato para mostrar ambos datos */
            tooltip: {
                headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
                pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>${point.y:,.2f}</b><br/>' +
                    '<span style="color:#4ade80">\u25CF</span> Unidades: <b>{point.unidades:,.0f}</b>'
            },

            series: [{
                name: 'Ventas ($)',
                color: '#6366f1',
                /* 🔹 Mapeamos como objeto para que el tooltip reconozca "unidades" */
                data: top10.map(p => ({
                    y: p[1].monto,
                    unidades: p[1].unidades
                }))
            } as any]
        };
    }

    private renderGraficaVentasEstado(): void {
        // Agrupar ventas por estado (Normalizando nombres)
        const estadosMap = new Map();

        const dataParaMapa = this.clienteFiltroGlobal === 'TODOS'
            ? this.listaClientesOriginal
            : this.listaClientesOriginal.filter(c => c.nombreCliente === this.clienteFiltroGlobal);

        dataParaMapa.forEach(c => {
            let edo = (c.estado || '').trim().toUpperCase();
            if (!edo || edo === 'DESCONOCIDO' || edo === 'SIN ASIGNAR') {
                edo = 'OTROS / SIN ESTADO';
            }
            const actual = estadosMap.get(edo) || 0;
            estadosMap.set(edo, actual + c.montoTotal);
        });

        const dataEstados = Array.from(estadosMap.entries())
            .sort((a, b) => b[1] - a[1]);

        this.chartVentasEstado = {
            chart: { type: 'column', backgroundColor: 'transparent' },
            title: { text: 'Distribución Geográfica de Ventas', style: { fontSize: '14px', fontWeight: 'bold' } },
            subtitle: { text: 'Monto total por entidad federativa' },
            xAxis: {
                categories: dataEstados.map(e => e[0]),
                labels: { rotation: -45, style: { fontSize: '9px', fontWeight: '600' } }
            },
            yAxis: {
                title: { text: 'Monto de Venta ($)' },
                labels: { format: '${value:,.0f}' }
            },
            tooltip: {
                pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>${point.y:,.2f}</b><br/>'
            },
            plotOptions: {
                column: {
                    borderRadius: 5,
                    colorByPoint: true,
                    colors: ['#312e81', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']
                }
            },
            series: [{
                name: 'Ventas por Estado',
                data: dataEstados.map(e => e[1]),
                showInLegend: false
            } as any]
        };
    }

    private renderMapas(): void {
        const mexicoMapUrl = 'https://code.highcharts.com/mapdata/countries/mx/mx-all.topo.json';

        this.http.get(mexicoMapUrl).subscribe({
            next: (topology: any) => {
                const estadosMap = new Map();

                // Usamos siempre listaClientesOriginal para asegurar la integridad de los datos
                const dataFuente = this.clienteFiltroGlobal === 'TODOS'
                    ? this.listaClientesOriginal
                    : this.listaClientesOriginal.filter(c => c.nombreCliente === this.clienteFiltroGlobal);

                dataFuente.forEach(c => {
                    // Normalizamos el estado para buscar su key
                    const key = this.getMapKey(c.estado);
                    if (key) {
                        const actual = estadosMap.get(key) || 0;
                        estadosMap.set(key, actual + (c.montoTotal || 0));
                    }
                });
                // Preparar datos para Heatmap con Drilldown
                const dataHeatmap = Array.from(estadosMap.entries()).map(([hcKey, value]) => ({
                    'hc-key': hcKey,
                    value: value,
                    drilldown: hcKey // Habilitar drilldown usando la misma clave del estado
                }));

                // Preparar datos para Highlight
                const dataHighlight = Array.from(estadosMap.keys()).map(hcKey => ({
                    'hc-key': hcKey,
                    value: 1
                }));

                // 1. Configuración Heatmap Drilldown
                this.chartMapHeatmap = {
                    chart: {
                        map: topology,
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                        events: {
                            drilldown: (e: any) => {
                                if (!e.seriesOptions) {
                                    const chart = e.target;
                                    const mapKey = `countries/mx/${e.point.drilldown}-all`;

                                    // Mostrar loading
                                    chart.showLoading('<i class="icon-spinner icon-spin icon-3x"></i> Cargando municipios...');

                                    // Cargar mapa estatal de Highcharts
                                    this.http.get(`https://code.highcharts.com/mapdata/${mapKey}.topo.json`).subscribe({
                                        next: (stateTopology: any) => {
                                            const stateData = Highcharts.geojson(stateTopology);

                                            // Intentar mapear ventas por municipio/ciudad si es posible
                                            // Filtramos los clientes del estado seleccionado
                                            // Nota: e.point.name es el nombre del estado (ej. "Jalisco")
                                            const clientesEstado = dataFuente.filter(c =>
                                                this.getMapKey(c.estado) === e.point.drilldown
                                            );

                                            // Mapa simple de municipios con valor 0 o ventas reales si coinciden nombres
                                            stateData.forEach((d: any) => {
                                                d.value = 0; // Valor inicial
                                                // Lógica simple de coincidencia por nombre de municipio (si existiera en cli.municipio o cli.ciudad)
                                                // Como no tenemos certeza del campo municipio estandarizado, mostramos estructura base
                                                // Si se requiere precision, se necesitaria normalizar nombres de municipios

                                                // TODO: Implementar coincidencia exacta de municipios cuando se tenga catálogo
                                                /*
                                                const match = clientesEstado.find(c => 
                                                    c.ciudad?.toUpperCase() === d.properties.name?.toUpperCase()
                                                );
                                                if (match) d.value += match.montoTotal;
                                                */
                                            });

                                            chart.hideLoading();
                                            chart.addSeriesAsDrilldown(e.point, {
                                                name: e.point.name,
                                                data: stateData,
                                                dataLabels: {
                                                    enabled: true,
                                                    format: '{point.name}',
                                                    style: { fontSize: '9px', fontWeight: 'normal', textOutline: 'none' }
                                                },
                                                tooltip: {
                                                    headerFormat: '',
                                                    pointFormat: '<b>{point.name}</b><br>Ventas: <b>${point.value:,.2f}</b>' // Mostrar 0 por ahora
                                                }
                                            });
                                        },
                                        error: (err) => {
                                            chart.hideLoading();
                                            console.warn(`Mapa detallado no disponible para ${e.point.name} (${mapKey})`, err);

                                            // Feedback visual temporal en el gráfico
                                            chart.showLoading(`<span style="font-size: 12px; color: white;">Detalle municipal no disponible para ${e.point.name}</span>`);
                                            setTimeout(() => {
                                                chart.hideLoading();
                                            }, 2000);
                                        }
                                    });
                                }
                            }
                        }
                    },
                    title: { text: null },
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom',
                        title: { text: 'Ventas ($)' }
                    },
                    colorAxis: {
                        min: 0,
                        stops: [
                            [0, '#3b82f6'],   // Azul (Pocas ventas)
                            [0.4, '#eab308'], // Amarillo
                            [0.7, '#f97316'], // Naranja
                            [1, '#dc2626']    // Rojo (Muchas ventas)
                        ]
                    },
                    mapNavigation: {
                        enabled: true,
                        buttonOptions: { verticalAlign: 'bottom' }
                    },
                    series: [{
                        name: 'Monto de Ventas',
                        allAreas: true,
                        data: dataHeatmap,
                        joinBy: 'hc-key',
                        dataLabels: {
                            enabled: true,
                            format: '{point.name}',
                            style: { fontSize: '9px', fontWeight: 'normal', textOutline: 'none' }
                        },
                        tooltip: {
                            headerFormat: '',
                            pointFormat: '<b>{point.name}</b><br>Ventas: <b>${point.value:,.2f}</b>'
                        }
                    }],
                    drilldown: {
                        activeDataLabelStyle: {
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            textOutline: '1px #000000'
                        },
                        drillUpButton: {
                            relativeTo: 'spacingBox',
                            position: {
                                y: 0,
                                x: 0
                            },
                            theme: {
                                fill: 'white',
                                'stroke-width': 1,
                                stroke: 'silver',
                                r: 0,
                                states: {
                                    hover: {
                                        fill: '#f0f0f0'
                                    },
                                    select: {
                                        stroke: '#039',
                                        fill: '#f0f0f0'
                                    }
                                }
                            }
                        }
                    }
                };

                // 2. Configuración Highlight
                this.chartMapHighlight = {
                    chart: {
                        map: topology,
                        backgroundColor: 'transparent'
                    },
                    title: { text: null },
                    legend: { enabled: false },
                    mapNavigation: { enabled: true },
                    plotOptions: {
                        map: {
                            allAreas: true,
                            joinBy: 'hc-key',
                            nullColor: '#f1f5f9',
                            borderColor: '#cbd5e1',
                            borderWidth: 0.5
                        }
                    },
                    series: [{
                        name: 'Presencia Comercial',
                        data: dataHighlight,
                        color: '#6366f1',
                        states: {
                            hover: { color: '#4338ca' }
                        },
                        dataLabels: {
                            enabled: true,
                            format: '{point.name}',
                            style: { fontSize: '8px', color: '#64748b' }
                        },
                        tooltip: {
                            pointFormat: '{point.name}: Activo'
                        }
                    }]
                };

                this.updateFlag = true;
                this.cdr.detectChanges(); // Asegurar refresco
            },
            error: (err) => console.error('Error al cargar topografía:', err)
        });
    }

    private getMapKey(estado: string): string {
        if (!estado) return null;
        const e = estado.trim().toUpperCase();
        // Mapeo basado en 'hc-key' del TopoJSON de Highcharts (mx-all)
        const mapping: { [key: string]: string } = {
            'AGUASCALIENTES': 'mx-ag',
            'BAJA CALIFORNIA': 'mx-bc',
            'BAJA CALIFORNIA SUR': 'mx-bs',
            'CAMPECHE': 'mx-cm',
            'CHIAPAS': 'mx-cs',
            'CHIHUAHUA': 'mx-ch',
            'COAHUILA': 'mx-co',
            'COAHUILA DE ZARAGOZA': 'mx-co',
            'COLIMA': 'mx-cl',
            'CIUDAD DE MEXICO': 'mx-df',
            'CIUDAD DE MÉXICO': 'mx-df',
            'CDMX': 'mx-df',
            'DISTRITO FEDERAL': 'mx-df',
            'DURANGO': 'mx-dg',
            'GUANAJUATO': 'mx-gj',
            'GUERRERO': 'mx-gr',
            'HIDALGO': 'mx-hg',
            'JALISCO': 'mx-ja',
            'MEXICO': 'mx-mx',
            'MÉXICO': 'mx-mx',
            'ESTADO DE MEXICO': 'mx-mx',
            'ESTADO DE MÉXICO': 'mx-mx',
            'EDOMEX': 'mx-mx',
            'MICHOACAN': 'mx-mi',
            'MICHOACÁN': 'mx-mi',
            'MICHOACÁN DE OCAMPO': 'mx-mi',
            'MORELOS': 'mx-mo',
            'NAYARIT': 'mx-na',
            'NUEVO LEON': 'mx-nl',
            'NUEVO LEÓN': 'mx-nl',
            'OAXACA': 'mx-oa',
            'PUEBLA': 'mx-pu',
            'QUERETARO': 'mx-qt',
            'QUERÉTARO': 'mx-qt',
            'QUINTANA ROO': 'mx-qr',
            'SAN LUIS POTOSI': 'mx-sl',
            'SAN LUIS POTOSÍ': 'mx-sl',
            'SINALOA': 'mx-si',
            'SONORA': 'mx-so',
            'TABASCO': 'mx-tb',
            'TAMAULIPAS': 'mx-tm',
            'TLAXCALA': 'mx-tl',
            'VERACRUZ': 'mx-ve',
            'VERACRUZ DE IGNACIO DE LA LLAVE': 'mx-ve',
            'YUCATAN': 'mx-yu',
            'YUCATÁN': 'mx-yu',
            'ZACATECAS': 'mx-za'
        };
        return mapping[e] || null;
    }

    getClasificacionColor(clasificacion: string): string {
        const colors: any = {
            'Cliente Estratégico': '#f59e0b',
            'Cliente Fidelizado': '#10b981',
            'Cliente Habitual': '#06b6d4',
            'Cliente Recurrente': '#3b82f6',
            'Cliente Nuevo': '#94a3b8'
        };
        return colors[clasificacion] || '#64748b';
    }

    /* * Nombre: exportarPDF
     * Descripción: Captura el div #pdf-content y genera un archivo descargable.
     */
    exportarPDF(): void {
        const element = document.getElementById('pdf-content');
        if (!element) return;

        html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#f9fafb'
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`reporte-segmentacion-${Date.now()}.pdf`);
        });
    }
}