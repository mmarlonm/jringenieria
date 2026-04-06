import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 🔹 Highcharts
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Exporting from 'highcharts/modules/exporting';

// 🔹 Inicializar Módulos de Highcharts
if (typeof Exporting === 'function') {
    Exporting(Highcharts);
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

// 🔹 Angular Material
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip'; // Importante para la barra
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

// 🔹 Servicios y Librerías Externas
import { ReportVentasService } from '../report-ventas.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// 🔹 Componentes Modal
import { DetalleEmpresaModalComponent } from './detalle-empresa-modal.component';
import { DetalleVentaModalComponent } from './detalle-venta-modal.component';

@Component({
    selector: 'app-reporte-ventas-dashboard',
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
        MatDialogModule,
        MatSnackBarModule
    ]
})
export class ReportVentasDashboardComponent implements OnInit {

    // 🔹 Highcharts
    public Highcharts: typeof Highcharts = Highcharts;
    public chartOptions: Highcharts.Options = {
        title: { text: '' },
        series: [{ type: 'column', data: [] }]
    };
    public updateFlag: boolean = false;

    // 🔹 Filtros
    public esMoral: string = '1';
    public sucursal: string = 'PACHUCA';
    public fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1); // 1 de Enero
    public fechaFin: Date = new Date();

    public sucursales = [
        { value: 'TODAS', label: 'Todas' },
        { value: 'PACHUCA', label: 'Pachuca' },
        { value: 'Puebla', label: 'Puebla' },
        { value: 'Queretaro', label: 'Querétaro' }
    ];
    public sucursalesDisponibles: any[] = [];

    // 🔹 KPIs (alineados al JSON)
    kpis = {
        totalVentas: 0,
        totalFacturas: 0,
        totalClientes: 0,
        ventaPromedio: 0,
        utilidadBruta: 0
    };

    // 🎯 NUEVO: Variables para Metas Globales de la Sucursal (Barra Segmentada por Agentes)
    public metaAnual: number = 0;
    public ventasAnual: number = 0;
    public porcentajeMetaAnual: number = 0;
    public segmentosAgentes: any[] = []; // Array que dibujará la barra multicolor

    // 🎯 NUEVO: Variable para la tabla de desglose Física/Moral
    public desglosePorSucursal: any[] = [];
    public totalMetaGlobal: number = 0;
    public totalVentasGlobal: number = 0;
    public porcentajeMetaGlobal: number = 0;
    public segmentosSucursales: any[] = [];

    // 🎯 NUEVO: Variables para Comparativa Física vs Moral
    public totalVentasFisica: number = 0;
    public totalVentasMoral: number = 0;
    public porcentajeFisica: number = 0;
    public porcentajeMoral: number = 0;

    // 🔹 Drilldown
    detalleVentas: any[] = [];
    private datosClasificacionOriginal: any[] = [];
    public detalleVentasOriginal: any[] = [];
    public marcaSeleccionada: string | null = null;

    public isLoadingIA = false; // Bandera para mostrar spinner en el botón de IA

    constructor(
        private reportVentasService: ReportVentasService,
        private router: Router,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) { }


    ngOnInit(): void {
        this.verificarRoles();
        this.consultar();
    }

    verificarRoles(): void {
        const userStr = localStorage.getItem('userInformation');
        if (userStr) {
            const userData = JSON.parse(userStr);
            const roles = userData.roles || [];
            const esAdmin = roles.some((r: string) => ['Admin', 'pruebas', 'AdministracionQueretaro','Admin'].includes(r));

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

    /**
     * Integración con la Inteligencia Artificial (Gemini)
     * Consume el endpoint que genera un PDF analítico sobre el rango de fechas.
     */
    public generarReporteIA(): void {
        if (!this.fechaInicio || !this.fechaFin) {
            this.snackBar.open('Debes seleccionar un rango de fechas válido.', 'Cerrar', { duration: 3000 });
            return;
        }

        this.isLoadingIA = true;
        this.snackBar.open('✨ Gemini está analizando los datos, esto puede tardar varios segundos...', 'Cerrar', { 
            duration: 8000, 
            panelClass: ['bg-indigo-600', 'text-white', 'font-bold'] 
        });

        this.reportVentasService.generarReporteIA(
            this.sucursal,
            this.fechaInicio,
            this.fechaFin,
            this.esMoral
        ).subscribe({
            next: (blob: Blob) => {
                this.isLoadingIA = false;
                
                // Disparar descarga del Binario (PDF)
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Reporte_IA_JR.pdf';
                document.body.appendChild(a);
                a.click();
                
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.snackBar.open('✅ Reporte IA generado con éxito.', 'OK', { 
                    duration: 4000,
                    panelClass: ['bg-emerald-600', 'text-white', 'font-bold']
                });
            },
            error: (err) => {
                this.isLoadingIA = false;
                console.error('Error IA:', err);
                this.snackBar.open('❌ Hubo un error al conectar con el consultor IA.', 'Cerrar', { 
                    duration: 5000, 
                    panelClass: ['bg-rose-600', 'text-white', 'font-bold'] 
                });
            }
        });
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
                next: (resp) => {
                    if (!resp || !resp.detalle || resp.detalle.length === 0) {
                        this.resetDashboard();
                        return;
                    }

                    // 1. Mapeo de datos (Esto no interactúa con el DOM, va directo)
                    this.mapearKPIs(resp);
                    this.detalleVentasOriginal = resp.detalle || [];

                    // 🛡️ Quitar duplicados por documentoId SOLO para la tabla
                    const mapUnique = new Map();
                    resp.detalle.forEach((d: any) => {
                        if (!mapUnique.has(d.documentoId)) {
                            mapUnique.set(d.documentoId, d);
                        }
                    });
                    this.detalleVentas = Array.from(mapUnique.values());

                    this.desglosePorSucursal = resp.desglosePorSucursal || [];

                    // 🛡️ Fallback: Si no hay desglose pero hay detalle, lo calculamos (usando Original)
                    if (this.desglosePorSucursal.length === 0 && Array.isArray(resp.detalle)) {
                        const map = new Map<string, number>();
                        resp.detalle.forEach((d: any) => {
                            const suc = d.sucursal || 'Sin Sucursal';
                            map.set(suc, (map.get(suc) || 0) + (d.netoMovimiento || 0));
                        });
                        this.desglosePorSucursal = Array.from(map).map(([sucursal, total]) => ({
                            sucursal,
                            totalVenta: total
                        }));
                    }

                    // 2. Lógica de Metas
                    this.metaAnual = resp.metaAnual || 0;
                    this.ventasAnual = resp.ventasAnual || resp.kpis?.totalVentas || 0;
                    this.porcentajeMetaAnual = this.metaAnual > 0 ? (this.ventasAnual / this.metaAnual) * 100 : 0;

                    // 3. Procesamiento de Vendedores (Barras)
                    this.segmentosAgentes = [];
                    if (Array.isArray(resp.topVendedores)) {
                        const coloresAgentes = [
                            'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
                            'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
                            'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500'
                        ];
                        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

                        resp.topVendedores.forEach((vendedor: any, index: number) => {
                            const widthBarra = this.metaAnual > 0 ? (vendedor.totalVendido / this.metaAnual) * 100 : 0;
                            const participacionSucursal = this.ventasAnual > 0 ? (vendedor.totalVendido / this.ventasAnual) * 100 : 0;

                            if (vendedor.totalVendido > 0) {
                                const partes = vendedor.vendedor.trim().split(/\s+/);
                                const nombreCorto = partes.length > 1 ? `${partes[0]} ${partes[1]}` : partes[0];

                                const ventasMensualesMap = new Map<number, number>();
                                if (Array.isArray(resp.detalle)) {
                                    resp.detalle.forEach((d: any) => {
                                        if (d.vendedor === vendedor.vendedor) {
                                            const fechaObj = new Date(d.fecha);
                                            const mesIndex = fechaObj.getMonth();
                                            ventasMensualesMap.set(mesIndex, (ventasMensualesMap.get(mesIndex) || 0) + (d.netoMovimiento || 0));
                                        }
                                    });
                                }

                                const ventasMensuales = Array.from(ventasMensualesMap.entries())
                                    .map(([mesIndex, total]) => ({
                                        mesNombre: mesesNombres[mesIndex],
                                        mesNumero: mesIndex,
                                        total: total
                                    })).sort((a, b) => a.mesNumero - b.mesNumero);

                                this.segmentosAgentes.push({
                                    nombreCorto: nombreCorto,
                                    nombreCompleto: vendedor.vendedor,
                                    totalVendido: vendedor.totalVendido,
                                    anchoPorcentaje: widthBarra,
                                    porcentajeParticipacion: participacionSucursal,
                                    colorClass: coloresAgentes[index % coloresAgentes.length],
                                    ventasMensuales: ventasMensuales
                                });
                            }
                        });
                    }

                    // 🎯 SOLUCIÓN AL ERROR #13: 
                    // Obligamos a Angular a esperar 200ms a que pinte los <div id="..."> antes de mandar a llamar a Highcharts
                    setTimeout(() => {
                        this.marcaSeleccionada = null; // 🎯 Resetear filtro al consultar
                        this.datosClasificacionOriginal = resp.ventasPorClasificacion || [];
                        this.mapearGraficas(resp);
                        this.generarGraficaMarcas();
                        this.generarGraficaLineas();
                        this.graficaTopClientesMonto();


                        if (this.esMoral === '3' && this.sucursal === 'TODAS' && (this.desglosePorSucursal.length > 0 || this.detalleVentas.length > 0)) {
                            // 📊 Calcular Totales Globales para la Barra de Progreso
                            this.totalMetaGlobal = this.desglosePorSucursal.reduce((acc, curr) => acc + (curr.metaAnualSucursal || 0), 0);
                            this.totalVentasGlobal = this.desglosePorSucursal.reduce((acc, curr) => acc + (curr.totalVenta || 0), 0);
                            this.porcentajeMetaGlobal = this.totalMetaGlobal > 0 ? (this.totalVentasGlobal / this.totalMetaGlobal) * 100 : 0;

                            const paletaColores = [
                                { class: 'bg-blue-600', hex: '#2563eb' },
                                { class: 'bg-emerald-600', hex: '#10b981' },
                                { class: 'bg-amber-600', hex: '#f59e0b' },
                                { class: 'bg-rose-600', hex: '#e11d48' },
                                { class: 'bg-violet-600', hex: '#7c3aed' },
                                { class: 'bg-cyan-600', hex: '#0891b2' },
                                { class: 'bg-orange-600', hex: '#ea580c' },
                                { class: 'bg-pink-600', hex: '#db2777' }
                            ];

                            this.segmentosSucursales = this.desglosePorSucursal
                                .filter(s => s.totalVenta > 0)
                                .map((s, idx) => {
                                    const colorInfo = paletaColores[idx % paletaColores.length];
                                    return {
                                        nombre: s.sucursal,
                                        totalVendido: s.totalVenta,
                                        metaAnualSucursal: s.metaAnualSucursal, // 👈 Mantener para la gráfica de barras
                                        anchoPorcentaje: this.totalMetaGlobal > 0 ? (s.totalVenta / this.totalMetaGlobal) * 100 : 0,
                                        participacion: this.totalVentasGlobal > 0 ? (s.totalVenta / this.totalVentasGlobal) * 100 : 0,
                                        colorClass: colorInfo.class,
                                        hexColor: colorInfo.hex
                                    };
                                });

                            this.graficarDesgloseConsolidado(this.segmentosSucursales);

                            // 📊 Calcular Totales para Comparativa Física vs Moral
                            this.totalVentasFisica = this.desglosePorSucursal.reduce((acc, curr) => acc + (curr.ventaFisica || 0), 0);
                            this.totalVentasMoral = this.desglosePorSucursal.reduce((acc, curr) => acc + (curr.ventaMoral || 0), 0);
                            
                            const granTotalVentas = this.totalVentasFisica + this.totalVentasMoral;
                            this.porcentajeFisica = granTotalVentas > 0 ? (this.totalVentasFisica / granTotalVentas) * 100 : 0;
                            this.porcentajeMoral = granTotalVentas > 0 ? (this.totalVentasMoral / granTotalVentas) * 100 : 0;
                            
                            this.graficarComparativaFisicaVsMoral();
                        }
                    }, 200);

                },
                error: (err) => {
                    console.error('Error al consultar el dashboard:', err);
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
        this.marcaSeleccionada = null; // 🎯 Resetear filtro
        this.desglosePorSucursal = []; // 🎯 NUEVO: Limpiar la tabla de desglose
        this.metaAnual = 0;
        this.ventasAnual = 0;
        this.porcentajeMetaAnual = 0;
        this.segmentosAgentes = [];
        this.totalMetaGlobal = 0;
        this.totalVentasGlobal = 0;
        this.porcentajeMetaGlobal = 0;
        this.segmentosSucursales = [];

        this.totalVentasFisica = 0;
        this.totalVentasMoral = 0;
        this.porcentajeFisica = 0;
        this.porcentajeMoral = 0;
        
        const elFisicaMoral = document.getElementById('chartComparativoEmpresas');
        if (elFisicaMoral) elFisicaMoral.innerHTML = '';

        this.chartOptions = {
            title: { text: '' },
            series: [{ type: 'column', data: [] }]
        };

        this.updateFlag = true;

        ['chartComparativaMes', 'chartTopProductosPiezas', 'chartTopProductosMonto', 'chartTopVendedores', 'chartMarcas', 'chartLineas', 'chartTopMarcasDonut', 'chartTopLineasDonut']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
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
            this.graficaTopProductosMonto(data.topProductos);
            this.graficaTopProductosPiezas(data.topProductos);
        }

        if (Array.isArray(data.topVendedores) && data.topVendedores.length) {
            this.graficaTopVendedores(data.topVendedores);
        }

        if (Array.isArray(data.ventasPorClasificacion)) {
            this.graficaTopMarcasDonut(data.ventasPorClasificacion);
            this.graficaTopLineasDonut(data.ventasPorClasificacion);
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
                        column: {
                            grouping: true,
                            pointPadding: 0.1,
                            groupPadding: 0.2,
                            borderWidth: 0,
                            borderRadius: 3
                        }
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

    // 📊 1. Gráfica Top Productos (SOLO PIEZAS / UNIDADES)
    private graficaTopProductosPiezas(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        const borderColor = isDark ? '#334155' : '#E2E8F0';

        const container = document.getElementById('chartTopProductosPiezas');
        if (!container) return;

        Highcharts.chart(container, { // 👈 Usamos el elemento directamente
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Top Productos (Unidades)',
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                style: {
                    fontSize: '15px',
                    fontWeight: '600',
                    color: textColor
                }
            },
            tooltip: {
                useHTML: true,
                backgroundColor: 'transparent',
                borderWidth: 0,
                shadow: false,
                padding: 0,
                formatter: function (this: any) {
                    return `
                    <div style="
                        background-color: ${tooltipBg}; 
                        color: ${textColor}; 
                        border: 1px solid ${borderColor}; 
                        border-radius: 8px; 
                        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1); 
                        padding: 12px; 
                        min-width: 180px; 
                        font-family: inherit;
                        opacity: 1 !important;
                    ">
                        <div style="font-size: 14px; font-weight: 700; border-bottom: 1px solid ${borderColor}; padding-bottom: 8px; margin-bottom: 8px; line-height: 1.3;">
                            ${this.point.name}
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                            <span style="color: #64748b;">Unidades vendidas:</span>
                            <span style="font-weight: 800; color: #3b82f6; font-size: 15px;">${this.point.y.toLocaleString()}</span>
                        </div>
                    </div>
                `;
                }
            },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#0F172A' : '#FFFFFF',
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                        formatter: function (this: any) {
                            let nombreCorto = this.point.name;
                            if (nombreCorto.length > 15) {
                                nombreCorto = nombreCorto.substring(0, 15) + '...';
                            }

                            return `
                            <div style="text-align:center; color: ${textColor}; line-height: 1.4;">
                                <b title="${this.point.name}" style="font-size: 12px;">${nombreCorto}</b><br>
                                <span style="opacity:.7; font-size: 11px;">${this.point.percentage.toFixed(1)}%</span><br>
                                <span style="color:#3b82f6; font-weight: bold; font-size: 12px;">${this.point.y.toLocaleString()} pz</span>
                            </div>
                        `;
                        },
                        style: { fontWeight: '500', textOutline: 'none' }
                    },
                    states: { hover: { brightness: 0.05 } }
                }
            },
            series: [{
                name: 'Unidades',
                type: 'pie',
                data: data.map(x => ({
                    name: x.producto,
                    y: x.cantidadVendida // 👈 El pastel se divide por cantidad de piezas
                })),
                point: {
                    events: {
                        click: (e: any) => {
                            const producto = e.point.name;
                            const sucursal = this.sucursal;
                            this.router.navigate(['/reports/report-venta-product'], { queryParams: { producto, sucursal } });
                        }
                    }
                }
            } as any]
        });

    }

    // 📊 2. Gráfica Top Productos (SOLO MONTO / DINERO)
    private graficaTopProductosMonto(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        const borderColor = isDark ? '#334155' : '#E2E8F0';

        const container = document.getElementById('chartTopProductosMonto');
        if (!container) return;

        Highcharts.chart(container, { // 👈 Asegúrate de tener este ID en tu HTML
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Top Productos (Ingresos)',
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                style: {
                    fontSize: '15px',
                    fontWeight: '600',
                    color: textColor
                }
            },
            tooltip: {
                useHTML: true,
                backgroundColor: 'transparent',
                borderWidth: 0,
                shadow: false,
                padding: 0,
                formatter: function (this: any) {
                    const totalMoneda = new Intl.NumberFormat('es-MX', {
                        style: 'currency', currency: 'MXN'
                    }).format(this.point.y); // Usamos 'y' porque ahora 'y' es el dinero

                    return `
                    <div style="
                        background-color: ${tooltipBg}; 
                        color: ${textColor}; 
                        border: 1px solid ${borderColor}; 
                        border-radius: 8px; 
                        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1); 
                        padding: 12px; 
                        min-width: 180px; 
                        font-family: inherit;
                        opacity: 1 !important;
                    ">
                        <div style="font-size: 14px; font-weight: 700; border-bottom: 1px solid ${borderColor}; padding-bottom: 8px; margin-bottom: 8px; line-height: 1.3;">
                            ${this.point.name}
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 13px;">Total generado:</span>
                            <span style="color: #10b981; font-weight: 800; font-size: 15px;">${totalMoneda}</span>
                        </div>
                    </div>
                `;
                }
            },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#0F172A' : '#FFFFFF',
                    dataLabels: {
                        enabled: true,
                        useHTML: true,
                        formatter: function (this: any) {
                            const totalMoneda = new Intl.NumberFormat('es-MX', {
                                style: 'currency', currency: 'MXN'
                            }).format(this.point.y);

                            let nombreCorto = this.point.name;
                            if (nombreCorto.length > 15) {
                                nombreCorto = nombreCorto.substring(0, 15) + '...';
                            }

                            return `
                            <div style="text-align:center; color: ${textColor}; line-height: 1.4;">
                                <b title="${this.point.name}" style="font-size: 12px;">${nombreCorto}</b><br>
                                <span style="opacity:.7; font-size: 11px;">${this.point.percentage.toFixed(1)}%</span><br>
                                <span style="color:#10b981; font-weight: bold; font-size: 12px;">${totalMoneda}</span>
                            </div>
                        `;
                        },
                        style: { fontWeight: '500', textOutline: 'none' }
                    },
                    states: { hover: { brightness: 0.05 } }
                }
            },
            series: [{
                name: 'Ingresos',
                type: 'pie',
                data: data.map(x => ({
                    name: x.producto,
                    y: x.totalVendido // 👈 El pastel se divide por el dinero generado
                })),
                point: {
                    events: {
                        click: (e: any) => {
                            const producto = e.point.name;
                            const sucursal = this.sucursal;
                            this.router.navigate(['/reports/report-venta-product'], { queryParams: { producto, sucursal } });
                        }
                    }
                }
            } as any]
        });

    }

    private graficaTopVendedores(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#FFFFFF' : '#333333';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        const tooltipBorder = isDark ? '#1E293B' : '#E2E8F0';

        const container = document.getElementById('chartTopVendedores');
        if (!container) return;

        Highcharts.chart(container, {
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
                    fontWeight: '600',
                    color: textColor
                }
            },
            tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                style: {
                    color: textColor
                },
                pointFormat: '<span style="color:' + textColor + '">Monto: <b>${point.y:,.2f}</b></span><br>' +
                    '<span style="color:' + textColor + '">Participación: <b>{point.percentage:.1f}%</b></span>'
            },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    dataLabels: {
                        enabled: true,
                        format: '<span style="color:' + textColor + '; font-weight: bold;">{point.name} ({point.percentage:.0f}%)</span><br>' +
                            '<span style="opacity:.6; color:' + textColor + '">${point.y:,.0f}</span>',
                        connectorColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                        connectorPadding: 5,
                        distance: 20,
                        style: {
                            fontSize: '11px',
                            textOutline: 'none'
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
                })),
                point: {
                    events: {
                        click: (e: any) => {
                            const vendedor = e.point.name;
                            const sucursal = this.sucursal;
                            this.router.navigate(['/reports/report-ventas-agente'], { queryParams: { vendedor, sucursal } });
                        }
                    }
                }
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
            scale: 2,
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

    exportarCsvDetalle(): void {
        if (!this.detalleVentas || this.detalleVentas.length === 0) return;

        let csvContent = 'Fecha,Sucursal,Folio,Cliente,Vendedor,Total\n';

        this.detalleVentas.forEach(row => {
            const fechaParseada = new Date(row.fecha);
            const fechaStr = isNaN(fechaParseada.getTime()) ? row.fecha : fechaParseada.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const sucursal = `"${(row.sucursal || '').replace(/"/g, '""')}"`;
            const folio = `"${(row.folio || '').replace(/"/g, '""')}"`;
            const cliente = `"${(row.cliente || '').replace(/"/g, '""')}"`;
            const vendedor = `"${(row.vendedor || '').replace(/"/g, '""')}"`;
            const total = row.totalDocumento !== undefined && row.totalDocumento !== null ? row.totalDocumento : 0;

            csvContent += `${fechaStr},${sucursal},${folio},${cliente},${vendedor},${total}\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `detalle-ventas-${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

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

        const container = document.getElementById('chartMarcas');
        if (!container) return;

        Highcharts.chart(container, {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Ventas por Marca',
                style: { fontSize: '14px', fontWeight: 'bold' }
            },
            subtitle: {
                text: 'Haga clic para ver detalle por producto',
                style: { fontSize: '11px' }
            },
            tooltip: {
                pointFormat: 'Venta: <b>${point.y:,.2f}</b><br/>Participación: <b>{point.percentage:.1f}%</b>'
            },
            credits: { enabled: false },
            legend: { enabled: false },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
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
                                const sucursal = self.sucursal;
                                const marca = this.name;
                                self.router.navigate(['/reports/report-venta-product'], { queryParams: { marca, sucursal } });
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Marcas',
                type: 'pie',
                innerSize: '60%',
                data: dataMarcas
            }]
        });
    }

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

        const container = document.getElementById('chartLineas');
        if (!container) return;

        Highcharts.chart(container, {
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
            legend: { enabled: false },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: (e: any) => {
                                const sucursal = this.sucursal;
                                const linea = e.point.name;
                                const marca = this.marcaSeleccionada;
                                this.router.navigate(['/reports/report-venta-product'], { 
                                    queryParams: { marca, linea, sucursal } 
                                });
                            }
                        }
                    },
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
                    showInLegend: false
                }
            },
            series: [{
                name: 'Líneas',
                type: 'pie',
                innerSize: '60%',
                data: dataLineas
            }]
        });
    }

    public resetFiltroMarca(): void {
        this.marcaSeleccionada = null;
        this.generarGraficaLineas();
    }

    private graficaTopMarcasDonut(clasificacion: any[]): void {
        const porMarca = clasificacion.reduce((acc, curr) => {
            acc[curr.marca] = (acc[curr.marca] || 0) + (curr.totalVendido || 0);
            return acc;
        }, {} as any);

        const data = Object.keys(porMarca)
            .map(key => ({ name: key, y: porMarca[key] }))
            .sort((a, b) => b.y - a.y)
            .slice(0, 5);

        this.crearMiniDonut('chartTopMarcasDonut', 'Top Marcas', data, '#10b981');
    }

    private graficaTopLineasDonut(clasificacion: any[], marca?: string): void {
        this.marcaSeleccionada = marca || null;
        let filtrados = clasificacion;
        if (marca) {
            filtrados = clasificacion.filter(x => x.marca === marca);
        }

        const porLinea = filtrados.reduce((acc, curr) => {
            acc[curr.linea] = (acc[curr.linea] || 0) + (curr.totalVendido || 0);
            return acc;
        }, {} as any);

        const data = Object.keys(porLinea)
            .map(key => ({ name: key, y: porLinea[key] }))
            .sort((a, b) => b.y - a.y)
            .slice(0, 5);

        const titulo = marca ? `Top Líneas (${marca})` : 'Top Líneas';
        this.crearMiniDonut('chartTopLineasDonut', titulo, data, '#8b5cf6');
    }
    // 📊 Gráficas Nuevas: Desglose por Sucursal y Cumplimiento de Meta
    private graficarDesgloseConsolidado(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';

        if (!data || data.length === 0) return;

        // 1. Preparar data para Pastel (Participación) con colores sincronizados
        const pastelData = data.map(d => ({
            name: d.nombre || d.sucursal,
            y: d.totalVendido || d.totalVenta,
            color: d.hexColor // 👈 Color sincronizado desde el mapeo inicial
        }));

        const containerPastel = document.getElementById('chartDesglosePastel');
        if (containerPastel) {
            Highcharts.chart(containerPastel, {
                chart: { type: 'pie', backgroundColor: 'transparent' },
                title: { text: '' },
                tooltip: { pointFormat: 'Venta: <b>${point.y:,.2f}</b><br>Participación: <b>{point.percentage:.1f}%</b>' },
                plotOptions: {
                    pie: {
                        innerSize: '50%',
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b><br>{point.percentage:.1f}%',
                            style: { textOutline: 'none', color: textColor, fontWeight: 'normal' }
                        }
                    }
                },
                series: [{ name: 'Sucursal', type: 'pie', data: pastelData } as any],
                credits: { enabled: false }
            });
        }

        // 2. Preparar data para Barras de Cumplimiento (Meta vs Ventas por Sucursal)
        const containerBarras = document.getElementById('chartDesgloseBarras');
        if (containerBarras) {
            const categorias = data.map(d => d.nombre || d.sucursal);
            const dataMetas = data.map(d => d.metaAnualSucursal || 0);
            const dataVentas = data.map(d => d.totalVendido || d.totalVenta || 0);

            Highcharts.chart(containerBarras, {
                chart: { type: 'column', backgroundColor: 'transparent' },
                title: { text: '' },
                xAxis: {
                    categories: categorias,
                    crosshair: true,
                    labels: { style: { color: textColor } }
                },
                yAxis: {
                    min: 0,
                    title: { text: 'Monto ($)', style: { color: textColor } },
                    labels: { style: { color: textColor }, format: '${value:,.0f}' },
                    gridLineColor: isDark ? '#334155' : '#E2E8F0'
                },
                tooltip: {
                    shared: true,
                    headerFormat: '<span style="font-size: 12px"><b>{point.key}</b></span><br/>',
                    pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y:,.2f}</b><br/>',
                    valuePrefix: '$'
                },
                plotOptions: {
                    column: {
                        borderWidth: 0,
                        borderRadius: 4,
                        dataLabels: {
                            enabled: true,
                            format: '${point.y:,.0f}',
                            style: { fontSize: '10px', fontWeight: 'bold', textOutline: 'none', color: textColor }
                        }
                    }
                },
                series: [
                    {
                        name: 'Meta Sucursal',
                        type: 'column',
                        color: isDark ? '#475569' : '#CBD5E1',
                        data: dataMetas
                    },
                    {
                        name: 'Venta Actual',
                        type: 'column',
                        color: '#3b82f6',
                        data: dataVentas
                    }
                ] as any,
                credits: { enabled: false }
            });
        }
    }

    private crearMiniDonut(containerId: string, title: string, data: any[], colorPrincipal: string): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';

        // 🛡️ CANDADO DE SEGURIDAD PARA EVITAR ERROR 13
        const container = document.getElementById(containerId);
        if (!container) return;

        Highcharts.chart(container, {
            chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
            title: {
                text: title,
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                style: { fontSize: '13px', fontWeight: 'bold', color: textColor }
            },
            tooltip: {
                pointFormat: 'Monto: <b>${point.y:,.0f}</b><br>Participación: <b>{point.percentage:.1f}%</b>'
            },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '70%',
                    borderWidth: 1,
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}',
                        distance: 5,
                        style: { fontSize: '9px', textOutline: 'none', color: textColor }
                    },
                    point: {
                        events: {
                            click: (e: any) => {
                                if (containerId === 'chartTopMarcasDonut') {
                                    // 🎯 Ahora filtra en lugar de redireccionar
                                    this.graficaTopLineasDonut(this.datosClasificacionOriginal, e.point.name);
                                } else if (containerId === 'chartTopLineasDonut') {
                                    this.router.navigate(['/reports/report-venta-product'], {
                                        queryParams: {
                                            marca: this.marcaSeleccionada,
                                            linea: e.point.name,
                                            sucursal: this.sucursal
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            },
            series: [{
                name: title,
                type: 'pie',
                data: data
            } as any]
        });
    }

    private graficaTopClientesMonto(): void {
        const porCliente = this.detalleVentas.reduce((acc, curr) => {
            acc[curr.cliente] = (acc[curr.cliente] || 0) + (curr.totalDocumento || 0);
            return acc;
        }, {} as any);

        const data = Object.keys(porCliente)
            .map(key => ({ name: key, y: porCliente[key] }))
            .sort((a, b) => b.y - a.y)
            .slice(0, 5);

        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';

        const container = document.getElementById('chartTopClientesMonto');
        if (!container) return;

        Highcharts.chart(container, {
            chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
            title: {
                text: 'Top Clientes (Monto)',
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                style: { fontSize: '13px', fontWeight: 'bold', color: textColor }
            },
            tooltip: {
                pointFormat: 'Monto: <b>${point.y:,.0f}</b><br>Participación: <b>{point.percentage:.1f}%</b>'
            },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '70%',
                    borderWidth: 1,
                    borderColor: isDark ? '#1E293B' : '#FFFFFF',
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}',
                        distance: 5,
                        style: { fontSize: '9px', textOutline: 'none', color: textColor }
                    },
                    point: {
                        events: {
                            click: (e: any) => {
                                const cliente = e.point.name;
                                this.router.navigate(['/reports/report-customers-segmentation'], { 
                                    queryParams: { cliente } 
                                });
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Clientes',
                type: 'pie',
                data: data
            } as any]
        });
    }

    private graficarComparativaFisicaVsMoral(): void {
        setTimeout(() => {
            const isDark = document.body.classList.contains('dark');
            const textColor = isDark ? '#F1F5F9' : '#1E293B';
            const borderColor = isDark ? '#1E293B' : '#FFFFFF';

            const container = document.getElementById('chartComparativoEmpresas');
            if (!container) return;

            const granTotal = this.totalVentasFisica + this.totalVentasMoral;
            if (granTotal === 0) {
                container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400">Sin ventas registradas</div>';
                return;
            }

            const data = [
                { name: 'Jesús Méndez Arrillaga', y: this.totalVentasFisica, color: '#0ea5e9' },
                { name: 'JR Ingeniería Eléctrica', y: this.totalVentasMoral, color: '#f43f5e' }
            ];

            Highcharts.chart(container, {
                chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
                title: { text: null }, // Title is handled by the container itself
                tooltip: {
                    pointFormat: 'Venta Total: <b>${point.y:,.2f}</b><br>Participación: <b>{point.percentage:.1f}%</b>'
                },
                credits: { enabled: false },
                plotOptions: {
                    pie: {
                        innerSize: '60%',
                        borderWidth: 2,
                        borderColor: borderColor,
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: (event: any) => {
                                    const tipoEmpresaName = event.point.name;
                                    this.abrirDetalleFisicaMoral('TODAS', tipoEmpresaName);
                                }
                            }
                        },
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b><br>{point.percentage:.1f}%',
                            distance: 15,
                            style: { fontSize: '11px', textOutline: '0px', color: textColor, fontWeight: 'bold' }
                        }
                    }
                },
                series: [{
                    name: 'Comparativa',
                    type: 'pie',
                    data: data
                } as any]
            });
        }, 50); // Pequeño delay para asegurar que el DOM (*ngIf) está renderizado
    }

    public abrirDetalleFisicaMoral(sucursalName: string, tipoEmpresaName: string): void {
        const isMoral = tipoEmpresaName === 'JR Ingeniería Eléctrica' || tipoEmpresaName === 'Persona Moral';
        const modalTitle = `Detalle de Ventas - ${tipoEmpresaName}`;
        const modalSubtitle = `Sucursal: ${sucursalName}`;

        const sucursalNormalizada = (sucursalName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const facturasFiltradas = this.detalleVentas.filter(d => {
            const sucDetalle = (d.sucursal || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const coincideSucursal = sucursalNormalizada === 'todas' ? true : sucDetalle.includes(sucursalNormalizada);
            
            // Tratamos undefined, null, false, 0 como Persona Física.
            const isFacturaMoral = d.esMoral === true || d.esMoral === 1 || d.esMoral === '1' || d.esMoral === 'true';
            const coincideEmpresa = isMoral ? isFacturaMoral : !isFacturaMoral;

            return coincideSucursal && coincideEmpresa;
        });

        this.dialog.open(DetalleEmpresaModalComponent, {
            data: {
                titulo: modalTitle,
                subtitulo: modalSubtitle,
                facturas: facturasFiltradas
            },
            panelClass: 'custom-dialog-container',
            width: '1000px',
            maxWidth: '90vw'
        });
    }

    public abrirDetalleVenta(row: any): void {
        // Filtrar del detalle original todos los productos que pertenecen a este folio/documento
        const items = this.detalleVentasOriginal.filter(d => 
            d.folio === row.folio && d.documentoId === row.documentoId
        );
        
        this.dialog.open(DetalleVentaModalComponent, {
            data: {
                folio: row.folio,
                cliente: row.cliente,
                fecha: row.fecha,
                sucursal: row.sucursal,
                total: row.totalDocumento,
                items: items
            }
        });
    }
}