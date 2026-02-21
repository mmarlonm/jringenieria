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
    moneda?: string;
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

        // --- HELPERS DE FORMATO Y LÓGICA ---
        const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

        const formatDate = (dateStr: string) => {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
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
            if (estatus === 'PAGADA' || estatus === 'PAGADO') return 0;
            const vDate = parseDate(vencimientoStr);
            if (!vDate || isNaN(vDate.getTime())) return 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            vDate.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - vDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        };

        const numeroALetras = (n: number, moneda: string = 'MXN'): string => {
            const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
            const decenas = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
            const decenas2 = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
            const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

            const convertirSeccion = (num: number) => {
                let output = '';
                if (num === 100) return 'CIEN';
                if (num >= 100) {
                    output += centenas[Math.floor(num / 100)] + ' ';
                    num %= 100;
                }
                if (num >= 10 && num < 20) {
                    output += decenas[num - 10] + ' ';
                } else if (num >= 20) {
                    output += decenas2[Math.floor(num / 10)] + (num % 10 > 0 ? ' Y ' + unidades[num % 10] : '') + ' ';
                } else if (num > 0) {
                    output += unidades[num] + ' ';
                }
                return output;
            };

            let entero = Math.floor(n);
            let decimales = Math.round((n - entero) * 100);
            let result = '';

            if (entero === 0) result = 'CERO ';
            if (entero >= 1000000) {
                const millones = Math.floor(entero / 1000000);
                result += (millones === 1 ? 'UN MILLON ' : convertirSeccion(millones) + 'MILLONES ');
                entero %= 1000000;
            }
            if (entero >= 1000) {
                const miles = Math.floor(entero / 1000);
                result += (miles === 1 ? 'MIL ' : convertirSeccion(miles) + 'MIL ');
                entero %= 1000;
            }
            result += convertirSeccion(entero);

            const centavosStr = decimales.toString().padStart(2, '0') + '/100';
            return `${result.trim()} ${moneda === 'USD' ? 'DOLARES' : 'PESOS'} ${centavosStr} ${moneda === 'USD' ? 'USD' : 'M.N.'}`;
        };

        // --- DATOS DEL CLIENTE ---
        const cliente = data[0].cliente;
        const rfc = data[0].rfc;
        const sucursalRaw = data[0].sucursal;
        const fInicio = formatDate(this.fechaInicio.toISOString());
        const fFin = formatDate(this.fechaFin.toISOString());

        // --- FILAS DE LA TABLA (11 Columnas) ---
        let tableRows = '';
        data.forEach((item, i) => {
            const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            const cargo = item.totalFactura || 0;
            const saldo = item.saldoPendiente || 0;
            const abono = cargo - saldo;
            const estatus = item.estatus || '';
            const diasVencidos = calculateDiasVencidos(item.fechaVencimiento, estatus);
            const moneda = item.moneda || 'MXN';

            tableRows += `
            <tr style="background-color: ${bgColor}; color: #374151; font-size: 8px;">
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i + 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatDate(item.fechaEmision)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${item.documento || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">Venta de Equipos/Serv.</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${moneda}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(cargo)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${abono > 0 ? formatCurrency(abono) : '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(saldo)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatDate(item.fechaVencimiento) || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${diasVencidos}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${estatus === 'VENCIDO' || estatus === 'VENCIDA' ? '#dc2626' : '#16a34a'};">${estatus}</td>
            </tr>
        `;
        });

        // Totales por moneda
        const totalMXN = data.filter(item => (item.moneda || 'MXN') === 'MXN').reduce((acc, curr) => acc + (curr.saldoPendiente || 0), 0);
        const totalUSD = data.filter(item => item.moneda === 'USD').reduce((acc, curr) => acc + (curr.saldoPendiente || 0), 0);
        const totalSaldos = data.reduce((acc, curr) => acc + (curr.saldoPendiente || 0), 0);
        const totalCargos = data.reduce((acc, curr) => acc + (curr.totalFactura || 0), 0);
        const totalAbonos = totalCargos - totalSaldos;

        // --- CONTENDEDOR TEMPORAL ---
        const container = document.createElement('div');
        container.id = 'temp-pdf-overdue-container';
        container.setAttribute('style', 'width: 850px; background-color: white; font-family: Arial, sans-serif; position: absolute; left: -9999px; top: 0; display: flex; flex-direction: column; padding: 0; margin: 0;');

        container.innerHTML = `
    <div style="width: 100%; height: 30px; background-color: #d1d5db; position: relative; display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0;">
        <div style="background-color: #d1d5db; height: 100%; width: 230px; border-top-right-radius: 50px; border-bottom-right-radius: 50px; display: flex; align-items: center; justify-content: center; position: absolute; z-index: 1; right:30px">
             <span style="color: #1e4b8a; font-weight: bold; font-size: 11px;">REPORTE CARTERA VENCIDA</span>
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
            <p style="margin: 1px 0; font-size: 10px; color: #1e3a8a;"><strong>SUCURSAL:</strong> ${sucursalRaw}</p>
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

            // Altura disponible para el contenido en cada página (restando el footer)
            const availableHeight = pdfHeight - footerHeight - 5; // 5mm de margen

            let heightLeft = imgHeight;
            let position = 0;

            // Función para añadir el footer a la página actual
            const addFooter = () => {
                pdf.addImage(footerImgData, 'PNG', 0, pdfHeight - footerHeight, pdfWidth, footerHeight);
            };

            // Primera página
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            addFooter();
            heightLeft -= availableHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                addFooter();
                heightLeft -= availableHeight;
            }

            const clienteClean = cliente.replace(/[^a-z0-9]/gi, '_');
            pdf.save(`Estado_Cuenta_${clienteClean}_${new Date().getTime()}.pdf`);
        } catch (e) {
            console.error("Error al exportar PDF: ", e);
        } finally {
            if (document.body.contains(container)) document.body.removeChild(container);
            if (document.body.contains(footerWrapper)) document.body.removeChild(footerWrapper);
            this.loading = false;
        }
    }

    limpiarFiltroTexto(): void {
        this.filtroTexto = '';
        // Al limpiar, volvemos a consultar para traer toda la información original
        this.consultar();
    }
}