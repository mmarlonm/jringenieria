import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

import { ReportVentasProductService } from '../report-ventas-product.service';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ProductoNode {
    producto: string;
    cantidad: number;
    total: number;
    codigo: string;
    // Nuevas columnas de existencia
    qro: number;
    pach: number;
    pue: number;
    stockTotal: number;
}

interface CategoriaNode {
    nombre: string;
    cantidad: number;
    total: number;
    productos: ProductoNode[];
    // Totales de existencia por categoría
    qro: number;
    pach: number;
    pue: number;
    stockTotal: number;
}

interface PadreNode {
    nombre: string;
    cantidad: number;
    total: number;
    categorias: CategoriaNode[];
    // Totales de existencia por clasificación padre
    qro: number;
    pach: number;
    pue: number;
    stockTotal: number;
}


@Component({
    selector: 'app-reporte-ventas-product-dashboard',
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
export class ReportVentasProductDashboardComponent implements OnInit {

    // =================================================
    // 🔹 Highcharts
    // =================================================
    Highcharts: typeof Highcharts = Highcharts;
    updateFlag = false;

    chartOptions: Highcharts.Options = {};

    // =================================================
    // 🔹 Data
    // =================================================
    detalle: any[] = [];
    totalGeneral = 0;

    // =================================================
    // 🔹 Filtros
    // =================================================
    esMoral = 0;
    sucursal = 'TODAS';
    fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1);
    fechaFin: Date = new Date();
    codigosProducto: string = '';

    sucursales = [
        { value: 'TODAS', label: 'Todas' },
        { value: 'PACHUCA', label: 'Pachuca' },
        { value: 'Puebla', label: 'Puebla' },
        { value: 'Queretaro', label: 'Querétaro' }
    ];
    sucursalesDisponibles: any[] = [];
    detalleRaw: any[] = [];
    treeData: any[] = [];

    totalVentas = 0;
    totalCantidad = 0;
    totalProductos = 0;
    totalClasificaciones = 0;
    private productToExpand: string | null = null;
    private marcaToExpand: string | null = null;
    private lineaToExpand: string | null = null;
    public highlightedProduct: string | null = null;

    expandedPadres = new Set<string>();
    expandedCategorias = new Set<string>();

    public tablaJerarquica: PadreNode[] = [];


    constructor(
        private reportVentasProductService: ReportVentasProductService,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.verificarRoles();
        this.route.queryParams.subscribe(params => {
            if (params['sucursal']) {
                this.sucursal = params['sucursal'];
            }
            if (params['producto']) {
                this.productToExpand = params['producto'];
            }
            if (params['marca']) {
                this.marcaToExpand = params['marca'];
            }
            if (params['linea']) {
                this.lineaToExpand = params['linea'];
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

    // =================================================
    // 🔹 CONSULTAR API
    // =================================================
    consultar(): void {

        this.reportVentasProductService
            .getDashboardVentasProduct(
                this.sucursal,
                this.fechaInicio,
                this.fechaFin,
                this.esMoral
            )
            .subscribe(resp => {
                this.detalleRaw = resp || [];
                this.filterCodes();
            });
    }

    filterCodes(): void {
        const toExpandProd = this.productToExpand;
        const toExpandMarca = this.marcaToExpand;
        const toExpandLinea = this.lineaToExpand;
        this.productToExpand = null; 
        this.marcaToExpand = null;
        this.lineaToExpand = null;

        if (toExpandProd) {
            this.detalle = [...this.detalleRaw];
            this.codigosProducto = ''; 

            const item = this.detalle.find(r => 
                r.codigoProducto?.toUpperCase().trim() === toExpandProd.toUpperCase().trim() ||
                r.nombreProducto?.toUpperCase().trim() === toExpandProd.toUpperCase().trim()
            );

            if (item) {
                this.expandedPadres.add(item.clasificacionPadre);
                this.expandedCategorias.add(`${item.clasificacionPadre}|${item.clasificacion}`);

                // 🔹 Resaltar y hacer Scroll
                this.highlightedProduct = item.codigoProducto;
                this.scrollToHighlightedProduct(item.codigoProducto);
            }
        } else if (toExpandMarca) {
            this.detalle = [...this.detalleRaw];
            this.codigosProducto = '';
            
            // Buscar si la marca existe en los datos
            const marcaExiste = this.detalle.some(r => r.clasificacionPadre === toExpandMarca);
            if (marcaExiste) {
                this.expandedPadres.add(toExpandMarca);
            }
        } else if (toExpandLinea) {
            this.detalle = [...this.detalleRaw];
            this.codigosProducto = '';
            
            // Si viene línea, necesitamos encontrar a qué marca pertenece
            const item = this.detalle.find(r => 
                (r.clasificacion || '').trim().toUpperCase() === toExpandLinea.toUpperCase().trim() && 
                (!toExpandMarca || (r.clasificacionPadre || '').trim().toUpperCase() === toExpandMarca.toUpperCase().trim())
            );
            if (item) {
                this.expandedPadres.add(item.clasificacionPadre);
                this.expandedCategorias.add(`${item.clasificacionPadre}|${item.clasificacion}`);
            }
        } else if (!this.codigosProducto || this.codigosProducto.trim() === '') {
            this.detalle = [...this.detalleRaw];
        } else {
            const codes = this.codigosProducto.split(',')
                .map(c => c.trim().toUpperCase())
                .filter(c => c !== '');

            this.detalle = this.detalleRaw.filter(r =>
                codes.some(code => 
                    r.codigoProducto?.toUpperCase().includes(code) ||
                    r.nombreProducto?.toUpperCase().includes(code)
                )
            );
        }

        this.calcularKPIs();
        this.renderGraficaProductos();
        this.generarTablaJerarquica(this.detalle);
    }

    private scrollToHighlightedProduct(codigo: string): void {
        if (!codigo) return;
        
        setTimeout(() => {
            const el = document.getElementById(`prod-${codigo}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);

        // Limpiar el resaltado después de 5 segundos
        setTimeout(() => {
            this.highlightedProduct = null;
        }, 5000);
    }


    private calcularKPIs(): void {

        this.totalVentas = this.detalle
            .reduce((sum, r) => sum + Number(r.totalVendido), 0);

        this.totalCantidad = this.detalle
            .reduce((sum, r) => sum + Number(r.cantidadVendida), 0);

        this.totalProductos = new Set(
            this.detalle.map(x => x.codigoProducto)
        ).size;

        this.totalClasificaciones = new Set(
            this.detalle.map(x => x.clasificacion)
        ).size;
    }

    private renderGraficaProductos(): void {
        const container = document.getElementById('chartComparativaMes');
        if (!container) return;

        // 🔹 Detectar si estamos en Modo Oscuro
        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#FFFFFF' : '#333333';
        const secondaryTextColor = isDark ? '#FFFFFF' : '#666666'; // Gris para etiquetas
        const gridColor = isDark ? '#334155' : '#E6E6E6'; // Color de las líneas de fondo

        // 🔹 Agrupar por producto
        const map = new Map<string, { total: number, cantidad: number }>();

        this.detalle.forEach(r => {
            const current = map.get(r.nombreProducto) || { total: 0, cantidad: 0 };
            map.set(r.nombreProducto, {
                total: current.total + Number(r.totalVendido),
                cantidad: current.cantidad + Number(r.cantidadVendida)
            });
        });

        // 🔹 Top 10 ordenados por Monto Total
        const sortedData = Array.from(map.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10);

        Highcharts.chart('chartComparativaMes', {
            chart: {
                type: 'column',
                backgroundColor: 'transparent' // 👈 Importante para que use el fondo de Fuse
            },
            title: { text: '' },
            xAxis: {
                categories: sortedData.map(x => x[0]),
                labels: {
                    style: {
                        fontSize: '11px',
                        color: secondaryTextColor // 👈 Color adaptativo
                    }
                },
                lineColor: gridColor,
                tickColor: gridColor
            },
            yAxis: {
                gridLineColor: gridColor, // 👈 Líneas de fondo adaptativas
                title: {
                    text: 'Ventas',
                    style: { color: secondaryTextColor }
                },
                labels: {
                    style: { color: secondaryTextColor }
                }
            },
            tooltip: {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF', // Fondo del tooltip
                style: { color: textColor },
                pointFormat: 'Monto: <b>${point.y:,.2f}</b><br/>Cantidad: <b>{point.cantidad} pzs</b>'
            },
            series: [{
                type: 'column',
                name: 'Ventas',
                data: sortedData.map(x => ({
                    y: x[1].total,
                    cantidad: x[1].cantidad
                })),
                dataLabels: {
                    enabled: true,
                    format: '{point.cantidad} pzs',
                    style: {
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textOutline: 'none',
                        color: textColor // 👈 Texto sobre la barra adaptativo
                    }
                }
            }],
            legend: {
                itemStyle: { color: textColor }
            },
            credits: { enabled: false }
        });
    }


    private generarTablaJerarquica(data: any[]) {
        const mapa = new Map<string, PadreNode>();

        data.forEach(r => {
            // PADRE
            if (!mapa.has(r.clasificacionPadre)) {
                mapa.set(r.clasificacionPadre, {
                    nombre: r.clasificacionPadre,
                    cantidad: 0,
                    total: 0,
                    qro: 0,      // Inicializar
                    pach: 0,     // Inicializar
                    pue: 0,      // Inicializar
                    stockTotal: 0, // Inicializar
                    categorias: []
                });
            }

            const padre = mapa.get(r.clasificacionPadre)!;

            // CATEGORIA
            let cat = padre.categorias.find(c => c.nombre === r.clasificacion);

            if (!cat) {
                cat = {
                    nombre: r.clasificacion,
                    cantidad: 0,
                    total: 0,
                    qro: 0,      // Inicializar
                    pach: 0,     // Inicializar
                    pue: 0,      // Inicializar
                    stockTotal: 0, // Inicializar
                    productos: []
                };
                padre.categorias.push(cat);
            }

            // PRODUCTO
            // Nota: Aquí tomamos los valores tal cual vienen del DTO (qro, pach, pue, total)
            cat.productos.push({
                producto: r.nombreProducto,
                cantidad: r.cantidadVendida,
                total: r.totalVendido,
                codigo: r.codigoProducto,
                qro: r.qro || 0,
                pach: r.pach || 0,
                pue: r.pue || 0,
                stockTotal: r.total || 0
            });

            // SUMAS AL PADRE
            padre.cantidad += r.cantidadVendida;
            padre.total += r.totalVendido;
            padre.qro += (r.qro || 0);
            padre.pach += (r.pach || 0);
            padre.pue += (r.pue || 0);
            padre.stockTotal += (r.total || 0);

            // SUMAS A LA CATEGORIA
            cat.cantidad += r.cantidadVendida;
            cat.total += r.totalVendido;
            cat.qro += (r.qro || 0);
            cat.pach += (r.pach || 0);
            cat.pue += (r.pue || 0);
            cat.stockTotal += (r.total || 0);
        });

        this.tablaJerarquica = Array.from(mapa.values());
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

    togglePadre(padre: string) {
        if (this.expandedPadres.has(padre))
            this.expandedPadres.delete(padre);
        else
            this.expandedPadres.add(padre);
    }

    toggleCategoria(key: string) {
        if (this.expandedCategorias.has(key))
            this.expandedCategorias.delete(key);
        else
            this.expandedCategorias.add(key);
    }

    getCategoriaKey(padre: string, cat: string) {
        return `${padre}|${cat}`;
    }


    // Agrega esta función dentro de tu clase ReportVentasProductDashboardComponent
    exportarExcel(): void {
        if (!this.detalle || this.detalle.length === 0) return;

        const headers = [
            'Clasificacion Padre',
            'Clasificacion',
            'Codigo Producto',
            'Producto',
            'Cantidad Vendida',
            'Total Vendido',
            'Stock QRO',
            'Stock PACH',
            'Stock PUE',
            'Stock Global'
        ];

        const cleanText = (text: any) => {
            if (text === null || text === undefined) return '';
            let str = String(text);
            str = str.replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = this.detalle.map(r => [
            cleanText(r.clasificacionPadre),
            cleanText(r.clasificacion),
            cleanText(r.codigoProducto),
            cleanText(r.nombreProducto),
            r.cantidadVendida,
            r.totalVendido,
            r.qro || 0,
            r.pach || 0,
            r.pue || 0,
            r.total || 0
        ]);

        const csvContent = 'sep=,\n' + '\ufeff' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        // ... resto del código del link para descargar ...
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Ventas_Existencias_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
