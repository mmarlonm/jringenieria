import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { CalendarioGoogle, CalendarioService } from 'app/modules/admin/calendario/calendario.service';
import { AprobarDialogComponent, CALENDARIO_GUARDADO } from './aprobar-dialog.component';

const cal = (parcial: Partial<CalendarioGoogle>): CalendarioGoogle => ({
    id: 'x', nombre: 'X', color: '#fff', rol: 'owner', esPrincipal: false, seleccionado: true, ...parcial
});

const CALENDARIOS = [
    cal({ id: 'yo@jr.mx', nombre: 'Personal', esPrincipal: true }),
    cal({ id: 'vacaciones', nombre: 'Vacaciones JR', rol: 'writer' }),
    cal({ id: 'festivos', nombre: 'Festivos México', rol: 'reader' })
];

describe('AprobarDialogComponent', () => {
    let cerrar: jasmine.Spy;

    async function montar(respuesta: any): Promise<ComponentFixture<AprobarDialogComponent>> {
        cerrar = jasmine.createSpy('close');
        const servicio = jasmine.createSpyObj<CalendarioService>('CalendarioService', ['calendarios']);
        servicio.calendarios.and.returnValue(respuesta);

        await TestBed.configureTestingModule({
            imports: [AprobarDialogComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                { provide: CalendarioService, useValue: servicio },
                { provide: MatDialogRef, useValue: { close: cerrar } },
                { provide: MAT_DIALOG_DATA, useValue: { colaborador: 'ANA RAMOS', tipo: 'Vacaciones' } }
            ]
        }).compileComponents();

        const f = TestBed.createComponent(AprobarDialogComponent);
        f.detectChanges();
        return f;
    }

    const texto = (f: ComponentFixture<AprobarDialogComponent>) => ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    beforeEach(() => localStorage.removeItem(CALENDARIO_GUARDADO));
    afterEach(() => localStorage.removeItem(CALENDARIO_GUARDADO));

    it('ofrece solo los calendarios donde se puede escribir', async () => {
        const f = await montar(of(CALENDARIOS));
        expect(f.componentInstance.calendarios().map((c) => c.id)).toEqual(['yo@jr.mx', 'vacaciones']);
    });

    it('por omisión no manda nada al calendario: aprobar cierra con calendarioId nulo', async () => {
        const f = await montar(of(CALENDARIOS));

        f.componentInstance.aprobar();

        expect(cerrar).toHaveBeenCalledWith({ calendarioId: null });
    });

    it('al activar la opción hay que elegir calendario y se devuelve el elegido', async () => {
        const f = await montar(of(CALENDARIOS));
        f.componentInstance.agregar.setValue(true);
        f.componentInstance.calendarioId.setValue('');
        expect(f.componentInstance.puedeAprobar).toBeFalse();

        f.componentInstance.calendarioId.setValue('vacaciones');
        f.componentInstance.aprobar();

        expect(f.componentInstance.puedeAprobar).toBeTrue();
        expect(cerrar).toHaveBeenCalledWith({ calendarioId: 'vacaciones' });
    });

    it('recuerda el último calendario usado y lo deja listo la próxima vez', async () => {
        const f = await montar(of(CALENDARIOS));
        f.componentInstance.agregar.setValue(true);
        f.componentInstance.calendarioId.setValue('vacaciones');
        f.componentInstance.aprobar();
        expect(localStorage.getItem(CALENDARIO_GUARDADO)).toBe('vacaciones');

        TestBed.resetTestingModule();
        const otra = await montar(of(CALENDARIOS));

        expect(otra.componentInstance.agregar.value).toBeTrue();
        expect(otra.componentInstance.calendarioId.value).toBe('vacaciones');
    });

    it('si la última vez aprobó sin calendario, no lo vuelve a activar', async () => {
        const f = await montar(of(CALENDARIOS));
        f.componentInstance.agregar.setValue(true);
        f.componentInstance.calendarioId.setValue('vacaciones');
        f.componentInstance.aprobar();
        TestBed.resetTestingModule();
        const segunda = await montar(of(CALENDARIOS));
        segunda.componentInstance.agregar.setValue(false);
        segunda.componentInstance.aprobar();
        TestBed.resetTestingModule();

        const tercera = await montar(of(CALENDARIOS));

        expect(tercera.componentInstance.agregar.value).toBeFalse();
    });

    it('si el calendario recordado ya no existe o no se puede escribir, no lo usa', async () => {
        localStorage.setItem(CALENDARIO_GUARDADO, 'festivos');

        const f = await montar(of(CALENDARIOS));

        expect(f.componentInstance.agregar.value).toBeFalse();
        expect(f.componentInstance.calendarioId.value).toBe('');
    });

    it('sin cuenta de Google conectada explica qué hacer y deja aprobar sin calendario', async () => {
        const f = await montar(throwError(() => ({ status: 409, error: { mensaje: 'Conecta tu cuenta de Google para ver tu calendario.' } })));

        expect(texto(f)).toContain('Conecta tu cuenta de Google para ver tu calendario.');
        f.componentInstance.aprobar();

        expect(cerrar).toHaveBeenCalledWith({ calendarioId: null });
    });

    it('si Google no responde lo dice y aun así permite aprobar', async () => {
        const f = await montar(throwError(() => ({ status: 500 })));

        expect(texto(f)).toContain('No se pudieron cargar tus calendarios de Google');
        expect(f.componentInstance.puedeAprobar).toBeTrue();
    });

    it('si no tiene ningún calendario donde escribir lo avisa', async () => {
        const f = await montar(of([cal({ id: 'festivos', rol: 'reader' })]));

        expect(texto(f)).toContain('no tienes ningún calendario de Google donde se pueda escribir');
    });

    it('menciona a quién se aprueba', async () => {
        expect(texto(await montar(of(CALENDARIOS)))).toContain('Aprobar solicitud de ANA RAMOS');
    });
});
