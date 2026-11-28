import * as pdfjsLib from 'pdfjs-dist';
import { ContpaqiMaterialDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';

export class LectorPdfMateriales {
    static async leer(file: File): Promise<ContpaqiMaterialDto[]> {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const allItems: any[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            const items = textContent.items.map((item: any) => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                page: i
            })).filter(item => item.text.trim() !== '');

            if (items.length > 0) {
                items.sort((a, b) => b.y - a.y || a.x - b.x);
                const mergedItems: any[] = [];
                let current = items[0];

                for (let j = 1; j < items.length; j++) {
                    const next = items[j];
                    const yDiff = Math.abs(next.y - current.y);
                    const xDiff = next.x - (current.x + current.width);

                    const threshold = (current.y > 400 || current.text.length < 3) ? 14 : 6;

                    if (yDiff < 2 && xDiff >= -2 && xDiff < threshold) {
                        current.text += ' ' + next.text;
                        current.width += next.width + xDiff;
                    } else {
                        current.text = current.text.trim();
                        if (current.text) mergedItems.push(current);
                        current = next;
                    }
                }
                current.text = current.text.trim();
                if (current.text) mergedItems.push(current);
                allItems.push(...mergedItems);
            }
        }

        return LectorPdfMateriales.interpretarElementos(allItems);
    }

    /**
     * Convierte los textos del PDF (ya agrupados, con su posición) en materiales. Separado de la lectura con pdf.js
     * para poder probarlo con la posición de los textos de un PDF real sin cargar pdf.js.
     */
    static interpretarElementos(allItems: any[]): ContpaqiMaterialDto[] {
        if (allItems.length === 0) return [];

        const rows: any[][] = [];
        let currentRow: any[] = [];
        const sortedItems = [...allItems].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

        sortedItems.forEach((item, index) => {
            if (index === 0) { currentRow.push(item); }
            else {
                const prev = sortedItems[index - 1];
                if (Math.abs(item.y - prev.y) < 6 && item.page === prev.page) { currentRow.push(item); }
                else {
                    rows.push(currentRow.sort((a, b) => a.x - b.x));
                    currentRow = [item];
                }
            }
        });
        if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => a.x - b.x));

        const columnMapping: any = { articulo: -1, nombre: -1, unidad: -1, cantidad: -1, precio: -1, total: -1 };
        const KEYWORDS: any = {
            articulo: ['ARTICULO', 'ARTÍCULO', 'CODIGO', 'CÓDIGO', 'PARTIDA', 'REF', 'CLAVE', 'SKU', 'ID'],
            nombre: ['NOMBRE', 'DESCRIPCION', 'DESCRIPCIÓN', 'CONCEPTO', 'DETALLE', 'PRODUCTO', 'ESPECIFICACIÓN', 'DESCRIPCION DEL ARTICULO'],
            unidad: ['UNIDAD', 'U.MED', 'U.M', 'UM', 'MEDIDA', 'U M', 'UNID', 'UNIT', 'PRESENTACION', 'U/M', 'UNID. MEDIDA'],
            cantidad: ['CANTIDAD', 'UNIDADES', 'CANT', 'QTY', 'PIEZAS', 'PZAS'],
            precio: ['PRECIO', 'COSTO', 'UNITARIO', 'P.U.', 'P.UNIT', 'PREC. NE.', 'VALOR UNITARIO', 'PRECIO NE.'],
            total: ['TOTAL', 'IMPORTE', 'EXTENSIÓN', 'EXTENSION', 'SUBTOTAL', 'SUB TOTAL', 'MONTO', 'NETO', 'TOTAL LINEA']
        };

        const FIN_TABLA_PEGADO = ['IMPORTE CON LETRA', 'DATOS BANCARIOS'];
        const FOOTER_KEYWORDS = ['SUBTOTAL', 'I.V.A', 'IVA', 'TOTAL', 'NETO', 'CONDICIONES', 'ESTIMADO CLIENTE', 'VIGENCIA', 'EXISTENCIA GRUPAL', 'COMPRA MINIMA', 'SUJETOS A CAMBIOS'];

        let foundHeaderRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const rowText = rows[i].map(item => item.text.toUpperCase());
            let matches = 0;
            const tempMapping: any = { articulo: -1, nombre: -1, unidad: -1, cantidad: -1, precio: -1, total: -1 };

            for (const key in KEYWORDS) {
                const foundIndex = rowText.findIndex(text => KEYWORDS[key].some((k: string) => text.includes(k) || k.includes(text)));
                if (foundIndex !== -1) {
                    tempMapping[key] = rows[i][foundIndex].x;
                    matches++;
                }
            }

            const hasEssential = tempMapping.nombre !== -1 && (tempMapping.cantidad !== -1 || tempMapping.total !== -1);
            if (matches >= 2 && hasEssential) {
                const isOrdered = (tempMapping.articulo === -1 || tempMapping.articulo < tempMapping.nombre) &&
                    (tempMapping.articulo === -1 || tempMapping.articulo < tempMapping.cantidad) &&
                    (tempMapping.nombre < tempMapping.cantidad || tempMapping.cantidad === -1) &&
                    (tempMapping.cantidad < tempMapping.total || tempMapping.cantidad === -1 || tempMapping.total === -1);

                if (isOrdered) {
                    Object.assign(columnMapping, tempMapping);
                    foundHeaderRowIndex = i;
                    break;
                }
            }
        }

        // Formato de cotización de CONTPAQi (Cantidad | Unidad | Código | Descripción | T.E. | Valor unit. | Importe):
        // la pdf.js junta los títulos pegados en un solo texto («Cantidad Unidad Código») y la detección normal no
        // los acepta. Este modo SOLO entra cuando la detección normal no halló encabezado: lo que ya se leía
        // bien (compras) sigue exactamente igual.
        let encabezadoPegado = false;
        if (foundHeaderRowIndex === -1) {
            const pegado = LectorPdfMateriales.buscarEncabezadoPegado(rows, KEYWORDS);
            if (pegado) {
                Object.assign(columnMapping, pegado.mapping);
                foundHeaderRowIndex = pegado.indice;
                encabezadoPegado = true;
            }
        }

        const detectedMateriales: ContpaqiMaterialDto[] = [];
        const hasMapping = columnMapping.nombre !== -1 && (columnMapping.cantidad !== -1 || columnMapping.total !== -1);

        for (let i = foundHeaderRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const rowTextStr = row.map(it => it.text.toUpperCase()).join(' ');

            // En el formato de CONTPAQi, «Importe con letra» y «Datos bancarios» ya no son de la tabla.
            if (encabezadoPegado && FIN_TABLA_PEGADO.some(key => rowTextStr.includes(key))) {
                break;
            }

            if (FOOTER_KEYWORDS.some(key => rowTextStr.includes(key))) {
                continue;
            }

            let material = '';
            let descripcion = '';
            let unidadStr = '';
            let cantidad = 0;
            let costo = 0;
            let total = 0;

            if (hasMapping) {
                row.forEach(item => {
                    const closest = LectorPdfMateriales.getClosestColumn(item.x, columnMapping);
                    const text = item.text.trim();
                    switch (closest) {
                        case 'articulo': material = text; break;
                        case 'nombre': descripcion = text; break;
                        case 'unidad': unidadStr = text; break;
                        case 'cantidad': cantidad = LectorPdfMateriales.parseNumber(text); break;
                        case 'precio': costo = LectorPdfMateriales.parseNumber(text); break;
                        case 'total': total = LectorPdfMateriales.parseNumber(text); break;
                    }
                });
            }

            if (material) {
                material = material.replace(/^\d+[\s.-]+/, '').trim();
            }

            if (!material && descripcion) material = descripcion;
            if (!descripcion && material) descripcion = material;

            const isJustText = (descripcion || material) && cantidad === 0 && costo === 0 && total === 0;
            if (isJustText && detectedMateriales.length > 0) {
                const isNameArea = row.some(it => LectorPdfMateriales.getClosestColumn(it.x, columnMapping) === 'nombre');
                if (isNameArea) {
                    const lastIdx = detectedMateriales.length - 1;
                    detectedMateriales[lastIdx].descripcion += ' ' + row.map(it => it.text).join(' ');
                    continue;
                }
            }

            if ((material || descripcion) && (cantidad > 0 || costo > 0 || total > 0)) {
                if (LectorPdfMateriales.isNumeric(material) && material.length < 10 && costo > 0) {
                    material = descripcion.substring(0, 50);
                }

                const finalCant = cantidad || (total > 0 && costo > 0 ? (total / costo) : 1);
                const finalCosto = costo || (total > 0 && cantidad > 0 ? (total / cantidad) : total);
                const finalTotal = total || (cantidad * costo) || 0;

                detectedMateriales.push({
                    materialServicio: (material || descripcion).substring(0, 75),
                    descripcion: descripcion || material,
                    unidad: LectorPdfMateriales.normalizeUnidad(unidadStr || 'PZA'),
                    cantidad: Math.round((finalCant + Number.EPSILON) * 10000) / 10000,
                    costoUnitario: Math.round((finalCosto + Number.EPSILON) * 100) / 100,
                    iva: 0,
                    total: Math.round((finalTotal + Number.EPSILON) * 100) / 100
                });
            }
        }

        return detectedMateriales;
    }

    /** Palabras que solo reconoce el modo de encabezado pegado (no cambian la detección normal). */
    private static readonly EXTRA_PRECIO_PEGADO = ['VALOR UNIT', 'V. UNIT', 'IMPORTE UNITARIO'];
    /** Columnas que existen en el formato pero no son material (tiempo de entrega): lo que caiga ahí se ignora. */
    private static readonly IGNORAR_PEGADO = ['T.E.', 'TIEMPO DE ENTREGA', 'T. ENTREGA'];

    private static esAlfanumerico(c: string | undefined): boolean {
        return !!c && /[A-Z0-9ÁÉÍÓÚÜÑ]/i.test(c);
    }

    /**
     * Busca una fila de encabezado cuyos títulos vengan pegados en un solo texto. Reconoce cada título por separado
     * (palabra completa, de la más larga a la más corta) y reparte su posición dentro del texto pegado.
     * Exige al menos 4 títulos distintos en posiciones distintas, la descripción y la cantidad o el importe, y que
     * los importes queden a la derecha de la descripción; así no confunde filas de datos con el encabezado.
     */
    static buscarEncabezadoPegado(rows: any[][], keywords: any): { indice: number; mapping: any } | null {
        const etiquetas: { texto: string; clave: string }[] = [];
        for (const clave of Object.keys(keywords)) {
            const lista: string[] = clave === 'precio' ? [...keywords[clave], ...LectorPdfMateriales.EXTRA_PRECIO_PEGADO] : keywords[clave];
            lista.forEach(texto => etiquetas.push({ texto, clave }));
        }
        LectorPdfMateriales.IGNORAR_PEGADO.forEach(texto => etiquetas.push({ texto, clave: 'ignorar' }));
        etiquetas.sort((a, b) => b.texto.length - a.texto.length);

        for (let i = 0; i < Math.min(rows.length, 40); i++) {
            const celdas: { clave: string; x: number }[] = [];
            for (const item of rows[i]) {
                const texto = String(item.text || '').toUpperCase();
                const ocupado: boolean[] = new Array(texto.length).fill(false);
                for (const et of etiquetas) {
                    let desde = 0;
                    let pos: number;
                    while ((pos = texto.indexOf(et.texto, desde)) !== -1) {
                        const fin = pos + et.texto.length;
                        const inicioOk = pos === 0 || !LectorPdfMateriales.esAlfanumerico(texto[pos - 1]) || !LectorPdfMateriales.esAlfanumerico(et.texto[0]);
                        const finOk = fin === texto.length || !LectorPdfMateriales.esAlfanumerico(texto[fin]) || !LectorPdfMateriales.esAlfanumerico(et.texto[et.texto.length - 1]);
                        const libre = !ocupado.slice(pos, fin).some(o => o);
                        if (inicioOk && finOk && libre) {
                            for (let k = pos; k < fin; k++) ocupado[k] = true;
                            celdas.push({ clave: et.clave, x: item.x + (pos / texto.length) * (item.width || 0) });
                        }
                        desde = pos + 1;
                    }
                }
            }
            celdas.sort((a, b) => a.x - b.x);

            const mapping: any = { articulo: -1, nombre: -1, unidad: -1, cantidad: -1, precio: -1, total: -1 };
            for (const c of celdas) {
                if (mapping[c.clave] === undefined) mapping[c.clave] = -1;
                if (mapping[c.clave] === -1) mapping[c.clave] = c.x;
            }

            const claves = Object.keys(mapping).filter(k => mapping[k] !== -1);
            if (mapping.nombre === -1 || (mapping.cantidad === -1 && mapping.total === -1) || claves.length < 4) continue;

            const xs = claves.map(k => mapping[k]).sort((a, b) => a - b);
            const distintas = xs.every((x, j) => j === 0 || x - xs[j - 1] >= 10);
            const importesALaDerecha = (mapping.precio === -1 || mapping.precio > mapping.nombre) &&
                (mapping.total === -1 || mapping.total > mapping.nombre) &&
                (mapping.precio === -1 || mapping.total === -1 || mapping.precio < mapping.total);
            if (distintas && importesALaDerecha) {
                return { indice: i, mapping };
            }
        }
        return null;
    }

    static getClosestColumn(x: number, mapping: any): string {
        let minDiff = Infinity;
        let closestKey = '';
        for (const key in mapping) {
            if (mapping[key] === -1) continue;
            const diff = Math.abs(x - mapping[key]);
            if (diff < minDiff && diff < 120) {
                minDiff = diff; closestKey = key;
            }
        }
        return closestKey;
    }

    static isNumeric(val: string): boolean {
        const clean = val.replace(/[$,\s]/g, '');
        return !isNaN(parseFloat(clean)) && isFinite(Number(clean)) && clean !== '';
    }

    static parseNumber(val: string): number {
        if (!val) return 0;
        let clean = val.replace(/[$\s]/g, '');
        if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/,/g, '');
        } else if (clean.includes(',') && !clean.includes('.')) {
            const parts = clean.split(',');
            if (parts[parts.length - 1].length === 3) {
                clean = clean.replace(/,/g, '');
            } else {
                clean = clean.replace(/,/g, '.');
            }
        }
        return parseFloat(clean) || 0;
    }

    static normalizeUnidad(u: string): string {
        if (!u) return 'PZA';
        const unit = u.trim().toUpperCase()
            .replace(/[.]/g, '')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (['PIEZA', 'PZ', 'PZA', 'PIEZAS', 'PZAS', 'PC', 'PCS', 'PIECE', 'EA', 'EACH'].includes(unit)) return 'PZA';
        if (['SERVICIO', 'SER', 'SERV', 'SERVICIOS', 'SERVICE', 'SRV'].includes(unit)) return 'SERVICIO';
        if (['CAJA', 'CJ', 'CJA', 'CAJAS', 'BOX', 'BX', 'CJAS'].includes(unit)) return 'CAJA';
        if (['METRO', 'M', 'MT', 'MTS', 'METROS', 'METER', 'ML', 'METRO LINEAL'].includes(unit)) return 'METRO';
        if (['KILO', 'KG', 'KGS', 'KILOS', 'KILOGRAMO', 'KILOGRAMOS'].includes(unit)) return 'KILO';
        if (['LOTE', 'LT', 'LOT', 'LOTES', 'JOB'].includes(unit)) return 'LOTE';
        if (['PAQUETE', 'PQT', 'PQ', 'PK', 'PKG', 'PAQ'].includes(unit)) return 'PAQUETE';
        if (['PAR', 'PR', 'PARES'].includes(unit)) return 'PAR';
        if (['ROLLO', 'RL', 'ROLLOS', 'ROLL'].includes(unit)) return 'ROLLO';
        if (['LITRO', 'LTR', 'LTS', 'L', 'LITROS'].includes(unit)) return 'LITRO';
        if (['BOTE', 'BT', 'BOTES'].includes(unit)) return 'BOTE';
        if (['BOLSA', 'BLS', 'BAG'].includes(unit)) return 'BOLSA';
        if (['TRAMO', 'TR', 'TRAMOS'].includes(unit)) return 'TRAMO';
        if (['BARRA', 'BR', 'BARRAS'].includes(unit)) return 'BARRA';
        if (['PLIEGO', 'PLG'].includes(unit)) return 'PLIEGO';
        if (['JUEGO', 'JG', 'JGO', 'JUEGOS', 'SET'].includes(unit)) return 'JUEGO';
        if (['TAMBO', 'TB', 'DRUM'].includes(unit)) return 'TAMBO';

        // Si no se encuentra en la lista, retornar PZA por defecto pero conservar valor si es razonable
        return unit.length <= 10 ? unit : 'PZA';
    }
}
