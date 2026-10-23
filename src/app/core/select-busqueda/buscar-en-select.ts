import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { take } from 'rxjs';

/**
 * Búsqueda en todos los `mat-select` (simples y de selección múltiple) sin editar cada pantalla.
 *
 * Al abrir un select se agrega, encima de la lista, un campo para filtrar las opciones por texto. El filtro se hace sobre
 * lo que ya está en pantalla (oculta las opciones que no coinciden), así que sirve igual con listas fijas, con `@for`
 * o con datos que llegan después. Se instala una sola vez al arrancar (`main.ts`).
 *
 * Usa miembros internos de `MatSelect` (`_overlayDir`, `_keyManager`, `_skipPredicate`), igual que `ngx-mat-select-search`;
 * Angular Material está fijo en 18.0.1 y `buscar-en-select.spec.ts` avisa si una actualización los cambia.
 */

/** Un select con menos opciones que esto no lleva búsqueda (Sí/No, estatus…). Con 0 la llevan todos. */
export const UMBRAL_OPCIONES_BUSQUEDA = 6;

/** Clase para dejar un select sin búsqueda: `<mat-select class="sin-busqueda">`. */
export const CLASE_SIN_BUSQUEDA = 'sin-busqueda';

let instalada = false;

export function instalarBusquedaEnSelects(): void {
    if (instalada) return;
    instalada = true;

    const proto = MatSelect.prototype as any;
    const abrir = proto.open as () => void;
    proto.open = function (this: any): void {
        const estabaAbierto = this.panelOpen;
        abrir.call(this);
        // El panel se dibuja en la siguiente revisión de cambios: al adjuntarse el overlay ya existe su contenido
        if (!estabaAbierto && this.panelOpen) this._overlayDir?.attach.pipe(take(1)).subscribe(() => agregarBuscador(this));
    };
}

