import { jsPDF } from 'jspdf';

/**
 * Paginación de PDF generados a partir de HTML (html2canvas): corta solo entre filas de la tabla y entre bloques,
 * nunca por la mitad de una fila, y repite el encabezado de la tabla en cada hoja.
 *
 * Las medidas están en píxeles CSS relativos al contenedor que se capturó.
 */

/** Pieza que no se parte entre dos hojas: una fila de la tabla o un bloque posterior a la tabla (totales, cuentas, aviso). */
export interface UnidadPagina {
    top: number;
    bottom: number;
    fila: boolean;
}

export interface PaginaPlan {
    /** Inicio y fin del recorte del contenedor para esta hoja */
    desde: number;
    hasta: number;
    /** Si la hoja empieza con el encabezado de la tabla repetido */
    repetirEncabezado: boolean;
}

export interface ParametrosPlan {
    alturaTotal: number;
    unidades: UnidadPagina[];
    /** Alto útil de la primera hoja (el encabezado del documento va dentro del recorte) */
    alturaPrimera: number;
    /** Alto útil de las hojas siguientes */
    alturaSiguientes: number;
    /** Alto del encabezado de la tabla que se repite (0 = no se repite) */
    alturaEncabezado: number;
}

export function planificarPaginas(p: ParametrosPlan): PaginaPlan[] {
    const { alturaTotal, unidades, alturaPrimera, alturaSiguientes, alturaEncabezado } = p;
    if (unidades.length === 0) {
        return [{ desde: 0, hasta: alturaTotal, repetirEncabezado: false }];
    }

    const paginas: PaginaPlan[] = [];
    let i = 0;
    let desde = 0;
    let repetir = false;
    let presupuesto = alturaPrimera;
    let usado = unidades[0].top; // lo que va antes de la primera unidad (encabezado del documento) ocupa la primera hoja

    while (i < unidades.length) {
        const inicio = i;
        while (i < unidades.length) {
            const alto = unidades[i].bottom - unidades[i].top;
            // Siempre entra al menos una unidad por hoja, aunque sea más alta que la hoja
            if (usado + alto > presupuesto && i > inicio) break;
            usado += alto;
            i++;
        }

        const ultima = i >= unidades.length;
        paginas.push({
            desde,
            hasta: ultima ? unidades[unidades.length - 1].bottom : unidades[i].top,
            repetirEncabezado: repetir
        });

        if (!ultima) {
            desde = unidades[i].top;
            repetir = alturaEncabezado > 0 && unidades[i].fila;
            presupuesto = alturaSiguientes;
            usado = repetir ? alturaEncabezado : 0;
        }
    }

    return paginas;
}

const MARGEN_SUPERIOR = 12;
const MARGEN_INFERIOR = 8;

/**
 * Reparte el canvas de `contenedor` en hojas A4 (un canvas por hoja). Se mide el DOM, así que el contenedor
 * debe seguir en el documento. `footerCanvas` es la franja que se pegará al pie de cada hoja.
 */
export function paginarContenedor(
    contenedor: HTMLElement,
    canvas: HTMLCanvasElement,
    footerCanvas?: HTMLCanvasElement
): HTMLCanvasElement[] {
    const anchoPx = contenedor.offsetWidth;
    const escala = canvas.width / anchoPx;
    const hojaPx = anchoPx * (297 / 210);
    const origen = contenedor.getBoundingClientRect().top;

    const medir = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { top: r.top - origen, bottom: r.bottom - origen };
    };

    const tabla = contenedor.querySelector('table');
    const piezas: { el: Element; fila: boolean }[] = [];
    if (tabla) {
        tabla.querySelectorAll('tbody tr').forEach(el => piezas.push({ el, fila: true }));
        for (let s = tabla.nextElementSibling; s; s = s.nextElementSibling) {
            piezas.push({ el: s, fila: false });
        }
    }
    const unidades: UnidadPagina[] = piezas.map((pieza, k) => {
        const r = medir(pieza.el);
        const siguiente = piezas[k + 1];
        // El espacio entre piezas (márgenes) viaja con la pieza de arriba
        return { top: r.top, bottom: siguiente ? medir(siguiente.el).top : r.bottom, fila: pieza.fila };
    });

    const thead = tabla?.querySelector('thead') ?? null;
    const encabezado = thead ? medir(thead) : null;
    const alturaEncabezado = encabezado ? encabezado.bottom - encabezado.top : 0;

    const pieAlto = footerCanvas ? footerCanvas.height * (anchoPx / footerCanvas.width) : 0;
    const plan = planificarPaginas({
        alturaTotal: contenedor.scrollHeight,
        unidades,
        alturaPrimera: hojaPx - pieAlto - MARGEN_INFERIOR,
        alturaSiguientes: hojaPx - pieAlto - MARGEN_INFERIOR - MARGEN_SUPERIOR,
        alturaEncabezado
    });

    return plan.map((pagina, indice) => {
        const hoja = document.createElement('canvas');
        hoja.width = canvas.width;
        hoja.height = Math.round(hojaPx * escala);
        const ctx = hoja.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, hoja.width, hoja.height);

        let y = indice === 0 ? 0 : MARGEN_SUPERIOR * escala;
        const copiar = (desdePx: number, altoPx: number) => {
            const sy = Math.max(0, Math.round(desdePx * escala));
            const sh = Math.min(Math.round(altoPx * escala), canvas.height - sy);
            if (sh <= 0) return;
            ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, Math.round(y), canvas.width, sh);
            y += sh;
        };

        if (pagina.repetirEncabezado && encabezado) {
            copiar(encabezado.top, alturaEncabezado);
        }
        copiar(pagina.desde, pagina.hasta - pagina.desde);
        return hoja;
    });
}

/** Arma el PDF A4 con las hojas ya paginadas. */
export function generarPdfPaginado(
    contenedor: HTMLElement,
    canvas: HTMLCanvasElement,
    footerCanvas?: HTMLCanvasElement
): jsPDF {
    const hojas = paginarContenedor(contenedor, canvas, footerCanvas);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const footerImg = footerCanvas ? footerCanvas.toDataURL('image/png') : null;
    const footerAlto = footerCanvas ? (footerCanvas.height * ancho) / footerCanvas.width : 0;

    hojas.forEach((hoja, i) => {
        if (i > 0) pdf.addPage();
        pdf.addImage(hoja.toDataURL('image/png'), 'PNG', 0, 0, ancho, alto);
        if (footerImg) {
            pdf.addImage(footerImg, 'PNG', 0, alto - footerAlto, ancho, footerAlto);
        }
    });

    return pdf;
}
