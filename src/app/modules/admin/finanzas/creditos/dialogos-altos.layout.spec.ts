import { ApplicationRef, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from 'environments/environment';
import { Credito, CreditoPago } from '../finanzas.types';
import { CreditoDialogComponent } from './credito-dialog/credito-dialog.component';
import { CuotasDialogComponent } from './cuotas-dialog/cuotas-dialog.component';

/**
 * Los diálogos de Créditos son altos: el de crédito tiene 11 campos (en una sola columna en el celular) y el del calendario
 * puede traer decenas de cuotas. Los estilos globales traen `.mat-mdc-dialog-content { max-height: none !important }`, así que
 * sin la clase `dialogo-alto` el contenido no tiene scroll y lo de abajo (incluidos los botones) queda cortado e inalcanzable.
 * Estas pruebas miden el diseño real en el navegador: no dependen del tamaño de la ventana, solo de que el contenido tenga tope
 * de alto y scroll propio, y de que los botones queden dentro de la pantalla.
 */
describe('Diálogos altos de Créditos (diseño en pantallas chicas)', () => {
    let dialog: MatDialog;
    let httpMock: HttpTestingController;

    const credito: Credito = {
        creditoId: 10, empresaId: 1, sentido: 'Recibido', tipo: 'Simple', contraparte: 'Banco Ficticio', moneda: 'MXN',
        montoOriginal: 100000, saldoCapital: 80000, tasaAnual: 0.155, vencimientoFinal: '2028-12-31', cuentaId: null,
        estado: 'Activo', notas: null, fechaActualizacion: '2026-11-04T00:00:00', proximoVencimiento: null, proximoPago: null,
        pagosPendientes: 0, pagosTotales: 0
    };

    // 40 cuotas: más que alto de cualquier celular.
    const cuotas: CreditoPago[] = Array.from({ length: 40 }, (_, i) => ({
        pagoId: i + 1, creditoId: 10, vencimiento: `2027-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00`,
        capital: 1000, interes: 100, total: 1100, estado: 'Pendiente' as const, fechaPago: null
    }));

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule, MatDialogModule, NoopAnimationsModule] });
        dialog = TestBed.inject(MatDialog);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        dialog.closeAll();
    });

    const abrir = async <T>(componente: Type<T>, datos: unknown, ancho: string, respuestas: Record<string, unknown>) => {
        dialog.open(componente, { width: ancho, maxWidth: '95vw', data: datos });
        const app = TestBed.inject(ApplicationRef);
        app.tick(); // ngOnInit: pide sus datos
        for (const [ruta, cuerpo] of Object.entries(respuestas)) {
            httpMock.match(`${environment.apiUrl}/Finanzas/${ruta}`).forEach((peticion) => peticion.flush(cuerpo));
        }
        app.tick();
        await new Promise((resolver) => setTimeout(resolver, 50));
        const panel = document.querySelector('.mat-mdc-dialog-container') as HTMLElement;
        return {
            contenido: panel.querySelector('mat-dialog-content') as HTMLElement,
            botones: Array.from(panel.querySelectorAll('mat-dialog-actions button, button[type="submit"]')) as HTMLElement[]
        };
    };

    const casos: { nombre: string; abrir: () => ReturnType<typeof abrir> }[] = [
        {
            nombre: 'Crédito',
            abrir: () => abrir(CreditoDialogComponent, {}, '40rem', { empresas: [{ empresaId: 1, rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia', tipo: 'M', activa: true }] })
        },
        {
            nombre: 'Calendario de pagos',
            abrir: () => abrir(CuotasDialogComponent, { credito }, '56rem', { 'creditos/10/pagos': cuotas })
        }
    ];

    for (const caso of casos) {
        it(`${caso.nombre}_el_contenido_tiene_tope_de_alto_y_scroll_propio`, async () => {
            const { contenido } = await caso.abrir();
            const estilo = getComputedStyle(contenido);

            expect(estilo.maxHeight).withContext(`max-height del contenido: ${estilo.maxHeight}`).not.toBe('none');
            expect(['auto', 'scroll']).withContext(`overflow-y del contenido: ${estilo.overflowY}`).toContain(estilo.overflowY);
            expect(contenido.getBoundingClientRect().height)
                .withContext(`alto del contenido ${contenido.getBoundingClientRect().height} vs pantalla ${window.innerHeight}`)
                .toBeLessThanOrEqual(window.innerHeight);
            expect(contenido.scrollHeight).withContext('el contenido debe ser más alto que su caja (si no, no hay nada que desplazar)').toBeGreaterThan(contenido.clientHeight);
        });

        it(`${caso.nombre}_los_botones_quedan_dentro_de_la_pantalla_sin_desplazar_la_pagina`, async () => {
            const { botones } = await caso.abrir();

            expect(botones.length).toBeGreaterThan(0);
            for (const boton of botones) {
                const caja = boton.getBoundingClientRect();
                expect(caja.bottom).withContext(`base del botón «${boton.textContent?.trim()}» ${caja.bottom} vs pantalla ${window.innerHeight}`).toBeLessThanOrEqual(window.innerHeight);
                expect(caja.top).toBeGreaterThanOrEqual(0);
            }
        });
    }
});
