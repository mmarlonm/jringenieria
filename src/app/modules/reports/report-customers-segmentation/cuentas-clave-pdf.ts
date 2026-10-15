import { EMISORES, agruparPorEmpresa, cuentaHtml, cuentasParaMonedas, tipoEmpresaDe } from './emisores';

export interface FilaCuentaClave {
    nombreCliente?: string;
    rfc?: string;
    folioCompleto?: string;
    moneda?: string;
    montoDocumento?: number;
    estatusPago?: string;
    fechaDocumento?: string;
    fechaVencimiento?: string;
    tipoEmpresa?: number;
}

export interface OpcionesCuentasClave {
    sucursal: string;
    /** Ya formateadas (dd/MM/yyyy) */
    fechaInicio: string;
    fechaFin: string;
    /** Empresa que se asume cuando el API no manda `tipoEmpresa` */
    empresaPorDefecto: 1 | 2;
}

export const formatearFecha = (valor: string | Date | null | undefined): string => {
    if (!valor) return '-';
    const d = new Date(valor);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const formatearMoneda = (val: number): string =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

/**
 * HTML del PDF "Cuentas Clave". Cada documento lleva la empresa emisora (según la base de CONTPAQi de la que viene)
 * y al final se incluyen las cuentas de pago de cada empresa presente, solo en las monedas que realmente aparecen.
 */
export function construirHtmlCuentasClave(data: FilaCuentaClave[], opciones: OpcionesCuentasClave): string {
    const grupos = agruparPorEmpresa(data, opciones.empresaPorDefecto);
    const varias = grupos.length > 1;

    const filas = data.map((item, i) => {
        const emisor = EMISORES[tipoEmpresaDe(item, opciones.empresaPorDefecto)];
        const estatus = item.estatusPago || '';
        const colorEstatus = estatus === 'VENCIDA' ? '#dc2626' : estatus === 'PAGADA' ? '#16a34a' : '#d97706';
        const vencida = estatus === 'VENCIDA';

        return `
            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'}; color: #374151; font-size: 11px;">
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                    <div style="font-weight: bold;">${item.nombreCliente || ''}</div>
                    <div style="font-size: 9px; color: #9ca3af; font-family: monospace;">${item.rfc || ''}</div>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; font-family: monospace;">${item.folioCompleto || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; font-size: 9px; color: ${emisor.color};">${emisor.nombreCorto}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatearMoneda(item.montoDocumento || 0)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <span style="font-weight: bold; color: ${colorEstatus};">${estatus}</span>
                    <div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">Emisión: ${formatearFecha(item.fechaDocumento)}</div>
                    <div style="font-size: 9px; color: ${vencida ? '#dc2626' : '#9ca3af'}; font-weight: ${vencida ? 'bold' : 'normal'};">Vence: ${item.fechaVencimiento || '-'}</div>
                </td>
            </tr>`;
    }).join('');

    const empresas = grupos.map(g => {
        const emisor = EMISORES[g.tipoEmpresa];
        return `
                        <h2 style="margin: 0 0 2px 0; color: #1e3a8a; font-size: 16px;">${emisor.nombre}</h2>
                        <p style="margin: 0 0 6px 0; font-size: 10px; color: #4b5563;">RFC: ${emisor.rfc}</p>`;
    }).join('');

    const totales = grupos.map(g => {
        const emisor = EMISORES[g.tipoEmpresa];
        const total = g.data.reduce((acc, curr) => acc + (curr.montoDocumento || 0), 0);
        return `
                <div style="background-color: #4f46e5; padding: 15px; border-radius: 6px; min-width: 200px; text-align: center; color: white;">
                    <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">TOTAL IMPORTE${varias ? ' · ' + emisor.nombreCorto.toUpperCase() : ''}</div>
                    <div style="font-size: 22px; font-weight: 900;">${formatearMoneda(total)}</div>
                </div>`;
    }).join('');

    const cuentas = grupos.map(g => {
        const monedas = (['MXN', 'USD'] as const).filter(m => g.data.some(d => (d.moneda || 'MXN').toUpperCase() === m));
        return cuentasParaMonedas(EMISORES[g.tipoEmpresa], [...monedas]).map(cuentaHtml).join('');
    }).join('');

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="images/logo/logo-new-jr.png" alt="Logo JR" style="max-height: 100px; max-width: 200px; object-fit: contain;">
                <div>
                    ${empresas}
                    <a href="http://www.jringenieriaelectrica.com" style="margin: 2px 0; font-size: 10px; color: #2563eb; text-decoration: none;">www.jringenieriaelectrica.com</a>
                </div>
            </div>
            <h1 style="margin: 0; font-size: 20px; color: #1f2937; text-transform: uppercase;">Cuentas Clave</h1>
        </div>

        <div style="background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>SUCURSAL: </strong>${opciones.sucursal}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>FILTRADO POR FECHAS: </strong>${opciones.fechaInicio} - ${opciones.fechaFin}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;"><strong>TOTAL REGISTROS: </strong>${data.length}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #d1d5db; color: #374151; font-size: 11px;">
                    <th style="padding: 10px; text-align: left;">CLIENTE / RFC</th>
                    <th style="padding: 10px; text-align: center;">FOLIO</th>
                    <th style="padding: 10px; text-align: center;">EMPRESA</th>
                    <th style="padding: 10px; text-align: right;">IMPORTE</th>
                    <th style="padding: 10px; text-align: center;">ESTATUS Y VENCIMIENTO</th>
                </tr>
            </thead>
            <tbody>${filas}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;">${totales}
        </div>

        <div style="margin-bottom: 30px;">
            <div style="font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 8px;">CUENTAS PARA PAGO</div>
            <div style="display: flex; flex-direction: row; gap: 15px; flex-wrap: wrap;">${cuentas}
            </div>
        </div>

        <div style="border-top: 1px solid #d1d5db; padding-top: 10px; font-size: 10px; color: #6b7280;">
            Este documento es informativo y no constituye comprobante fiscal. Para cualquier aclaración contacte a su departamento de cobranza, email: cobranza@jringenieriaelectrica.com
        </div>`;
}
