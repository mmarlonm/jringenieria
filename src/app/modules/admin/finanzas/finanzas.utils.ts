import { HttpErrorResponse } from '@angular/common/http';
import { ClaseMovimiento, Cuenta, EstadoMovimiento, MovimientoConciliacion, ResultadoImportacion, ResultadoSugerir, Vinculo } from './finanzas.types';

const MAX_BYTES_ARCHIVO = 10 * 1024 * 1024;
const TEXTO_ARCHIVO_GRANDE = 'El archivo es demasiado grande (máximo 10 MB).';

export const textoResumen = (r: ResultadoImportacion): string =>
    `${r.nuevos} nuevos · ${r.actualizados} actualizados · ${r.sinCambios} sin cambios · ${r.rechazados.length} rechazados`;

export const hayAdvertencias = (r: ResultadoImportacion): boolean => r.advertencias.length > 0;

/** Texto en español de cualquier fallo HTTP: el `mensaje` del API si trae uno; 413 sin cuerpo (Kestrel); sin conexión; genérico. */
export function mensajeDeError(err: HttpErrorResponse | unknown): string {
    const e = err as { status?: number; error?: { mensaje?: unknown } | null } | null | undefined;
    const mensaje = e?.error?.mensaje;
    if (typeof mensaje === 'string' && mensaje.trim() !== '') {
        return mensaje;
    }
    if (e?.status === 413) {
        return TEXTO_ARCHIVO_GRANDE;
    }
    if (e?.status === 0) {
        return 'No se pudo conectar con el servidor.';
    }
    return 'Ocurrió un error inesperado.';
}

/** La `Fecha` de una importación es UTC pero llega sin «Z» (EF la lee sin zona): se le marca para que el pipe `date` la muestre en hora local. */
export const fechaUtc = (texto: string): string => (/(Z|[+-]\d{2}:?\d{2})$/i.test(texto) ? texto : `${texto}Z`);

/**
 * Revisión previa en el navegador: por encima de ~12 MB el servidor corta la conexión sin cuerpo ni cabeceras CORS y la pantalla
 * solo vería «sin conexión» después de subir todo el archivo. Devuelve el motivo, o null si se puede subir.
 */
export function motivoArchivoInvalido(archivo: { name: string; size: number }): string | null {
    if (!/\.(xlsx|xls)$/i.test(archivo.name)) return 'Solo se aceptan archivos de Excel (.xlsx o .xls).';
    return archivo.size > MAX_BYTES_ARCHIVO ? TEXTO_ARCHIVO_GRANDE : null;
}

/** «Empresa · alias ····terminación · moneda». Sin la empresa si no se conoce: la cuenta sola sigue siendo identificable. */
export function etiquetaCuenta(cuenta: Cuenta, nombresEmpresa: ReadonlyMap<number, string>): string {
    const texto = `${cuenta.alias} ····${cuenta.terminacion} · ${cuenta.moneda}`;
    const empresa = nombresEmpresa.get(cuenta.empresaId);
    return empresa ? `${empresa} · ${texto}` : texto;
}

export const ESTADOS_MOVIMIENTO: readonly EstadoMovimiento[] = ['SinConciliar', 'ConSugerencia', 'Parcial', 'Conciliado', 'Clasificado'];
export const CLASES_MOVIMIENTO: readonly ClaseMovimiento[] = ['TransferenciaPropia', 'PagoTarjeta', 'Nomina', 'Comision', 'Tpv', 'Personal'];

export function etiquetaEstadoMovimiento(e: string): string {
    switch (e) {
        case 'SinConciliar': return 'Sin conciliar';
        case 'ConSugerencia': return 'Con sugerencia';
        case 'Parcial': return 'Parcial';
        case 'Conciliado': return 'Conciliado';
        case 'Clasificado': return 'Clasificado';
        default: return e;
    }
}

export function etiquetaClase(c: string): string {
    switch (c) {
        case 'TransferenciaPropia': return 'Transferencia entre cuentas propias';
        case 'PagoTarjeta': return 'Pago de tarjeta';
        case 'Nomina': return 'Nómina';
        case 'Comision': return 'Comisión';
        case 'Tpv': return 'Cobro de terminal (TPV)';
        case 'Personal': return 'Personal';
        default: return c;
    }
}

export function etiquetaRegla(r: string): string {
    switch (r) {
        case 'SALDO_EXACTO': return 'Importe exacto';
        case 'PPD_SALDO': return 'Saldo de factura a crédito (PPD)';
        case 'TARJETA_RFC': return 'Compra con tarjeta (RFC coincide)';
        case 'REP_EXACTO': return 'Complemento de pago';
        case 'SUMA_EXACTA': return 'Suma de varias facturas';
        case 'MANUAL': return 'Manual';
        default: return r;
    }
}

