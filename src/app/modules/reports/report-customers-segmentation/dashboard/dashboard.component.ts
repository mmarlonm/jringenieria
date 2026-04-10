import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { HighchartsChartModule } from 'highcharts-angular';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
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
        MatTooltipModule,
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
    chartTopClientes: any = null;
    chartMapHeatmap: any = null;
    chartMapHighlight: any = null;

    // Modal de productos por cliente
    isModalOpen: boolean = false;
    modalProductos: any[] = [];
    clienteSeleccionado: string = '';
    totalVendidoModal: number = 0;

    // Filtros
    esMoral = 0;
    sucursal = 'TODAS';
    fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1);
    fechaFin: Date = new Date();

    sucursales = [
        { value: 'TODAS', label: 'TODAS' },
        { value: 'PACHUCA', label: 'Pachuca' },
        { value: 'Puebla', label: 'Puebla' },
        { value: 'Queretaro', label: 'Querétaro' }
    ];
    sucursalesDisponibles: any[] = [];

    // Datos
    kpis: any[] = [];
    kpisOriginales: any[] = [];
    listaClientes: any[] = [];
    listaClientesOriginal: any[] = [];
    listaClientesFiltrada: any[] = [];
    detallesProductos: any[] = [];
    resumenGeograficoOriginal: any[] = [];
    totalVendido: number = 0;

    loading = false;

    // Filtros
    clienteFiltroGlobal: any = 'TODOS';
    filtroNombre: string = '';
    filtroClasificacion: string = 'TODAS';

    constructor(
        private _reportService: ReportCustomersSegmentationService,
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.verificarRoles();
        this.route.queryParams.subscribe(params => {
            if (params['cliente']) {
                this.clienteFiltroGlobal = params['cliente'];
            }
            this.consultar();
        });
    }

    verificarRoles(): void {
        const userStr = localStorage.getItem('userInformation');
        if (userStr) {
            const userData = JSON.parse(userStr);
            const roles = userData.roles || [];
            const esAdmin = roles.some((r: string) => ['Admin', 'pruebas', 'AdministracionQueretaro', 'Admin'].includes(r));

            if (esAdmin) {
                this.sucursalesDisponibles = [...this.sucursales];
            } else {
                const nombreUnidad = userData.usuario?.unidadNegocio?.nombre;
                if (nombreUnidad) {
                    let unidadNormalizada = nombreUnidad.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (unidadNormalizada === 'hidalgo') {
                        unidadNormalizada = 'pachuca';
                    }
                    this.sucursalesDisponibles = this.sucursales.filter(s =>
                        s.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === unidadNormalizada
                    );
                    if (this.sucursalesDisponibles.length > 0) {
                        this.sucursal = this.sucursalesDisponibles[0].value;
                    } else {
                        this.sucursalesDisponibles = [...this.sucursales];
                    }
                } else {
                    this.sucursalesDisponibles = [...this.sucursales];
                }
            }
        } else {
            this.sucursalesDisponibles = [...this.sucursales];
        }
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

                        this.actualizarDashboardGlobal();
                    }
                }
            });
    }

    actualizarDashboardGlobal(): void {
        // 1. Filtrar lista de clientes para la tabla
        this.aplicarFiltrosTabla();

        // 2. Si hay un cliente global seleccionado, recalculamos KPIs y totales
        if (this.clienteFiltroGlobal && this.clienteFiltroGlobal !== 'TODOS') {
            const cli = this.listaClientesOriginal.find(c => 
                (c.nombreCliente || '').trim().toUpperCase() === this.clienteFiltroGlobal.toString().trim().toUpperCase()
            );
            if (cli) {
                // Sincronizamos el valor exacto para que el MatSelect lo reconozca
                this.clienteFiltroGlobal = cli.nombreCliente;

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
            this.totalVendido = this.kpisOriginales.reduce((acc, curr) => acc + (curr.valorSegmento || 0), 0);
        }
        // 3. Renderizar todas las gráficas
        this.renderGraficaDona();
        this.renderGraficaSpline();
        this.renderGraficaTopProductos();
        this.renderGraficaVentasEstado();
        this.renderGraficaTopClientes();
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

    private renderGraficaTopClientes(): void {
        const clientesUnicos = this.listaClientesUnica
            .sort((a, b) => (b.montoTotal || 0) - (a.montoTotal || 0))
            .slice(0, 10);

        this.chartTopClientes = {
            chart: { type: 'pie', backgroundColor: 'transparent' },
            title: { text: null }, // Mantenemos el título en el HTML para mejor control
            tooltip: {
                pointFormat: '{series.name}: <b>${point.y:,.2f}</b> ({point.percentage:.1f}%)'
            },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                        distance: 20
                    },
                    showInLegend: false
                }
            },
            legend: { enabled: false },
            series: [{
                name: 'Inversión Total',
                colorByPoint: true,
                data: clientesUnicos.map(c => ({
                    name: c.nombreCliente,
                    y: c.montoTotal
                }))
            } as any],
            credits: { enabled: false }
        };
        
        if (clientesUnicos.length === 0) {
            this.chartTopClientes = null;
        }
        
        this.updateFlag = true;
        this.cdr.detectChanges();
    }

    verDetallesProducto(cli: any): void {
        this.clienteSeleccionado = cli.nombreCliente;
        
        // El usuario ya agregó folioCompleto en detallesProductos para un filtrado exacto
        this.modalProductos = this.detallesProductos.filter((p: any) => 
            p.folioCompleto === cli.folioCompleto
        );

        this.totalVendidoModal = this.modalProductos.reduce((acc, p) => acc + (p.totalVendido || 0), 0);
        this.isModalOpen = true;
        this.cdr.detectChanges();
    }

    cerrarModal(): void {
        this.isModalOpen = false;
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

    get listaClientesUnica(): any[] {
        const seen = new Set<string>();
        return this.listaClientesOriginal.filter(c => {
            if (seen.has(c.nombreCliente)) return false;
            seen.add(c.nombreCliente);
            return true;
        });
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

    /* * Nombre: exportarPDFEstadoSegmentacion
     * Descripción: Genera un PDF de Estado de Cuenta para el cliente filtrado.
     */
    async exportarPDFEstadoSegmentacion(): Promise<void> {
        this.loading = true;
        const data = this.listaClientesFiltrada || [];
        if (data.length === 0) {
            this.loading = false;
            return;
        }

        const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            if (typeof dateStr === 'string' && dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const year = parseInt(parts[2], 10);
                    return new Date(year, month, day);
                }
            }
            return new Date(dateStr);
        };

        const calculateDiasVencidos = (vencimientoStr: string, estatus: string) => {
            if (estatus === 'PAGADA') return 0;
            const vDate = parseDate(vencimientoStr);
            if (!vDate || isNaN(vDate.getTime())) return 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            vDate.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - vDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        };

        // --- FUNCIÓN DE NÚMEROS A LETRAS (Sin leyendas extra) ---
        const numeroALetras = (n: number, moneda: string = 'MXN'): string => {
            const unidades = ["", "UN ", "DOS ", "TRES ", "CUATRO ", "CINCO ", "SEIS ", "SIETE ", "OCHO ", "NUEVE "];
            const decenas = ["DIEZ ", "VEINTE ", "TREINTA ", "CUARENTA ", "CINCUENTA ", "SESENTA ", "SETENTA ", "OCHENTA ", "NOVENTA "];
            const centenas = ["", "CIENTO ", "DOSCIENTOS ", "TRESCIENTOS ", "CUATROCIENTOS ", "QUINIENTOS ", "SEISCIENTOS ", "SETECIENTOS ", "OCHOCIENTOS ", "NOVECIENTOS "];

            const convertirSeccion = (num: number) => {
                let output = "";
                if (num >= 100) {
                    if (num === 100) return "CIEN ";
                    output += centenas[Math.floor(num / 100)];
                    num %= 100;
                }
                if (num >= 10) {
                    const especiales = ["DIEZ ", "ONCE ", "DOCE ", "TRECE ", "CATORCE ", "QUINCE "];
                    if (num <= 15) return output + especiales[num - 10];
                    output += decenas[Math.floor(num / 10) - 1];
                    if (num % 10 > 0) output += "Y ";
                    num %= 10;
                }
                output += unidades[num];
                return output;
            };

            let entero = Math.floor(n);
            let centavos = Math.round((n - entero) * 100);
            let resultado = "";

            if (entero === 0) resultado = "CERO ";
            else {
                if (entero >= 1000000) {
                    let millones = Math.floor(entero / 1000000);
                    resultado += (millones === 1 ? "UN MILLÓN " : convertirSeccion(millones) + "MILLONES ");
                    entero %= 1000000;
                }
                if (entero >= 1000) {
                    let miles = Math.floor(entero / 1000);
                    resultado += (miles === 1 ? "MIL " : convertirSeccion(miles) + "MIL ");
                    entero %= 1000;
                }
                resultado += convertirSeccion(entero);
            }

            const sufijo = moneda === 'MXN' ? "PESOS" : "DÓLARES";
            const mnc = moneda === 'MXN' ? "M.N." : "USD";
            return `(${resultado}${sufijo} ${centavos.toString().padStart(2, '0')}/100 ${mnc})`.toUpperCase();
        };

        const totalCargos = data.reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);
        
        // Pagos Brutos = Suma de montos de facturas positivas ya pagadas
        const grossPayments = data
            .filter(item => (item.montoDocumento || 0) > 0 && item.estatusPago === 'PAGADA')
            .reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);

        // Saldo Final = Monto Neto (Facturas - Notas Credito) menos Pagos Brutos.
        // Si el resultado es negativo pero hay facturas pagadas, limitamos el saldo a 0 (caso GASPE).
        // Si el monto total es realmente negativo (saldo a favor), se mantiene (caso sobrepago real).
        const totalSaldos = (totalCargos > 0) ? Math.max(0, totalCargos - grossPayments) : totalCargos;
        const totalAbonos = totalCargos - totalSaldos;

        const cliente = data[0].nombreCliente || '';
        const rfc = data[0].rfc || '';
        const clienteId = data[0].clienteId || '-';
        const sucursal = this.sucursal || 'TODAS';
        const fInicio = formatDate(this.fechaInicio.toISOString());
        const fFin = formatDate(this.fechaFin.toISOString());

        let tableRows = '';
        data.forEach((item, i) => {
            const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            const cargo = (item.montoDocumento || 0);
            // El saldo individual es 0 si está pagada, de lo contrario es el monto.
            // (El ajuste de las Notas de Crédito se refleja en el Saldo Final del reporte).
            const saldo = (item.estatusPago === 'PAGADA' ? 0 : cargo);
            const abono = cargo - saldo;
            const estatus = item.estatusPago || '';
            const diasVencidos = calculateDiasVencidos(item.fechaVencimiento, estatus);

            tableRows += `
        <tr style="background-color: ${bgColor}; color: #374151; font-size: 9px;">
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatDate(item.fechaDocumento)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${item.folioCompleto || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">Venta de Equipos/Serv.</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.moneda || 'MXN'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(cargo)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${abono > 0 ? formatCurrency(abono) : '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(saldo)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.fechaVencimiento || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${diasVencidos}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${estatus === 'VENCIDA' ? '#dc2626' : '#16a34a'};">${estatus}</td>
        </tr>
    `;
        });

        // Calcular los totales por moneda para mostrar en las cajas finales
        const totalMXN = data
            .filter(c => (c.moneda || 'MXN').toUpperCase() === 'MXN')
            .reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);

        const totalUSD = data
            .filter(c => (c.moneda || '').toUpperCase() === 'USD')
            .reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);


        let bankAccountsRows = '';
        // 🔹 Lógica condicional según Tipo de Cliente (Física vs Moral)
        if (this.esMoral === 1) {
            // PERSONA FÍSICA: Jesus Ricardo Mendez (Solo MXN según requerimiento)
            if (totalMXN > 0) {
                bankAccountsRows += `
            <div style="flex: 1; min-width: 250px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="background-color: #004481; color: white; border-radius: 4px; padding: 4px 8px; font-weight: 900; font-size: 10px; letter-spacing: 0.5px;">BBVA</div>
                <div style="flex: 1; border-left: 1px solid #e2e8f0; padding-left: 12px; display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.3px;">Cuenta MXN</div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">Titular: <span style="font-family: monospace;">JESUS RICARDO MENDEZ</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">RFC: <span style="font-family: monospace;">MEAJ730516T86</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">No. Cuenta: <span style="font-family: monospace;">0478628203</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">CLABE: <span style="font-family: monospace;">012290004786282030</span></div>
                </div>
            </div>`;
            }
        } else {
            // PERSONA MORAL: JR Ingenieria Electrica
            if (totalMXN > 0) {
                bankAccountsRows += `
            <div style="flex: 1; min-width: 250px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="background-color: #004481; color: white; border-radius: 4px; padding: 4px 8px; font-weight: 900; font-size: 10px; letter-spacing: 0.5px;">BBVA</div>
                <div style="flex: 1; border-left: 1px solid #e2e8f0; padding-left: 12px; display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.3px;">Cuenta MXN</div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">Titular: <span style="font-family: monospace;">JR INGENIERIA ELECTRICA</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">No. de Cliente BBVA: <span style="font-family: monospace;">E3477448</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">RFC: <span style="font-family: monospace;">JIE250214R69</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">No. Cuenta: <span style="font-family: monospace;">0124948939</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">CLABE: <span style="font-family: monospace;">012290001249489399</span></div>
                </div>
            </div>`;
            }
            if (totalUSD > 0) {
                bankAccountsRows += `
            <div style="flex: 1; min-width: 250px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="background-color: #004481; color: white; border-radius: 4px; padding: 4px 8px; font-weight: 900; font-size: 10px; letter-spacing: 0.5px;">BBVA</div>
                <div style="flex: 1; border-left: 1px solid #e2e8f0; padding-left: 12px; display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.3px;">Cuenta USD</div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">Titular: <span style="font-family: monospace;">JR INGENIERIA ELECTRICA</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">No. de Cliente BBVA: <span style="font-family: monospace;">E3477448</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">RFC: <span style="font-family: monospace;">JIE250214R69</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">No. Cuenta: <span style="font-family: monospace;">0124949706</span></div>
                    <div style="font-size: 9px; color: #1e293b; font-weight: bold;">CLABE: <span style="font-family: monospace;">012290001249497064</span></div>
                </div>
            </div>`;
            }
        }

        const container = document.createElement('div');
        container.id = 'temp-pdf-seg-container';
        container.setAttribute('style', 'width: 850px; background-color: white; font-family: Arial, sans-serif; position: absolute; left: -9999px; top: 0; display: flex; flex-direction: column; padding: 0; margin: 0;');

        container.innerHTML = `
    <div style="width: 100%; height: 30px; background-color: #d1d5db; position: relative; display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0;">
        <div style="background-color: #d1d5db; height: 100%; width: 200px; border-top-right-radius: 50px; border-bottom-right-radius: 50px; display: flex; align-items: center; justify-content: center; position: absolute; z-index: 1; right:30px">
             <span style="color: #1e4b8a; font-weight: bold; font-size: 11px;">ESTADO DE CUENTA</span>
        </div>
        <div style="background-color: #166534; height: 100%; width: 60px;"></div>
    </div>

    <div style="padding: 5px 40px; flex: 1; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 15px; width: 100%;">
                <img src="images/logo/logo-new-jrbk.png" alt="Logo JR" style="max-height: 130px; max-width: 150px; object-fit: contain;">
                <h1 style="text-align: center; color: #1e4b8a; font-size: 26px; font-weight: bold; margin: 0; letter-spacing: 1px; flex: 1;">
                JR INGENIERÍA ELÉCTRICA
            </h1>
            </div>
        </div>

        <div style="background-color: #e0f2fe; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
            <p style="margin: 1px 0; font-size: 10px; color: #1e3a8a;"><strong>CLIENTE:</strong> ${cliente}</p>
            <p style="margin: 1px 0; font-size: 10px; color: #1e3a8a;"><strong>RFC:</strong> ${rfc}</p>
            <p style="margin: 1px 0; font-size: 10px; color: #1e3a8a;"><strong>SUCURSAL:</strong> ${sucursal}</p>
            <p style="margin: 1px 0; font-size: 10px; color: #1e3a8a;"><strong>FILTRADO:</strong> ${fInicio} - ${fFin}</p>
        </div>

        <div style="background-color: #16a34a; color: white; text-align: center; padding: 10px; border-radius: 6px; margin-bottom: 15px; width: 100%;">
            <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px;">SALDO PENDIENTE:</div>
            <div style="font-size: 24px; font-weight: 900; margin-top: 1px; white-space: nowrap;">${formatCurrency(totalSaldos)} MXN</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
                <tr style="background-color: #1e4b8a; color: #ffffff; font-size: 8px;">
                    <th style="padding: 8px; text-align: center;">NO.</th>
                    <th style="padding: 8px; text-align: center;">FECHA FACTURACION</th>
                    <th style="padding: 8px; text-align: center;">FOLIO</th>
                    <th style="padding: 8px; text-align: center;">DESCRIPCION</th>
                    <th style="padding: 8px; text-align: center;">MONEDA</th>
                    <th style="padding: 8px; text-align: right;">CARGO</th>
                    <th style="padding: 8px; text-align: right;">ABONO</th>
                    <th style="padding: 8px; text-align: right;">SALDO</th>
                    <th style="padding: 8px; text-align: center;">VENCIMIENTO</th>
                    <th style="padding: 8px; text-align: center;">DIAS VENCIDOS</th>
                    <th style="padding: 8px; text-align: center;">STATUS</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>

        <!-- Resumen de totales -->
        <div style="display: flex; justify-content: flex-start; gap: 10px; margin-bottom: 20px;">
            <div style="background-color: #e5e7eb; padding: 8px; border-radius: 6px; min-width: 120px; text-align: center;">
                <div style="font-size: 9px; font-weight: bold; color: #374151; margin-bottom: 2px;">TOTAL CARGOS</div>
                <div style="font-size: 14px; font-weight: 900; color: #1f2937; white-space: nowrap;">${formatCurrency(totalCargos)}</div>
            </div>
            <div style="background-color: #e5e7eb; padding: 8px; border-radius: 6px; min-width: 120px; text-align: center;">
                <div style="font-size: 9px; font-weight: bold; color: #374151; margin-bottom: 2px;">TOTAL ABONOS</div>
                <div style="font-size: 14px; font-weight: 900; color: #1f2937; white-space: nowrap;">${formatCurrency(totalAbonos)}</div>
            </div>
            <div style="background-color: #16a34a; padding: 8px; border-radius: 6px; min-width: 140px; text-align: center; color: white;">
                <div style="font-size: 9px; font-weight: bold; margin-bottom: 2px;">SALDO FINAL</div>
                <div style="font-size: 14px; font-weight: 900; white-space: nowrap;">${formatCurrency(totalSaldos)}</div>
            </div>
        </div>

        <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: stretch; border: 1px solid #94a3b8; min-height: 30px;">
                <div style="background-color: #84cc16; color: white; padding: 3px 8px; font-weight: bold; font-size: 8px; width: 150px; display: flex; align-items: center; flex-shrink: 0;">MONTO TOTAL FACTURAS MXN</div>
                <div style="padding: 3px 8px; width: 90px; font-weight: bold; border-left: 1px solid #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; white-space: nowrap; font-size: 9px;">${formatCurrency(totalMXN)}</div>
                <div style="padding: 3px 8px; flex: 1; border-left: 1px solid #94a3b8; font-size: 8px; font-weight: bold; display: flex; align-items: center; background-color: #f9fafb; color: #1f2937; word-break: break-word;">
                    ${numeroALetras(totalMXN, 'MXN')}
                </div>
            </div>
            <div style="display: flex; align-items: stretch; border: 1px solid #94a3b8; min-height: 30px;">
                <div style="background-color: #f59e0b; color: white; padding: 3px 8px; font-weight: bold; font-size: 8px; width: 150px; display: flex; align-items: center; flex-shrink: 0;">MONTO TOTAL FACTURAS USD</div>
                <div style="padding: 3px 8px; width: 90px; font-weight: bold; border-left: 1px solid #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; white-space: nowrap; font-size: 9px;">$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div style="padding: 3px 8px; flex: 1; border-left: 1px solid #94a3b8; font-size: 8px; font-weight: bold; display: flex; align-items: center; background-color: #f9fafb; color: #1f2937; word-break: break-word;">
                    ${numeroALetras(totalUSD, 'USD')}
                </div>
            </div>

            <!-- Cuentas Bancarias -->
            <div style="margin-top: 15px; display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap;">
                ${bankAccountsRows}
            </div>
        </div>

        <div style="margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 8px; font-size: 9px; color: #6b7280; margin-bottom: 20px;">
            Este documento es informativo y no constituye comprobante fiscal. Para cualquier aclaración contacte a su departamento de cobranza, email: cobranza@jringenieriaelectrica.com
        </div>
    </div>
    `;

        const footerWrapper = document.createElement('div');
        footerWrapper.setAttribute('style', 'width: 850px; position: absolute; left: -9999px; top: 0;');
        footerWrapper.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; align-items: flex-end;">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 10px; display: block;">
                <polygon points="20,0 100,0 100,100 24,100" fill="#009640" />
            </svg>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 85%; height: 10px; display: block;">
                <polygon points="0,0 100,0 100,100 4,100" fill="#005A9C" />
            </svg>
        </div>
    `;

        document.body.appendChild(container);
        document.body.appendChild(footerWrapper);

        try {
            const canvas = await html2canvas(container, { scale: 2, useCORS: true });
            const footerCanvas = await html2canvas(footerWrapper, { scale: 2, useCORS: true });

            const imgData = canvas.toDataURL('image/png');
            const footerImgData = footerCanvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const footerHeight = (footerCanvas.height * pdfWidth) / footerCanvas.width;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            // Función para añadir el footer a la página actual con una máscara blanca para evitar superposiciones
            const addFooter = () => {
                // Dibujar un rectángulo blanco que cubra el área del footer (un poco más alto para seguridad)
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, pdfHeight - footerHeight - 2, pdfWidth, footerHeight + 2, 'F');
                // Añadir la imagen del footer encima
                pdf.addImage(footerImgData, 'PNG', 0, pdfHeight - footerHeight, pdfWidth, footerHeight);
            };

            // Altura disponible para el contenido en cada página (restando el footer y un margen de seguridad mayor)
            const marginContent = 10; // 10mm de margen de seguridad
            const availableHeight = pdfHeight - footerHeight - marginContent;

            let heightLeft = imgHeight;
            let position = 0;

            // Primera página
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            addFooter();
            heightLeft -= availableHeight;

            while (heightLeft > 0) {
                pdf.addPage();
                position -= (availableHeight); // Desplazamos la imagen hacia arriba para mostrar la siguiente porción
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                addFooter();
                heightLeft -= availableHeight;
            }

            pdf.save(`Estado_Cuenta_JR_${new Date().getTime()}.pdf`);
        } catch (e) {
            console.error("Error al exportar PDF: ", e);
        } finally {
            document.body.removeChild(container);
            document.body.removeChild(footerWrapper);
            this.loading = false;
        }
    }

    /* * Nombre: exportarExcelTabla
     * Descripción: Exporta la tabla de Cuentas Clave a CSV/Excel (sin columna Clasificación).
     */
    exportarExcelTabla(): void {
        const data = this.listaClientesFiltrada || [];
        if (data.length === 0) return;

        const headers = ['Cliente', 'RFC', 'Folio', 'Importe', 'Estatus', 'Fecha Emisión', 'Fecha Vencimiento'];

        const cleanText = (text: any) => {
            if (text === null || text === undefined) return '';
            let str = String(text);
            str = str.replace(/\r?\n|\r/g, ' ');
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = data.map(r => [
            cleanText(r.nombreCliente),
            cleanText(r.rfc),
            cleanText(r.folioCompleto),
            r.montoDocumento || 0,
            cleanText(r.estatusPago),
            cleanText(r.fechaDocumento),
            cleanText(r.fechaVencimiento)
        ]);

        const csvContent = 'sep=,\n' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Cuentas_Clave_${this.sucursal}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /* * Nombre: exportarPDFTabla
     * Descripción: Exporta la tabla de Cuentas Clave (sin columna Clasificación) al mismo formato PDF.
     */
    async exportarPDFTabla(): Promise<void> {
        const data = this.listaClientesFiltrada || [];
        if (data.length === 0) return;

        this.loading = true;

        const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return `${d.getDate().toString().padStart(2, '0')} /${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} `;
        };

        const fInicio = formatDate(this.fechaInicio.toISOString());
        const fFin = formatDate(this.fechaFin.toISOString());
        const sucursal = this.sucursal || 'TODAS';
        const totalImporte = data.reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);

        let tableRows = '';
        data.forEach((item, i) => {
            const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            const estatus = item.estatusPago || '';
            const colorEstatus = estatus === 'VENCIDA' ? '#dc2626' : estatus === 'PAGADA' ? '#16a34a' : '#d97706';

            tableRows += `
            < tr style = "background-color: ${bgColor}; color: #374151; font-size: 11px;" >
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;" >
                    <div style="font-weight: bold;" > ${item.nombreCliente || ''} </div>
                        < div style = "font-size: 9px; color: #9ca3af; font-family: monospace;" > ${item.rfc || ''} </div>
                            </td>
                            < td style = "padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; font-family: monospace;" > ${item.folioCompleto || '-'} </td>
                                < td style = "padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;" > ${formatCurrency(item.montoDocumento || 0)} </td>
                                    < td style = "padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;" >
                                        <span style="font-weight: bold; color: ${colorEstatus};" > ${estatus} </span>
                                            < div style = "font-size: 9px; color: #9ca3af; margin-top: 2px;" > Emisión: ${formatDate(item.fechaDocumento)} </div>
                                                < div style = "font-size: 9px; color: ${estatus === 'VENCIDA' ? '#dc2626' : '#9ca3af'}; font-weight: ${estatus === 'VENCIDA' ? 'bold' : 'normal'};" > Vence: ${item.fechaVencimiento || '-'} </div>
                                                    </td>
                                                    </tr>
                                                        `;
        });

        const container = document.createElement('div');
        container.id = 'temp-pdf-tabla-container';
        container.setAttribute('style', 'width: 800px; padding: 40px; background-color: #ffffff; font-family: Arial, sans-serif; position: absolute; left: -9999px; top: 0; z-index: -1000;');

        container.innerHTML = `
                                                    < div style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;" >
                                                        <div style="display: flex; align-items: center; gap: 15px;" >
                                                            <img src="images/logo/logo-new-jr.png" alt = "Logo JR" style = "max-height: 100px; max-width: 200px; object-fit: contain;" >
                                                                <div>
                                                                <h2 style="margin: 0; color: #1e3a8a; font-size: 16px;" > JR INGENIERÍA ELÉCTRICA </h2>
                                                                    < p style = "margin: 2px 0; font-size: 10px; color: #4b5563;" > RFC: JRI - XXXXXX - XXX </p>
                                                                        < p style = "margin: 2px 0; font-size: 10px; color: #4b5563;" > Dir: Calle Falsa 123, Pachuca, Hgo.</p>
                                                                            < a href = "http://www.jringenieriaelectrica.com" style = "margin: 2px 0; font-size: 10px; color: #2563eb; text-decoration: none;" > www.jringenieriaelectrica.com </a>
                                                                                </div>
                                                                                </div>
                                                                                < h1 style = "margin: 0; font-size: 20px; color: #1f2937; text-transform: uppercase;" > Cuentas Clave </h1>
                                                                                    </div>

                                                                                    < div style = "background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin-bottom: 20px;" >
                                                                                        <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;" > <strong>SUCURSAL: </strong> ${sucursal}</p >
                                                                                            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;" > <strong>FILTRADO POR FECHAS: </strong> ${fInicio} - ${fFin}</p >
                                                                                                <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;" > <strong>TOTAL REGISTROS: </strong> ${data.length}</p >
                                                                                                    </div>

                                                                                                    < table style = "width: 100%; border-collapse: collapse; margin-bottom: 20px;" >
                                                                                                        <thead>
                                                                                                        <tr style="background-color: #d1d5db; color: #374151; font-size: 11px;" >
                                                                                                            <th style="padding: 10px; text-align: left;" > CLIENTE / RFC </th>
                                                                                                                < th style = "padding: 10px; text-align: center;" > FOLIO </th>
                                                                                                                    < th style = "padding: 10px; text-align: right;" > IMPORTE </th>
                                                                                                                        < th style = "padding: 10px; text-align: center;" > ESTATUS Y VENCIMIENTO </th>
                                                                                                                            </tr>
                                                                                                                            </thead>
                                                                                                                            <tbody>
                ${tableRows}
        </tbody>
            </table>

            < div style = "display: flex; justify-content: flex-end; margin-bottom: 40px;" >
                <div style="background-color: #4f46e5; padding: 15px; border-radius: 6px; min-width: 200px; text-align: center; color: white;" >
                    <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;" > TOTAL IMPORTE </div>
                        < div style = "font-size: 22px; font-weight: 900;" > ${formatCurrency(totalImporte)} </div>
                            </div>
                            </div>

                            < div style = "border-top: 1px solid #d1d5db; padding-top: 10px; font-size: 10px; color: #6b7280;" >
                                Este documento es informativo y no constituye comprobante fiscal.Para cualquier aclaración contacte a su departamento de cobranza, email: cobranza @jringenieriaelectrica.com
        </div>
            `;

        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Cuentas_Clave_${this.sucursal}_${new Date().getTime()}.pdf`);

        } catch (error) {
            console.error('Error al generar PDF de Cuentas Clave:', error);
        } finally {
            document.body.removeChild(container);
            this.loading = false;
        }
    }

    /* * Nombre: exportarPDF
     * Descripción: Captura el div #pdf-content y genera un archivo descargable.
     */
    exportarPDF(): void {
        const element = document.getElementById('pdf-content');
        if (!element) return;

        this.loading = true;

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
            this.loading = false;
        }).catch(err => {
            console.error('Error al exportar PDF:', err);
            this.loading = false;
        });
    }

    // 🔹 Método para asignar colores según el estatus de la factura
    getEstatusClass(estatus: string): string {
        // Clases base para que parezca una etiqueta (pill)
        const base = 'px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider inline-flex items-center gap-1';

        switch (estatus) {
            case 'VENCIDA':
                // Rojo intenso con fondo suave
                return `${base} bg - red - 50 text - red - 700 border - red - 200`;

            case 'PENDIENTE':
                // Ámbar/Naranja para indicar espera
                return `${base} bg - amber - 50 text - amber - 700 border - amber - 200`;

            case 'PAGADA':
                // Verde para éxito
                return `${base} bg - green - 50 text - green - 700 border - green - 200`;

            default:
                // Gris para cualquier otro estado desconocido
                return `${base} bg - gray - 50 text - gray - 500 border - gray - 200`;
        }
    }
}
