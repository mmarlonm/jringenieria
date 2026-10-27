import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RechazoFila, ResultadoImportacion } from '../../finanzas.types';
import { ResultadoImportacionComponent } from './resultado-importacion.component';

describe('ResultadoImportacionComponent', () => {
    const resultado = (parcial: Partial<ResultadoImportacion> = {}): ResultadoImportacion => ({
        importacionId: null,
        empresaId: 3,
        cuentaId: null,
        nombreArchivo: 'ficticio.xlsx',
        hoja: null,
        filasLeidas: 3,
        nuevos: 2,
        actualizados: 1,
        sinCambios: 0,
        rechazados: [],
        advertencias: [],
        periodoDesde: null,
        periodoHasta: null,
        soloValidar: true,
        primerSaldo: null,
        ultimoSaldo: null,
        ultimoSaldoGuardado: null,
        ...parcial
    });

    const rechazos = (cuantos: number): RechazoFila[] => Array.from({ length: cuantos }, (_, i) => ({ fila: i + 2, motivo: `Motivo ${i + 2}` }));

    let fixture: ComponentFixture<ResultadoImportacionComponent>;

    const mostrar = (r: ResultadoImportacion): HTMLElement => {
        fixture = TestBed.createComponent(ResultadoImportacionComponent);
        fixture.componentRef.setInput('resultado', r);
        fixture.detectChanges();
        return fixture.nativeElement;
    };

    it('muestra la línea de resumen y nada más cuando no hay advertencias ni rechazos', () => {
        const el = mostrar(resultado());

        expect(el.textContent).toContain('2 nuevos · 1 actualizados · 0 sin cambios · 0 rechazados');
        expect(el.textContent).not.toContain('Advertencias');
        expect(el.textContent).not.toContain('Filas rechazadas');
        expect(el.querySelector('table')).toBeNull();
    });

    it('lista las advertencias', () => {
        const el = mostrar(resultado({ advertencias: ['Columna «Folio» no encontrada', 'El saldo no cuadra'] }));

        expect(el.textContent).toContain('Advertencias');
        expect(el.querySelectorAll('li').length).toBe(2);
        expect(el.textContent).toContain('El saldo no cuadra');
    });

    it('muestra todas las filas rechazadas mientras no pasen de 200, sin nota', () => {
        const el = mostrar(resultado({ rechazados: rechazos(200) }));

        expect(el.querySelectorAll('tbody tr').length).toBe(200);
        expect(el.textContent).not.toContain('Se muestran las primeras');
    });

    it('con más de 200 rechazos muestra solo las primeras 200 y avisa con cuántos hay', () => {
        const el = mostrar(resultado({ rechazados: rechazos(250) }));

        const filas = el.querySelectorAll('tbody tr');
        expect(filas.length).toBe(200);
        expect(filas[199].textContent).toContain('Motivo 201'); // las filas rechazadas son la 2..251: la 200.ª visible es la 201
        expect(el.textContent).toContain('Se muestran las primeras 200 de 250 filas rechazadas.');
        expect(el.textContent).toContain('250 rechazados'); // el resumen cuenta todos
    });

    it('proyecta el contenido que le pone la página (p. ej. las cifras del banco)', () => {
        @Component({
            standalone: true,
            imports: [ResultadoImportacionComponent],
            template: `<app-finanzas-resultado-importacion [resultado]="r"><p class="extra">Cifra propia</p></app-finanzas-resultado-importacion>`
        })
        class AnfitrionComponent {
            r = resultado();
        }

        const anfitrion = TestBed.createComponent(AnfitrionComponent);
        anfitrion.detectChanges();

        expect(anfitrion.nativeElement.querySelector('.extra')?.textContent).toBe('Cifra propia');
        expect(anfitrion.nativeElement.textContent).toContain('2 nuevos');
    });
});
