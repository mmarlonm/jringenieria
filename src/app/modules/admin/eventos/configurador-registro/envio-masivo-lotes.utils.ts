import { EnvioMasivoFalloDto, EnvioMasivoResultadoDto } from './formulario-registro.service';

/** Destinatarios por petición. Cada lote tarda pocos minutos: así ninguna petición llega al límite del servidor o del proxy. */
export const TAMANO_LOTE_ENVIO = 10;

export function dividirEnLotes<T>(items: T[], tamano: number): T[][] {
    if (!Number.isInteger(tamano) || tamano < 1) throw new Error('El tamaño del lote debe ser un entero mayor a cero.');
    const lotes: T[][] = [];
    for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
    return lotes;
}

/** Suma los resultados de varios lotes en uno solo, con el mismo formato que devuelve el API. */
export function combinarResultados(parciales: EnvioMasivoResultadoDto[]): EnvioMasivoResultadoDto {
    const total: EnvioMasivoResultadoDto = {
        totalProcesados: 0, enviadosExitosos: 0, whatsappExitosos: 0, fallidos: 0,
        whatsappFallidos: 0, omitidos: 0, detalleErrores: [], fallos: [],
    };
    const fallos: EnvioMasivoFalloDto[] = [];
    for (const r of parciales) {
        total.totalProcesados += r.totalProcesados || 0;
        total.enviadosExitosos += r.enviadosExitosos || 0;
        total.whatsappExitosos += r.whatsappExitosos || 0;
        total.fallidos += r.fallidos || 0;
        total.whatsappFallidos += r.whatsappFallidos || 0;
        total.omitidos = (total.omitidos || 0) + (r.omitidos || 0);
        total.detalleErrores.push(...(r.detalleErrores || []));
        fallos.push(...(r.fallos || []));
    }
    total.fallos = fallos;
    return total;
}
