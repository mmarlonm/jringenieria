import {
    TAMANO_LOTE_ENVIO,
    dividirEnLotes,
} from 'app/modules/admin/eventos/configurador-registro/envio-masivo-lotes.utils';
import { DestinatarioClienteDto } from './envio-clientes.types';

export interface FiltroDestinatariosOpciones {
    estado: 'activos' | 'inactivos';
    texto?: string;
    soloConCorreo?: boolean;
}

export interface LoteEnvio {
    clienteIds: number[];
    correosLibres: string[];
}

export interface OmitidoLocal {
    clienteId: number | null;
    nombre: string;
    motivo: string;
}

export interface PrepararEnvioResultado {
    lotes: LoteEnvio[];
    omitidosLocales: OmitidoLocal[];
    destinatarios: number;
}

export interface ResumenEnvio {
    clientes: number;
    correosLibres: number;
    destinatariosUnicos: number;
}

export function esSeleccionable(d: DestinatarioClienteDto): boolean {
    return d.estadoCorreo === 'valido';
}

function normalizarCadena(s: string): string {
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function filtrar(
    lista: DestinatarioClienteDto[],
    opciones: FiltroDestinatariosOpciones
): DestinatarioClienteDto[] {
    const esActivo = opciones.estado === 'activos';
    const termino = opciones.texto?.trim() ? normalizarCadena(opciones.texto.trim()) : '';

    return lista.filter((d) => {
        if (d.activo !== esActivo) {
            return false;
        }

        if (opciones.soloConCorreo && !esSeleccionable(d)) {
            return false;
        }

        if (termino) {
            const nombreNorm = normalizarCadena(d.nombre || '');
            const empresaNorm = d.empresa ? normalizarCadena(d.empresa) : '';
            const correoNorm = d.correo ? normalizarCadena(d.correo) : '';

            const coincide =
                nombreNorm.includes(termino) ||
                empresaNorm.includes(termino) ||
                correoNorm.includes(termino);

            if (!coincide) {
                return false;
            }
        }

        return true;
    });
}

export function ordenar(lista: DestinatarioClienteDto[]): DestinatarioClienteDto[] {
    return [...lista].sort((a, b) => {
        const aValido = a.estadoCorreo === 'valido' ? 0 : 1;
        const bValido = b.estadoCorreo === 'valido' ? 0 : 1;

        if (aValido !== bValido) {
            return aValido - bValido;
        }

        return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
    });
}

export function alternarTodos(
    visibles: DestinatarioClienteDto[],
    seleccion: Set<number>
): Set<number> {
    const seleccionables = visibles.filter(esSeleccionable);
    if (seleccionables.length === 0) {
        return new Set(seleccion);
    }

    const todosMarcados = seleccionables.every((d) => seleccion.has(d.clienteId));
    const nuevo = new Set(seleccion);

    if (todosMarcados) {
        for (const d of seleccionables) {
            nuevo.delete(d.clienteId);
        }
    } else {
        for (const d of seleccionables) {
            nuevo.add(d.clienteId);
        }
    }

    return nuevo;
}

export function contarPorEstado(lista: DestinatarioClienteDto[]): { activos: number; inactivos: number } {
    let activos = 0;
    let inactivos = 0;

    for (const d of lista) {
        if (d.activo) {
            activos++;
        } else {
            inactivos++;
        }
    }

    return { activos, inactivos };
}

function esFormatoCorreoValido(token: string): boolean {
    if (/[<>]/.test(token)) {
        return false;
    }
    const partes = token.split('@');
    if (partes.length !== 2) {
        return false;
    }
    const [usuario, dominio] = partes;
    if (usuario.length === 0) {
        return false;
    }
    if (!dominio.includes('.') || dominio.startsWith('.') || dominio.endsWith('.') || dominio.includes('..')) {
        return false;
    }
    return true;
}

export function analizarCorreosLibres(
    texto: string
): { validos: string[]; invalidos: string[]; repetidos: number } {
    if (!texto || !texto.trim()) {
        return { validos: [], invalidos: [], repetidos: 0 };
    }

    const tokens = texto
        .split(/[,\s;]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

    const validos: string[] = [];
    const invalidos: string[] = [];
    const validosVistos = new Set<string>();
    const invalidosVistos = new Set<string>();
    let repetidos = 0;

    for (const token of tokens) {
        if (esFormatoCorreoValido(token)) {
            const clave = token.toLowerCase();
            if (validosVistos.has(clave)) {
                repetidos++;
            } else {
                validosVistos.add(clave);
                validos.push(clave);
            }
        } else {
            const clave = token.toLowerCase();
            if (!invalidosVistos.has(clave)) {
                invalidosVistos.add(clave);
                invalidos.push(token);
            }
        }
    }

    return { validos, invalidos, repetidos };
}

export function prepararEnvio(
    lista: DestinatarioClienteDto[],
    seleccion: Set<number>,
    libresValidos: string[] = []
): PrepararEnvioResultado {
    const omitidosLocales: OmitidoLocal[] = [];
    const vistos = new Set<string>();

    const clientesMap = new Map<number, DestinatarioClienteDto>();
    for (const d of lista) {
        clientesMap.set(d.clienteId, d);
    }

    const clientesAEnviar: number[] = [];
    for (const id of seleccion) {
        const cliente = clientesMap.get(id);
        if (!cliente) {
            continue;
        }

        const clave = cliente.correo?.trim().toLowerCase() ?? '';
        if (vistos.has(clave)) {
            omitidosLocales.push({
                clienteId: cliente.clienteId,
                nombre: cliente.nombre,
                motivo: 'Correo repetido: ya se envió a otro destinatario de la selección',
            });
        } else {
            vistos.add(clave);
            clientesAEnviar.push(cliente.clienteId);
        }
    }

    const libresAEnviar: string[] = [];
    for (const libre of libresValidos) {
        const clave = libre.trim().toLowerCase();
        if (!clave) {
            continue;
        }

        if (vistos.has(clave)) {
            omitidosLocales.push({
                clienteId: null,
                nombre: libre,
                motivo: 'Correo repetido: ya se envió a otro destinatario de la selección',
            });
        } else {
            vistos.add(clave);
            libresAEnviar.push(clave);
        }
    }

    type ItemCombinado =
        | { tipo: 'cliente'; id: number }
        | { tipo: 'libre'; correo: string };

    const combinada: ItemCombinado[] = [
        ...clientesAEnviar.map((id) => ({ tipo: 'cliente' as const, id })),
        ...libresAEnviar.map((correo) => ({ tipo: 'libre' as const, correo })),
    ];

    if (combinada.length === 0) {
        return {
            lotes: [],
            omitidosLocales,
            destinatarios: 0,
        };
    }

    const chunks = dividirEnLotes(combinada, TAMANO_LOTE_ENVIO);
    const lotes: LoteEnvio[] = chunks.map((chunk) => ({
        clienteIds: chunk
            .filter((x) => x.tipo === 'cliente')
            .map((x) => (x as { tipo: 'cliente'; id: number }).id),
        correosLibres: chunk
            .filter((x) => x.tipo === 'libre')
            .map((x) => (x as { tipo: 'libre'; correo: string }).correo),
    }));

    return {
        lotes,
        omitidosLocales,
        destinatarios: combinada.length,
    };
}

export function resumen(
    lista: DestinatarioClienteDto[],
    seleccion: Set<number>,
    libresValidos: string[] = []
): ResumenEnvio {
    const seleccionados = Array.from(seleccion);
    const envio = prepararEnvio(lista, seleccion, libresValidos);

    return {
        clientes: seleccionados.length,
        correosLibres: libresValidos.length,
        destinatariosUnicos: envio.destinatarios,
    };
}