export function clasesDeConfianza(c: string | null): string {
    switch (c) {
        case 'Alta': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
        case 'Media': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
}

export function fechaLocalISO(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function primerDiaDelMes(hoy: Date): string {
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}

export function periodoValido(desde: string, hasta: string): string | null {
    if (!desde || !hasta || desde.trim() === '' || hasta.trim() === '') {
        return 'Indica el periodo (desde y hasta).';
    }
    const [yD, mD, dD] = desde.split('-').map(Number);
    const [yH, mH, dH] = hasta.split('-').map(Number);
    const utcDesde = Date.UTC(yD, mD - 1, dD);
    const utcHasta = Date.UTC(yH, mH - 1, dH);
    if (utcDesde > utcHasta) {
        return 'La fecha inicial no puede ser posterior a la final.';
    }
    const diffDias = (utcHasta - utcDesde) / 86_400_000;
    if (diffDias > 366) {
        return 'El periodo no puede pasar de 366 días.';
    }
    return null;
}

export function referenciaCfdi(c: { serie: string | null; folio: string | null; uuid: string }): string {
    if (c.serie && c.folio) return `${c.serie}-${c.folio}`;
    if (c.folio) return c.folio;
    if (c.serie) return c.serie;
    return c.uuid ? c.uuid.substring(0, 8) : "";
}

export function textoSugerir(r: ResultadoSugerir): string {
    return `${r.sugerenciasNuevas} sugerencias nuevas · ${r.movimientosAnalizados} movimientos analizados · ${r.cfdiConsiderados} facturas consideradas`;
}

export function altasPendientes(items: readonly MovimientoConciliacion[]): Vinculo[] {
    const res: Vinculo[] = [];
    for (const item of items) {
        if (item.sugerencias) {
            for (const s of item.sugerencias) {
                if (s.estado === 'Sugerida' && s.confianza === 'Alta') {
                    res.push(s);
                }
            }
        }
    }
    return res;
}

export function partir<T>(items: readonly T[], tamano: number): T[][] {
    if (tamano <= 0 || items.length === 0) return [];
    const res: T[][] = [];
    for (let i = 0; i < items.length; i += tamano) {
        res.push(items.slice(i, i + tamano));
    }
    return res;
}

export const MESES: readonly string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function nombrePaquete(rfc: string, anio: number, mes: number): string {
    const mesStr = mes.toString().padStart(2, '0');
    return `PaqueteDespacho_${anio}-${mesStr}_${rfc}.xlsx`;
}

export function mesAnteriorA(hoy: Date): { anio: number; mes: number } {
    const anio = hoy.getFullYear();
    const mesIdx = hoy.getMonth();
    if (mesIdx === 0) {
        return { anio: anio - 1, mes: 12 };
    }
    return { anio, mes: mesIdx };
}

export async function mensajeDeErrorBlob(err: unknown): Promise<string> {
    if (err && typeof err === 'object' && 'error' in err) {
        const errorProp = (err as { error: unknown }).error;
        if (errorProp instanceof Blob) {
            try {
                const text = await errorProp.text();
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed.mensaje === 'string' && parsed.mensaje.trim()) {
                    return parsed.mensaje;
                }
            } catch {
                return 'Ocurrió un error inesperado.';
            }
            return 'Ocurrió un error inesperado.';
        }
    }
    return mensajeDeError(err);
}

export function descargarBlob(documento: Document, blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = documento.createElement('a');
    a.href = url;
    a.download = nombre;
    documento.body.appendChild(a);
    try {
        a.click();
    } finally {
        a.remove();
        // Firefox puede cancelar la descarga si se libera la URL en el mismo instante del clic.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

export const ORDEN_TARJETAS_DASHBOARD: readonly string[] = [
    'SaldoBancos', 'PorCobrar', 'PorPagar', 'DeudaFinanciera',
    'ProyectosActivos', 'Cobros30Dias', 'Pagos30Dias', 'Saldo13Semanas'
];

export function formatearMonto(valor: number, moneda: string | null): string {
    if (!moneda) {
        return String(valor);
    }
    const fmt = new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const formatted = fmt.format(Math.abs(valor));
    const prefix = valor < 0 ? '-$' : '$';
    return `${prefix}${formatted} ${moneda}`;
}

export function fechaIsoACorta(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) {
        return iso;
    }
    const [yyyy, mm, dd] = iso.slice(0, 10).split('-');
    return `${dd}/${mm}/${yyyy}`;
}
