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

                    this.datosClasificacionOriginal = resp.ventasPorClasificacion || [];
                    this.generarGraficaMarcas();
                    this.generarGraficaLineas(); // Mostrará todas al inicio
                },
                error: err => {
                    console.error('Error dashboard ventas', err);
                    this.resetDashboard(); // también limpia si hay error
                }
            });
    }

    private resetDashboard(): void {

        // 🔹 KPIs
        this.kpis = {
            totalVentas: 0,
            totalFacturas: 0,
            totalClientes: 0,
            ventaPromedio: 0,
            utilidadBruta: 0
        };

        // 🔹 Tabla
        this.detalleVentas = [];

        // 🔹 Highcharts (estructura mínima vacía)
        this.chartOptions = {
            title: { text: '' },
            series: [{ type: 'column', data: [] }]
        };

        this.updateFlag = true;

        // 🔹 Limpia contenedores directos (porque usas Highcharts.chart manual)
        ['chartComparativaMes', 'chartTopProductos', 'chartTopVendedores']
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
            this.graficaTopProductos(data.topProductos);
        }

        if (Array.isArray(data.topVendedores) && data.topVendedores.length) {
            this.graficaTopVendedores(data.topVendedores);
        }
    }


    /**
 * Genera la gráfica comparativa alineando cronológicamente el periodo actual vs el anterior
 * e incluye el cálculo de porcentaje de crecimiento en el tooltip.
 * @param {any[]} data - Array de objetos con { anio: number, mes: number, periodo: string, totalMes: number }.
 * @returns {void}
 */
    private graficaVentasPorMes(data: any[]): void {
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        setTimeout(() => {
            // 1. Identificar la línea de tiempo (Actual)
            const lineaTiempo = data
                .filter(d => d.periodo.toLowerCase() === 'actual')
                .map(d => ({ anio: d.anio, mes: d.mes }))
                .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));

            const categorias = lineaTiempo.map(p => `${mesesNombres[p.mes - 1]} ${p.anio.toString().slice(-2)}`);

            // 2. Construir las series
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
                    // --- SECCIÓN MODIFICADA: TOOLTIP CON CÁLCULO DE CRECIMIENTO ---
                    tooltip: {
                        shared: true,
                        useHTML: true,
                        formatter: function (this: any) {
                            // Obtenemos los valores de los puntos (0: Anterior, 1: Actual)
                            const anterior = this.points[0]?.y || 0;
                            const actual = this.points[1]?.y || 0;

                            // Cálculo de crecimiento: ((A - B) / B) * 100
                            let crecimientoHtml = '';
                            if (anterior > 0) {
                                const porcentaje = ((actual - anterior) / anterior) * 100;
                                const color = porcentaje >= 0 ? '#10b981' : '#ef4444'; // Verde si sube, Rojo si baja
                                const icono = porcentaje >= 0 ? '▲' : '▼';

                                crecimientoHtml = `
                                <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #EEE;">
                                    <span style="color: ${color}; font-weight: bold;">
                                        Crecimiento: ${icono} ${porcentaje.toFixed(2)}%
                                    </span>
                                </div>`;
                            } else if (actual > 0) {
                                // Si el año anterior fue 0 y el actual tiene ventas, el crecimiento es infinito
                                crecimientoHtml = `
                                <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #EEE;">
                                    <span style="color: #10b981; font-weight: bold;">Crecimiento: N/A (Nuevo)</span>
                                </div>`;
                            }

                            // Construcción del Tooltip
                            let s = `<span style="font-size: 10px; font-weight: bold;">${this.x}</span><br/>`;
                            this.points.forEach((point: any) => {
                                s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>$${point.y.toLocaleString()}</b><br/>`;
                            });

                            return s + crecimientoHtml;
                        }
                    },
                    series: [
                        { name: 'Año Anterior', color: '#94a3b8', data: serieAnterior }, // Gris mate
                        { name: 'Año Actual', color: '#3b82f6', data: serieActual }      // Azul mate
                    ],
                    credits: { enabled: false }
                });
            }
        }, 200);
    }

    // 📊 Top productos
    private graficaTopProductos(data: any[]): void {
        // 🔹 1. Colores totalmente SÓLIDOS (Hexadecimales)
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#F1F5F9' : '#1E293B';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF'; // Fondo 100% opaco
        const borderColor = isDark ? '#334155' : '#E2E8F0';

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
                    fontSize: '15px',
                    fontWeight: '600',
                    color: textColor
                }
            },
            tooltip: {
                useHTML: true,
                // 🔹 2. APAGAMOS EL CUADRO NATIVO DE HIGHCHARTS PARA EVITAR TRANSPARENCIAS
                backgroundColor: 'transparent',
                borderWidth: 0,
                shadow: false,
                padding: 0,
                formatter: function (this: any) {
                    const totalMoneda = new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN'
                    }).format(this.point.totalVendido);

                    // 🔹 3. CREAMOS NUESTRO PROPIO CUADRO HTML SÓLIDO Y MODERNO
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
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 4px;">
                            <span style="color: #64748b;">Unidades:</span>
                            <span style="font-weight: 600; font-size: 14px;">${this.point.y.toLocaleString()}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-size: 13px;">Total:</span>
                            <span style="color: #10b981; font-weight: 800; font-size: 15px;">${totalMoneda}</span>
                        </div>
                    </div>
                `;
                }
            },
            credits: {
                enabled: false
            },
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
                                style: 'currency',
                                currency: 'MXN'
                            }).format(this.point.totalVendido);

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
                        style: {
                            fontWeight: '500',
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
                name: 'Productos',
                type: 'pie',
                data: data.map(x => ({
                    name: x.producto,
                    y: x.cantidadVendida,
                    totalVendido: x.totalVendido
                }))
            } as any]
        });
    }
    // 🧑‍💼 Top vendedores
    private graficaTopVendedores(data: any[]): void {
        const isDark = document.body.classList.contains('dark');

        // Colores base
        const textColor = isDark ? '#FFFFFF' : '#333333';
        const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
        // Color del borde del tooltip: gris claro en modo día, azul oscuro en modo noche
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
                borderColor: tooltipBorder, // 👈 Borde para contraste
                borderWidth: 1,
                style: {
                    color: textColor // Fallback de estilo
                },
                // 💡 Inyectamos el textColor directamente en el HTML para asegurar que se vea
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

    // 🔹 Resetear filtro de marca
    public resetFiltroMarca(): void {
        this.marcaSeleccionada = null;
        this.generarGraficaLineas();
    }
}
