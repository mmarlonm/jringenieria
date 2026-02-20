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
import { MatTooltipModule } from '@angular/material/tooltip'; // Importante para la barra

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
        HighchartsChartModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatTooltipModule // Agregado aquí
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

    // 🔹 Drilldown
    detalleVentas: any[] = [];
    private datosClasificacionOriginal: any[] = [];
    public marcaSeleccionada: string | null = null;

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

                    // ✅ Si no hay respuesta o viene vacío → reset
                    if (!resp || !resp.detalle || resp.detalle.length === 0) {
                        this.resetDashboard();
                        return;
                    }

                    this.mapearKPIs(resp);
                    this.mapearGraficas(resp);
                    this.detalleVentas = resp.detalle;

                    // 🎯 LÓGICA DE CÁLCULO DE METAS SUCURSAL Y SEGMENTOS POR AGENTE
                    this.metaAnual = resp.metaAnual || 0;
                    this.ventasAnual = resp.ventasAnual || resp.kpis?.totalVentas || 0;

                    if (this.metaAnual > 0) {
                        this.porcentajeMetaAnual = (this.ventasAnual / this.metaAnual) * 100;
                    } else {
                        this.porcentajeMetaAnual = 0;
                    }

                    // 🌟 CREACIÓN DE SEGMENTOS PARA LA BARRA 🌟
                    // 🌟 CREACIÓN DE SEGMENTOS PARA LA BARRA 🌟
                    this.segmentosAgentes = [];
                    if (this.metaAnual > 0 && Array.isArray(resp.topVendedores)) {

                        const coloresAgentes = [
                            'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
                            'bg-pink-500', 'bg-rose-500', 'bg-orange-500',
                            'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
                            'bg-green-500', 'bg-emerald-500', 'bg-teal-500'
                        ];

                        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

                        resp.topVendedores.forEach((vendedor: any, index: number) => {
                            const widthBarra = (vendedor.totalVendido / this.metaAnual) * 100;
                            const participacionSucursal = this.ventasAnual > 0 ? (vendedor.totalVendido / this.ventasAnual) * 100 : 0;

                            if (widthBarra > 0) {
                                const colorAsignado = coloresAgentes[index % coloresAgentes.length];
                                const nombreSplit = vendedor.vendedor.trim().split(' ');
                                const nombreCorto = nombreSplit.length > 1 ? `${nombreSplit[0]} ${nombreSplit[1].charAt(0)}.` : nombreSplit[0];

                                // 🔹 NUEVO: Agrupar ventas por mes desde el detalle para este vendedor
                                const ventasMensualesMap = new Map<number, number>();

                                if (Array.isArray(resp.detalle)) {
                                    resp.detalle.forEach((d: any) => {
                                        if (d.vendedor === vendedor.vendedor) {
                                            const fechaObj = new Date(d.fecha);
                                            const mesIndex = fechaObj.getMonth();
                                            // Sumamos el netoMovimiento (venta real de ese renglón)
                                            const venta = d.netoMovimiento || 0;
                                            ventasMensualesMap.set(mesIndex, (ventasMensualesMap.get(mesIndex) || 0) + venta);
                                        }
                                    });
                                }

                                // Convertimos el mapa a un arreglo y lo ordenamos por mes (Enero a Diciembre)
                                const ventasMensuales = Array.from(ventasMensualesMap.entries())
                                    .map(([mesIndex, total]) => ({
                                        mesNombre: mesesNombres[mesIndex],
                                        mesNumero: mesIndex,
                                        total: total
                                    }))
                                    .sort((a, b) => a.mesNumero - b.mesNumero);

                                this.segmentosAgentes.push({
                                    nombreCorto: nombreCorto,
                                    nombreCompleto: vendedor.vendedor,
                                    totalVendido: vendedor.totalVendido,
                                    anchoPorcentaje: widthBarra,
                                    porcentajeParticipacion: participacionSucursal,
                                    colorClass: colorAsignado,
                                    ventasMensuales: ventasMensuales // 👈 Inyectamos el desglose aquí
                                });
                            }
                        });
                    }

                    this.datosClasificacionOriginal = resp.ventasPorClasificacion || [];
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
        this.metaAnual = 0;
        this.ventasAnual = 0;
        this.porcentajeMetaAnual = 0;
        this.segmentosAgentes = [];

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

        Highcharts.chart('chartTopProductosPiezas', { // 👈 Asegúrate de tener este ID en tu HTML
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
                }))
            } as any]
        });
    }

    // 📊 2. Gráfica Top Productos (SOLO MONTO / DINERO)
    private graficaTopProductosMonto(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        const borderColor = isDark ? '#334155' : '#E2E8F0';

        Highcharts.chart('chartTopProductosMonto', { // 👈 Asegúrate de tener este ID en tu HTML
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
                }))
            } as any]
        });
    }

    private graficaTopVendedores(data: any[]): void {
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#FFFFFF' : '#333333';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        const tooltipBorder = isDark ? '#1E293B' : '#E2E8F0';

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
}