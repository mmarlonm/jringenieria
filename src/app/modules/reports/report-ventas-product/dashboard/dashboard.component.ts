import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

interface CategoriaNode {
    nombre: string;
    cantidad: number;
    total: number;
    productos: ProductoNode[];
}

interface PadreNode {
    nombre: string;
    cantidad: number;
    total: number;
    categorias: CategoriaNode[];
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
    esMoral = false;
    sucursal = 'SANTA JULIA';
    fechaInicio: Date = new Date(new Date().getFullYear(), 0, 1);
    fechaFin: Date = new Date();
    treeData: any[] = [];

    totalVentas = 0;
    totalCantidad = 0;
    totalProductos = 0;
    totalClasificaciones = 0;

    expandedPadres = new Set<string>();
    expandedCategorias = new Set<string>();

    public tablaJerarquica: PadreNode[] = [];


    constructor(private reportVentasProductService: ReportVentasProductService) { }

    ngOnInit(): void {
        this.consultar();
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

                this.detalle = resp || [];

                this.calcularKPIs();
                this.renderGraficaProductos();
                this.generarTablaJerarquica(this.detalle);
            });
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

        // 🔹 agrupar por producto
        const map = new Map<string, number>();

        this.detalle.forEach(r => {
            const total = map.get(r.nombreProducto) || 0;
            map.set(r.nombreProducto, total + Number(r.totalVendido));
        });

        // 🔹 top 10 ordenados
        const data = Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        Highcharts.chart('chartComparativaMes', {

            chart: {
                type: 'column'
            },

            title: {
                text: ''
            },

            xAxis: {
                categories: data.map(x => x[0]),
                labels: {
                    style: {
                        fontSize: '11px'
                    }
                }
            },

            yAxis: {
                title: {
                    text: 'Ventas'
                }
            },

            tooltip: {
                pointFormat: '<b>${point.y:,.2f}</b>'
            },

            series: [{
                type: 'column',
                name: 'Ventas',
                data: data.map(x => x[1])
            }],

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
                    productos: []
                };
                padre.categorias.push(cat);
            }

            // PRODUCTO
            cat.productos.push({
                producto: r.nombreProducto,
                cantidad: r.cantidadVendida,
                total: r.totalVendido
            });

            // SUMAS
            padre.cantidad += r.cantidadVendida;
            padre.total += r.totalVendido;

            cat.cantidad += r.cantidadVendida;
            cat.total += r.totalVendido;
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


}