/** Minúsculas y sin acentos, con los espacios colapsados («Pérez  Juan» → «perez juan»). */
const normalizar = (texto: string): string =>
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function agregarBuscador(select: any): void {
    const superposicion = select._overlayDir?.overlayRef;
    const contenedor: HTMLElement | undefined = superposicion?.overlayElement;
    const lista = contenedor?.querySelector<HTMLElement>('.mat-mdc-select-panel');
    if (!superposicion || !contenedor || !lista) return;

    if (contenedor.querySelector('.select-busqueda')) return;                                     // ya lo tiene
    if (select._elementRef.nativeElement.classList.contains(CLASE_SIN_BUSQUEDA)) return;          // excluido a propósito
    if (lista.querySelector('ngx-mat-select-search')) return;                                     // ya trae su propio buscador
    if (select.options.length < UMBRAL_OPCIONES_BUSQUEDA) return;                                 // lista corta

    const gestor = select._keyManager;
    const predicadoOriginal = select._skipPredicate;
    const ocultas = new Set<MatOption>();
    const textos = new WeakMap<MatOption, string>();
    const textoDe = (o: MatOption): string => {
        let texto = textos.get(o);
        if (texto === undefined) textos.set(o, (texto = normalizar(o.viewValue)));
        return texto;
    };

    // Elementos
    const caja = document.createElement('div');
    caja.className = 'select-busqueda';

    const campo = document.createElement('input');
    campo.type = 'text';
    campo.className = 'select-busqueda__input';
    campo.placeholder = 'Buscar…';
    campo.autocomplete = 'off';
    campo.setAttribute('aria-label', 'Buscar en la lista');

    const limpiar = document.createElement('button');
    limpiar.type = 'button';
    limpiar.className = 'select-busqueda__limpiar';
    limpiar.textContent = '×';
    limpiar.hidden = true;
    limpiar.setAttribute('aria-label', 'Limpiar búsqueda');

    const sinResultados = document.createElement('div');
    sinResultados.className = 'select-busqueda__vacio';
    sinResultados.textContent = 'Sin resultados';
    sinResultados.hidden = true;

    caja.append(campo, limpiar, sinResultados);
    contenedor.classList.add('select-con-busqueda');
    contenedor.insertBefore(caja, lista);

    // Filtro
    const aplicar = (): void => {
        const palabras = normalizar(campo.value).split(' ').filter(Boolean);
        ocultas.clear();
        let hayVisibles = false;

        for (const opcion of select.options as Iterable<MatOption>) {
            const coincide = palabras.every(p => textoDe(opcion).includes(p));
            opcion._getHostElement().style.display = coincide ? '' : 'none';
            if (coincide) hayVisibles = true;
            else ocultas.add(opcion);
        }

        for (const grupo of Array.from(contenedor.querySelectorAll<HTMLElement>('mat-optgroup'))) {
            const alguna = Array.from(grupo.querySelectorAll<HTMLElement>('mat-option')).some(o => o.style.display !== 'none');
            grupo.style.display = alguna ? '' : 'none';
        }

        sinResultados.hidden = hayVisibles || palabras.length === 0;
        limpiar.hidden = campo.value === '';

        if (palabras.length > 0) {
            gestor.setFirstItemActive();   // Enter elige la mejor coincidencia
            lista.scrollTop = 0;
        }
    };

    // Las opciones ocultas no deben recibir las flechas
    gestor.skipPredicate((o: MatOption) => ocultas.has(o) || predicadoOriginal(o));

    // Teclado: el campo está fuera de la lista, así que el select no ve estas teclas
    const alTeclear = (evento: KeyboardEvent): void => {
        switch (evento.key) {
            case 'ArrowDown':
                evento.preventDefault();
                gestor.setNextItemActive();
                break;
            case 'ArrowUp':
                evento.preventDefault();
                gestor.setPreviousItemActive();
                break;
            case 'Enter': {
                evento.preventDefault();
                const activa: MatOption | null = gestor.activeItem;
                if (activa && !ocultas.has(activa)) activa._selectViaInteraction();
                break;
            }
            case 'Escape':
                evento.preventDefault();
                evento.stopPropagation();
                select.close();
                select.focus();
                break;
            case 'Tab':
                select.focus();   // el Tab sigue desde el select hacia el siguiente campo
                select.close();
                break;
        }
    };

    const alEscribir = (): void => aplicar();
    const alLimpiar = (): void => {
        campo.value = '';
        aplicar();
        campo.focus();
    };
    // En selección múltiple el select recupera el foco al elegir; se lo devolvemos al campo
    const seleccion = select.multiple ? select.selectionChange.subscribe(() => campo.focus({ preventScroll: true })) : null;
    // Si llegan opciones nuevas con la lista abierta, se les aplica el filtro
    const cambios = select.options.changes.subscribe(() => aplicar());

    campo.addEventListener('keydown', alTeclear);
    campo.addEventListener('input', alEscribir);
    limpiar.addEventListener('click', alLimpiar);

    // Al cerrar se deja todo como estaba (el panel de Material se reutiliza en la siguiente apertura)
    superposicion.detachments().pipe(take(1)).subscribe(() => {
        campo.removeEventListener('keydown', alTeclear);
        campo.removeEventListener('input', alEscribir);
        limpiar.removeEventListener('click', alLimpiar);
        seleccion?.unsubscribe();
        cambios.unsubscribe();
        gestor.skipPredicate(predicadoOriginal);
        for (const opcion of select.options as Iterable<MatOption>) opcion._getHostElement().style.display = '';
        for (const grupo of Array.from(contenedor.querySelectorAll<HTMLElement>('mat-optgroup'))) grupo.style.display = '';
        caja.remove();
        contenedor.classList.remove('select-con-busqueda');
    });

    // La lista creció: que el overlay vuelva a calcular su lugar y el foco quede en el campo (salvo en pantallas táctiles)
    requestAnimationFrame(() => {
        superposicion.updatePosition();
        if (!window.matchMedia('(pointer: coarse)').matches) campo.focus({ preventScroll: true });
    });
}
