import { CampoConfig } from './formulario-registro.service';

export type ValorRespuesta =
    | { tipo: 'texto'; texto: string }
    | { tipo: 'lista'; items: string[] }
    | { tipo: 'matriz'; filas: { pregunta: string; respuesta: string }[] }
    | { tipo: 'imagen'; src: string }
    | { tipo: 'archivo' };

export type ItemDetalle =
    | { tipo: 'seccion'; etiqueta: string }
    | { tipo: 'pregunta'; etiqueta: string; valor: ValorRespuesta };

/** Respuestas guardadas como JSON `{ idCampo: valor }`; un JSON inválido o que no sea un objeto se trata como «sin respuestas». */
export function parsearRespuestas(json: string | null | undefined): Record<string, any> {
    try {
        const valor = JSON.parse(json || '');
        return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
    } catch {
        return {};
    }
}

function normalizarValor(campo: CampoConfig, crudo: any): ValorRespuesta | null {
    if (crudo === null || crudo === undefined) return null;

    if (Array.isArray(crudo)) {
        const items = crudo.map(x => String(x ?? '').trim()).filter(x => x !== '');
        return items.length ? { tipo: 'lista', items } : null;
    }

    if (typeof crudo === 'object') {
        // Matriz: { idFila: valorDeColumna }
        const filas = Object.entries(crudo)
            .filter(([, val]) => String(val ?? '').trim() !== '')
            .map(([idFila, val]) => {
                const valor = String(val).trim();
                const etiqueta = campo.columnasMatriz?.find(c => c.valor === valor)?.etiqueta;
                return {
                    pregunta: campo.filasMatriz?.find(f => f.id === idFila)?.texto ?? idFila,
                    respuesta: etiqueta && etiqueta !== valor ? `${valor} — ${etiqueta}` : valor,
                };
            });
        return filas.length ? { tipo: 'matriz', filas } : null;
    }

    const texto = String(crudo).trim();
    if (texto === '') return null;
    if (texto.startsWith('data:image/')) return { tipo: 'imagen', src: texto };
    if (texto.startsWith('data:')) return { tipo: 'archivo' };
    return { tipo: 'texto', texto };
}

/**
 * Arma el detalle de lo que respondió una persona: solo las preguntas contestadas, en el orden del formulario y con
 * su sección. `total` cuenta las preguntas configuradas (sin secciones) y `respondidas` las que tienen respuesta.
 */
export function construirDetalle(
    campos: CampoConfig[], respuestas: Record<string, any>
): { items: ItemDetalle[]; respondidas: number; total: number } {
    const ordenados = [...campos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const items: ItemDetalle[] = [];
    let seccionPendiente: ItemDetalle | null = null;
    let respondidas = 0;
    let total = 0;

    for (const campo of ordenados) {
        if (campo.tipo === 'section') {
            seccionPendiente = { tipo: 'seccion', etiqueta: campo.etiqueta };
            continue;
        }
        total++;
        const valor = normalizarValor(campo, respuestas[campo.id]);
        if (!valor) continue;
        respondidas++;
        if (seccionPendiente) {
            items.push(seccionPendiente); // la sección solo aparece si tiene al menos una respuesta
            seccionPendiente = null;
        }
        items.push({ tipo: 'pregunta', etiqueta: campo.etiqueta, valor });
    }

    return { items, respondidas, total };
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda por nombre, correo o teléfono, sin distinguir mayúsculas ni acentos. */
export function coincideBusqueda(
    r: { nombreAsistente?: string | null; correoAsistente?: string | null; telefonoAsistente?: string | null },
    busqueda: string
): boolean {
    const q = sinAcentos((busqueda || '').trim());
    if (!q) return true;
    return [r.nombreAsistente, r.correoAsistente, r.telefonoAsistente].some(x => sinAcentos(x || '').includes(q));
}

/** El API guarda la hora en UTC y la envía sin zona («2026-10-10T12:00:00»): sin zona se interpreta como UTC. */
export function fechaDesdeApi(iso: string): Date {
    const conZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso);
    return new Date(conZona ? iso : iso + 'Z');
}

export interface IdentidadRespuesta {
    nombre: string;
    /** El nombre mostrado es el de la empresa (el formulario no pregunta el nombre de la persona). */
    esEmpresa: boolean;
    correo: string | null;
    telefono: string | null;
}

const NOMBRES_DE_RELLENO = ['invitado', 'anonimo', ''];
const CORREO_DE_RELLENO = /^invitado_[0-9a-f]+@registro\.jringenieria\.com$/i;
// Se comparan etiquetas completas (sin acentos, signos ni mayúsculas): «¿A qué área de la empresa perteneces?» no pide el nombre de nadie.
const PREGUNTA_NOMBRE_PERSONA = /^(cual es )?(tu |su )?nombre( completo| y apellidos?| de quien responde| del (encuestado|participante)| de la persona que responde)?$/;
const PREGUNTA_EMPRESA = /^(nombre de( la| tu| su)? )?(empresa|compania|razon social|organizacion|institucion)( (u|o|y|\/) (empresa|organizacion|institucion))?$/;
const normalizarEtiqueta = (e: string) => sinAcentos(e).replace(/[¿?¡!:.,;]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Cuando un formulario no pide nombre ni correo (p. ej. una encuesta de satisfacción) el API registra a la persona como
 * «Invitado» con un correo y un teléfono inventados. Aquí se descartan esos datos de relleno y, si hace falta, se
 * identifica a la persona por lo que contestó: primero una pregunta con su nombre y, si no hay, la empresa.
 */
export function resolverIdentidad(
    r: { nombreAsistente?: string | null; correoAsistente?: string | null; telefonoAsistente?: string | null },
    campos: CampoConfig[], respuestas: Record<string, any>
): IdentidadRespuesta {
    const correo = (r.correoAsistente || '').trim();
    const telefono = (r.telefonoAsistente || '').trim();
    const datos = {
        correo: correo && !CORREO_DE_RELLENO.test(correo) ? correo : null,
        telefono: telefono && !/^0+$/.test(telefono) ? telefono : null,
    };

    const nombreReal = (r.nombreAsistente || '').trim();
    if (!NOMBRES_DE_RELLENO.includes(sinAcentos(nombreReal))) return { nombre: nombreReal, esEmpresa: false, ...datos };

    const contestadas = [...campos]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .filter(c => c.tipo !== 'section' && c.tipo !== 'matrix' && c.tipo !== 'file' && c.tipo !== 'checkbox')
        .map(c => ({ etiqueta: c.etiqueta || '', valor: typeof respuestas[c.id] === 'string' ? respuestas[c.id].trim() : '' }))
        .filter(c => c.valor !== '' && !c.valor.startsWith('data:'));

    const persona = contestadas.find(c => PREGUNTA_NOMBRE_PERSONA.test(normalizarEtiqueta(c.etiqueta)));
    if (persona) return { nombre: persona.valor, esEmpresa: false, ...datos };
    const empresa = contestadas.find(c => PREGUNTA_EMPRESA.test(normalizarEtiqueta(c.etiqueta)));
    if (empresa) return { nombre: empresa.valor, esEmpresa: true, ...datos };
    return { nombre: 'Invitado', esEmpresa: false, ...datos };
}
