import { formatearTamano } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
import { RequerimientoArchivo } from './requerimientos.service';

/** Categoría de los archivos que no pertenecen a una opción del checklist. */
export const CATEGORIA_GENERAL = 'Evidencia Requerimiento';

export const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

export interface ItemChecklist {
    /** Nombre del control del formulario (y del campo `falta…` del requerimiento). */
    control: string;
    etiqueta: string;
    /** Categoría con la que se guardan sus documentos; el servidor la usa como nombre de carpeta (solo letras, números, - y _). */
    categoria: string;
}

const OPCIONES: [string, string][] = [
    ['faltaPlano', 'Plano eléctrico'],
    ['faltaFotografia', 'Fotografías del sitio'],
    ['faltaCantidad', 'Cantidades definidas'],
    ['faltaUbicacion', 'Ubicación exacta'],
    ['faltaDatosElectricos', 'Datos eléctricos'],
    ['faltaCapacidad', 'Capacidad / carga'],
    ['faltaFechaEjecucion', 'Fecha de ejecución'],
    ['faltaCondicionesSitio', 'Condiciones de sitio'],
    ['faltaNormativa', 'Requisitos normativos'],
    ['faltaEvidenciaFalla', 'Evidencia de fallas'],
    ['faltaMarcaModelo', 'Marca o modelo específico'],
    ['faltaVisita', 'Visita / levantamiento previo'],
    ['faltaOtros', 'Otros elementos'],
];

export const CHECKLIST: ItemChecklist[] = OPCIONES.map(([control, etiqueta]) => ({
    control,
    etiqueta,
    categoria: `Checklist-${control}`,
}));

/** Nombre legible de la categoría de un archivo. */
export function etiquetaCategoria(categoria?: string | null): string {
    if (!categoria || categoria === CATEGORIA_GENERAL || categoria === 'General') return 'General';
    if (categoria.startsWith('Checklist-')) {
        const item = CHECKLIST.find(i => i.categoria === categoria);
        return item ? `Checklist · ${item.etiqueta}` : 'Checklist';
    }
    return categoria;
}

export function archivosDeCategoria(archivos: RequerimientoArchivo[], categoria: string): RequerimientoArchivo[] {
    return archivos.filter(a => a.categoria === categoria);
}

/** Separa los archivos que se pueden subir de los que no (vacíos o de más de 20 MB), con el motivo para mostrarlo. */
export function validarArchivos<T extends { name: string; size: number }>(
    archivos: T[], maximo: number = TAMANO_MAXIMO_BYTES
): { validos: T[]; rechazados: { nombre: string; motivo: string }[] } {
    const validos: T[] = [];
    const rechazados: { nombre: string; motivo: string }[] = [];
    for (const f of archivos) {
        if (f.size <= 0) rechazados.push({ nombre: f.name, motivo: 'está vacío' });
        else if (f.size > maximo) rechazados.push({ nombre: f.name, motivo: `supera el máximo de ${Math.round(maximo / 1024 / 1024)} MB (pesa ${formatearTamano(f.size)})` });
        else validos.push(f);
    }
    return { validos, rechazados };
}

const extension = (nombre: string) => (nombre.split('.').length > 1 ? nombre.split('.').pop()!.toLowerCase() : '');

export function iconoArchivo(nombre: string): string {
    switch (extension(nombre)) {
        case 'pdf': return 'heroicons_outline:document-text';
        case 'doc':
        case 'docx': return 'heroicons_outline:document';
        case 'xls':
        case 'xlsx': return 'heroicons_outline:table-cells';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp': return 'heroicons_outline:photo';
        case 'zip':
        case 'rar': return 'heroicons_outline:archive-box';
        default: return 'heroicons_outline:paper-clip';
    }
}

/** Clases de color (fondo + icono) según el tipo de archivo, igual que en los archivos de Leads. */
export function temaArchivo(nombre: string): string {
    const ext = extension(nombre);
    if (ext === 'pdf') return 'bg-red-100 dark:bg-red-950/30 text-red-600';
    if (['doc', 'docx'].includes(ext)) return 'bg-blue-100 dark:bg-blue-950/30 text-blue-600';
    if (['xls', 'xlsx'].includes(ext)) return 'bg-green-100 dark:bg-green-950/30 text-green-600';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'bg-purple-100 dark:bg-purple-950/30 text-purple-600';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
}
