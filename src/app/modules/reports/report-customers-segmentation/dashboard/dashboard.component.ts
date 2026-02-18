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

    loading = false;

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
        const data = this.listaClientesFiltrada || [];
        if (data.length === 0) return;

        this.loading = true;

        const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        const totalCargos = data.reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);
        const totalSaldos = data.reduce((acc, curr) => {
            // Si está PAGADA el saldo es 0, de lo contrario es el monto completo
            return acc + (curr.estatusPago === 'PAGADA' ? 0 : (curr.montoDocumento || 0));
        }, 0);
        const totalAbonos = totalCargos - totalSaldos;

        const cliente = data[0].nombreCliente || '';
        const rfc = data[0].rfc || '';
        const sucursal = this.sucursal || 'TODAS';
        const fInicio = formatDate(this.fechaInicio.toISOString());
        const fFin = formatDate(this.fechaFin.toISOString());

        let tableRows = '';
        data.forEach((item, i) => {
            const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            const cargo = item.montoDocumento || 0;
            const saldo = item.estatusPago === 'PAGADA' ? 0 : cargo;
            const abono = cargo - saldo;
            const estatus = item.estatusPago || '';

            tableRows += `
            <tr style="background-color: ${bgColor}; color: #374151; font-size: 11px;">
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatDate(item.fechaDocumento)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${item.folioCompleto || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">Venta</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">Venta de Equipos/Serv.</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(cargo)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${abono > 0 ? formatCurrency(abono) : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(saldo)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${estatus === 'VENCIDA' ? '#dc2626' : '#16a34a'};">${estatus}</td>
            </tr>
        `;
        });

        const container = document.createElement('div');
        container.id = 'temp-pdf-seg-container';
        container.setAttribute('style', 'width: 800px; padding: 40px; background-color: #ffffff; font-family: Arial, sans-serif; position: absolute; left: -9999px; top: 0; z-index: -1000;');

        container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="images/logo/logo-new-jr.png" alt="Logo JR" style="max-height: 100px; max-width: 200px; object-fit: contain;">
                <div>
                    <h2 style="margin: 0; color: #1e3a8a; font-size: 16px;">JR INGENIERÍA ELÉCTRICA</h2>
                    <p style="margin: 2px 0; font-size: 10px; color: #4b5563;">RFC: JRI-XXXXXX-XXX</p>
                    <p style="margin: 2px 0; font-size: 10px; color: #4b5563;">Dir: Calle Falsa 123, Pachuca, Hgo.</p>
                    <a href="http://www.jringenieriaelectrica.com" style="margin: 2px 0; font-size: 10px; color: #2563eb; text-decoration: none;">www.jringenieriaelectrica.com</a>
                </div>
            </div>
            <h1 style="margin: 0; font-size: 22px; color: #1f2937; text-transform: uppercase;">Reporte de Estado de Cuenta</h1>
        </div>

        <div style="background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>CLIENTE:</strong> ${cliente}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>RFC:</strong> ${rfc}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>SUCURSAL:</strong> ${sucursal}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>FILTRADO POR FECHAS:</strong> ${fInicio} - ${fFin}</p>
        </div>

        <div style="background-color: #16a34a; color: white; text-align: center; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <div style="font-size: 16px; font-weight: bold; letter-spacing: 1px;">SALDO PENDIENTE:</div>
            <div style="font-size: 38px; font-weight: 900; margin-top: 5px;">${formatCurrency(totalSaldos)} MXN</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #d1d5db; color: #374151; font-size: 11px;">
                    <th style="padding: 10px; text-align: center;">FECHA</th>
                    <th style="padding: 10px; text-align: center;">FOLIO</th>
                    <th style="padding: 10px; text-align: center;">TIPO</th>
                    <th style="padding: 10px; text-align: center;">DESCRIPCIÓN</th>
                    <th style="padding: 10px; text-align: right;">CARGO</th>
                    <th style="padding: 10px; text-align: right;">ABONO</th>
                    <th style="padding: 10px; text-align: right;">SALDO</th>
                    <th style="padding: 10px; text-align: center;">ESTATUS</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-start; gap: 15px; margin-bottom: 40px;">
            <div style="background-color: #e5e7eb; padding: 15px; border-radius: 6px; min-width: 160px; text-align: center;">
                <div style="font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 5px;">TOTAL CARGOS</div>
                <div style="font-size: 18px; font-weight: 900; color: #1f2937;">${formatCurrency(totalCargos)}</div>
            </div>
            <div style="background-color: #e5e7eb; padding: 15px; border-radius: 6px; min-width: 160px; text-align: center;">
                <div style="font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 5px;">TOTAL ABONOS</div>
                <div style="font-size: 18px; font-weight: 900; color: #1f2937;">${formatCurrency(totalAbonos)}</div>
            </div>
            <div style="background-color: #16a34a; padding: 15px; border-radius: 6px; min-width: 180px; text-align: center; color: white;">
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">SALDO FINAL</div>
                <div style="font-size: 18px; font-weight: 900;">${formatCurrency(totalSaldos)}</div>
            </div>
        </div>

        <div style="border-top: 1px solid #d1d5db; padding-top: 10px; font-size: 10px; color: #6b7280;">
            Este documento es informativo y no constituye comprobante fiscal. Para cualquier aclaración contacte a su departamento de cobranza, email: cobranza@jringenieriaelectrica.com
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

            const clienteClean = cliente.replace(/[^a-z0-9]/gi, '_');
            pdf.save(`Estado_Cuenta_${clienteClean}_${new Date().getTime()}.pdf`);

        } catch (error) {
            console.error('Error al generar PDF de Estado de Cuenta:', error);
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

    // 🔹 Método para asignar colores según el estatus de la factura
    getEstatusClass(estatus: string): string {
        // Clases base para que parezca una etiqueta (pill)
        const base = 'px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider inline-flex items-center gap-1';

        switch (estatus) {
            case 'VENCIDA':
                // Rojo intenso con fondo suave
                return `${base} bg-red-50 text-red-700 border-red-200`;

            case 'PENDIENTE':
                // Ámbar/Naranja para indicar espera
                return `${base} bg-amber-50 text-amber-700 border-amber-200`;

            case 'PAGADA':
                // Verde para éxito
                return `${base} bg-green-50 text-green-700 border-green-200`;

            default:
                // Gris para cualquier otro estado desconocido
                return `${base} bg-gray-50 text-gray-500 border-gray-200`;
        }
    }
}