/**
 * Empresas que emiten facturas en CONTPAQi. El número coincide con `TipoEmpresa` que manda el API
 * (1 = Jesús Ricardo Méndez / persona física, 2 = JR Ingeniería Eléctrica / persona moral).
 */
export interface CuentaBancaria {
    moneda: 'MXN' | 'USD';
    banco: string;
    titular: string;
    rfc: string;
    noClienteBanco?: string;
    cuenta: string;
    clabe: string;
}

export interface EmisorEstadoCuenta {
    tipoEmpresa: 1 | 2;
    /** Título del estado de cuenta */
    nombre: string;
    /** Texto de la columna "Empresa" */
    nombreCorto: string;
    rfc: string;
    color: string;
    /** Prefijo del nombre del archivo PDF */
    archivo: string;
    /** Cuentas donde esta empresa recibe pagos */
    cuentas: CuentaBancaria[];
}

export const EMISORES: Record<1 | 2, EmisorEstadoCuenta> = {
    1: {
        tipoEmpresa: 1,
        nombre: 'JESÚS RICARDO MÉNDEZ ARRILLAGA',
        nombreCorto: 'Jesús R. Méndez',
        rfc: 'MEAJ730516T86',
        color: '#005A9C',
        archivo: 'JesusRicardo',
        // Persona física: solo cuenta en MXN
        cuentas: [
            { moneda: 'MXN', banco: 'BBVA', titular: 'JESUS RICARDO MENDEZ ARRILLAGA', rfc: 'MEAJ730516T86', cuenta: '0478628203', clabe: '012290004786282030' }
        ]
    },
    2: {
        tipoEmpresa: 2,
        nombre: 'JR INGENIERÍA ELÉCTRICA',
        nombreCorto: 'JR Ing. Eléctrica',
        rfc: 'JIE250214R69',
        color: '#009640',
        archivo: 'JR',
        cuentas: [
            { moneda: 'MXN', banco: 'BBVA', titular: 'JR INGENIERIA ELECTRICA', rfc: 'JIE250214R69', noClienteBanco: 'E3477448', cuenta: '0124948939', clabe: '012290001249489399' },
            { moneda: 'USD', banco: 'BBVA', titular: 'JR INGENIERIA ELECTRICA', rfc: 'JIE250214R69', noClienteBanco: 'E3477448', cuenta: '0124949706', clabe: '012290001249497064' }
        ]
    }
};

/**
 * Empresa emisora de un documento. Si el API no manda `tipoEmpresa` (versión anterior) se usa `porDefecto`,
 * que es lo que hacía el reporte antes: Física solo si el filtro estaba en "Física", en cualquier otro caso JR Ingeniería.
 */
export function tipoEmpresaDe(item: { tipoEmpresa?: number } | null | undefined, porDefecto: 1 | 2): 1 | 2 {
    const tipo = item?.tipoEmpresa ?? porDefecto;
    return tipo === 1 ? 1 : 2;
}

/** Separa los documentos por empresa emisora (Jesús Ricardo primero). */
export function agruparPorEmpresa<T extends { tipoEmpresa?: number }>(
    data: T[],
    porDefecto: 1 | 2
): { tipoEmpresa: 1 | 2; data: T[] }[] {
    const grupos: { tipoEmpresa: 1 | 2; data: T[] }[] = [];
    for (const tipo of [1, 2] as const) {
        const items = data.filter(item => tipoEmpresaDe(item, porDefecto) === tipo);
        if (items.length > 0) {
            grupos.push({ tipoEmpresa: tipo, data: items });
        }
    }
    return grupos;
}

/** Tarjeta HTML con los datos de una cuenta de pago (la misma que lleva el Estado de Cuenta). */
export function cuentaHtml(c: CuentaBancaria): string {
    const linea = (etiqueta: string, valor: string) =>
        `<div style="font-size: 9px; color: #1e293b; font-weight: bold;">${etiqueta}: <span style="font-family: monospace;">${valor}</span></div>`;

    return `
            <div style="flex: 1; min-width: 250px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="background-color: #004481; color: white; border-radius: 4px; padding: 4px 8px; font-weight: 900; font-size: 10px; letter-spacing: 0.5px;">${c.banco}</div>
                <div style="flex: 1; border-left: 1px solid #e2e8f0; padding-left: 12px; display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.3px;">Cuenta ${c.moneda}</div>
                    ${linea('Titular', c.titular)}
                    ${c.noClienteBanco ? linea('No. de Cliente BBVA', c.noClienteBanco) : ''}
                    ${linea('RFC', c.rfc)}
                    ${linea('No. Cuenta', c.cuenta)}
                    ${linea('CLABE', c.clabe)}
                </div>
            </div>`;
}

/** Cuentas de una empresa que corresponden a las monedas en las que tiene documentos. */
export function cuentasParaMonedas(emisor: EmisorEstadoCuenta, monedas: ('MXN' | 'USD')[]): CuentaBancaria[] {
    return emisor.cuentas.filter(c => monedas.includes(c.moneda));
}
