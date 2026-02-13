import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as Highcharts from 'highcharts';

// Angular Material Imports
import { MatIconModule } from "@angular/material/icon";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

// Services & Utils
import { ReportPortfolioOverdueService } from '../report-portfolio-overdue.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { HighchartsChartModule } from 'highcharts-angular';

export interface CarteraVencidaDto {
    sucursal: string;
    agente: string;
    cliente: string;
    rfc: string;
    documento: string;
    metodoPago: string;
    condicionesPago: string;
    fechaEmision: string;
    fechaVencimiento: string;
    diasVencido: number;
    totalFactura: number;
    saldoPendiente: number;
    estatus: string;
}

@Component({
    selector: 'app-report-portfolio-overdue-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        HighchartsChartModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatNativeDateModule,
        MatSelectModule
    ],
})
export class ReportPortfolioOverdueDashboardComponent implements OnInit {

    Highcharts: typeof Highcharts = Highcharts;
    chartOptions!: Highcharts.Options;

    // Parámetros de Filtro
    sucursal: string = 'SANTA JULIA';
    fechaInicio: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1); // Inicio de mes
    fechaFin: Date = new Date();
    esMoral: boolean = false;
    filtroTexto: string = ''; // 🔍 Nueva propiedad para el buscador

    // Estado de la Data
    detalle: CarteraVencidaDto[] = [];
    loading: boolean = false;

    kpis = {
        totalFacturas: 0,
        totalClientes: 0,
        totalSaldo: 0,
        totalVencido: 0,
        promedioDiasVencido: 0
    };

    constructor(private service: ReportPortfolioOverdueService) { }

    ngOnInit(): void {
        this.consultar();
    }

    /**
     * Getter para obtener la lista filtrada reactivamente en el HTML
     */
    get detalleFiltrado(): CarteraVencidaDto[] {
        if (!this.filtroTexto.trim()) {
            return this.detalle;
        }
        const busqueda = this.filtroTexto.toLowerCase();
        return this.detalle.filter(item =>
            item.cliente.toLowerCase().includes(busqueda) ||
            item.rfc.toLowerCase().includes(busqueda)
        );
    }

    consultar(): void {
        this.loading = true;
        this.service
            .getDashboardReport(this.sucursal, this.fechaInicio, this.fechaFin, this.esMoral)
            .subscribe({
                next: (resp: CarteraVencidaDto[]) => {
                    this.loading = false;
                    if (!this.filtroTexto.trim()) {
                        this.detalle = resp ?? [];
                    } else {
                        const busqueda = this.filtroTexto.toLowerCase();
                        this.detalle = (resp ?? []).filter(item =>
                            item.cliente.toLowerCase().includes(busqueda) ||
                            item.rfc.toLowerCase().includes(busqueda)
                        );
                    }
                    this.calcularKpis();
                    this.buildCharts();
                },
                error: err => {
                    this.loading = false;
                    console.error('Error al consultar dashboard:', err);
                }
            });
    }

    calcularKpis(): void {
        const rows = this.detalle;
        const totalFacturas = rows.length;
        const totalClientes = new Set(rows.map(x => x.cliente)).size;
        const totalSaldo = rows.reduce((sum, x) => sum + x.saldoPendiente, 0);
        const totalVencido = rows
            .filter(x => x.diasVencido > 0)
            .reduce((sum, x) => sum + x.saldoPendiente, 0);

        const promedioDias = rows.length === 0
            ? 0
            : rows.reduce((sum, x) => sum + x.diasVencido, 0) / rows.length;

        this.kpis = {
            totalFacturas,
            totalClientes,
            totalSaldo,
            totalVencido,
            promedioDiasVencido: Math.round(promedioDias)
        };
    }

    buildCharts(): void {
        // Usamos 'detalleFiltrado' si quieres que la gráfica cambie según la búsqueda
        // o 'detalle' si quieres que la gráfica siempre muestre el total general.
        const top = [...this.detalle]
            .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
            .slice(0, 5);

        this.chartOptions = {
            chart: { type: 'bar', backgroundColor: 'transparent' },
            title: { text: 'Top 5 Clientes con Mayor Saldo', style: { fontWeight: 'bold' } },
            xAxis: {
                categories: top.map(x => x.cliente),
                title: { text: null }
            },
            yAxis: {
                title: { text: 'Saldo Pendiente (MXN)' },
                labels: { format: '${value}' }
            },
            tooltip: { valuePrefix: '$' },
            plotOptions: {
                bar: {
                    dataLabels: { enabled: true, format: '${point.y:,.2f}' },
                    color: '#3b82f6'
                }
            },
            legend: { enabled: false },
            series: [{
                type: 'bar',
                name: 'Saldo Pendiente',
                data: top.map(x => x.saldoPendiente)
            }],
            credits: { enabled: false }
        };
    }

    async exportarPDF(): Promise<void> {
        const element = document.getElementById('dashboard');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = 297;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`cartera_${this.sucursal}_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('Error al generar PDF:', error);
        }
    }

    async exportarPDFEstado(): Promise<void> {
        const data = this.detalle || [];
        if (data.length === 0) return;

        this.loading = true;

        // Helpers de formato
        const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
        const formatDate = (dateStr: string) => {
            const d = new Date(dateStr);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Cálculos
        const totalCargos = data.reduce((acc, curr) => acc + curr.totalFactura, 0);
        const totalSaldos = data.reduce((acc, curr) => acc + curr.saldoPendiente, 0);
        const totalAbonos = totalCargos - totalSaldos;

        // Info del cliente
        const cliente = data[0].cliente;
        const rfc = data[0].rfc;
        const sucursal = data[0].sucursal;
        const fInicio = formatDate(this.fechaInicio.toISOString());
        const fFin = formatDate(this.fechaFin.toISOString());

        // Filas de la tabla
        let tableRows = '';
        data.forEach((item, i) => {
            const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            const abono = item.totalFactura - item.saldoPendiente;

            tableRows += `
            <tr style="background-color: ${bgColor}; color: #374151; font-size: 11px;">
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatDate(item.fechaEmision)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${item.documento}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">Venta</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">Venta de Equipos/Serv.</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.totalFactura)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${abono > 0 ? formatCurrency(abono) : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(item.saldoPendiente)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${item.estatus === 'VENCIDO' ? '#dc2626' : '#16a34a'};">${item.estatus}</td>
            </tr>
        `;
        });

        // Contenedor temporal
        const container = document.createElement('div');
        container.id = 'temp-pdf-container';
        container.setAttribute('style', 'width: 800px; padding: 40px; background-color: #ffffff; font-family: Arial, sans-serif; position: absolute; left: -9999px; top: 0; z-index: -1000;');

        // HTML inyectado (CON LA RUTA DEL LOGO ACTUALIZADA)
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
                useCORS: true, // Crucial para que Angular cargue imágenes locales en el canvas
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

    limpiarFiltroTexto(): void {
        this.filtroTexto = '';
        // Al limpiar, volvemos a consultar para traer toda la información original
        this.consultar();
    }
}