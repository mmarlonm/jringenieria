import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FacturaCobranza } from '../../finanzas.types';
import { SeguimientoDialogComponent } from './seguimiento-dialog.component';

describe('SeguimientoDialog layout (diseño en pantallas chicas)', () => {
    let dialog: MatDialog;

    const facturaMock: FacturaCobranza = {
        cfdiId: 42,
        uuid: '12345678-1234-1234-1234-123456789abc',
        serie: 'F',
        folio: '100',
        fechaEmision: '2026-10-01T00:00:00',
        cliente: 'Cliente Prueba SA',
        rfcCliente: 'CPR010101ABC',
        moneda: 'MXN',
        total: 10000,
        cobrado: 0,
        notasCredito: 0,
        saldo: 10000,
        estadoPago: 'Pendiente',
        fechaVencimiento: '2026-11-15T00:00:00',
        cobroEsperado: '2026-11-20T00:00:00',
        fechaEfectiva: '2026-11-20T00:00:00',
        atrasada: false,
        diasAtraso: null,
        estatus: 'Programado',
        responsable: 'María Pérez',
        probabilidad: 0.85,
        observaciones: 'Pago confirmado por teléfono con observaciones extensas para pruebas de layout de pantalla chica.'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule, MatDialogModule, NoopAnimationsModule] });
        dialog = TestBed.inject(MatDialog);
    });

    afterEach(() => {
        dialog.closeAll();
    });

    const abrir = async () => {
        dialog.open(SeguimientoDialogComponent, { width: '36rem', maxWidth: '95vw', data: { factura: facturaMock } });
        const app = TestBed.inject(ApplicationRef);
        app.tick();
        await new Promise((resolver) => setTimeout(resolver, 50));
        const panel = document.querySelector('.mat-mdc-dialog-container') as HTMLElement;
        return {
            contenido: panel.querySelector('mat-dialog-content') as HTMLElement,
            botones: Array.from(panel.querySelectorAll('mat-dialog-actions button, button[type="submit"]')) as HTMLElement[]
        };
    };

    it('Seguimiento_el_contenido_tiene_tope_de_alto_y_scroll_propio', async () => {
        const { contenido } = await abrir();
        const estilo = getComputedStyle(contenido);

        expect(estilo.maxHeight).withContext(`max-height del contenido: ${estilo.maxHeight}`).not.toBe('none');
        expect(['auto', 'scroll']).withContext(`overflow-y del contenido: ${estilo.overflowY}`).toContain(estilo.overflowY);
        expect(contenido.getBoundingClientRect().height)
            .withContext(`alto del contenido ${contenido.getBoundingClientRect().height} vs pantalla ${window.innerHeight}`)
            .toBeLessThanOrEqual(window.innerHeight);
        expect(contenido.scrollHeight)
            .withContext('el contenido debe ser más alto que su caja (si no, no hay nada que desplazar)')
            .toBeGreaterThan(contenido.clientHeight);
    });

    it('Seguimiento_los_botones_quedan_dentro_de_la_pantalla_sin_desplazar_la_pagina', async () => {
        const { botones } = await abrir();

        expect(botones.length).toBeGreaterThan(0);
        for (const boton of botones) {
            const caja = boton.getBoundingClientRect();
            expect(caja.bottom)
                .withContext(`base del botón «${boton.textContent?.trim()}» ${caja.bottom} vs pantalla ${window.innerHeight}`)
                .toBeLessThanOrEqual(window.innerHeight);
            expect(caja.top).toBeGreaterThanOrEqual(0);
        }
    });
});
