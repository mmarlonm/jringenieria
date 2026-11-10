import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { FormularioProductoDto, SurveysProductsService } from '../surveys.service';
import { SurveysListComponent } from './surveys-list.component';

describe('SurveysListComponent: manejo de errores del servidor', () => {
    let servicio: jasmine.SpyObj<SurveysProductsService>;
    let avisos: jasmine.Spy;
    let componente: SurveysListComponent;

    const encuesta = (id: number, activo = true): FormularioProductoDto => ({
        id, slug: `encuesta-${id}`, titulo: `Encuesta ${id}`, camposConfigJson: '[]', disenoConfigJson: '{}',
        tipo: 'producto', activo, fechaCreacion: '2026-11-03T10:00:00.000Z', totalRespuestas: 0
    });

    const servidorCaido = () => throwError(() => ({ status: 502, error: {} }));

    beforeEach(() => {
        servicio = jasmine.createSpyObj<SurveysProductsService>('SurveysProductsService', [
            'getFormularios', 'obtenerRespuestasUnificadas', 'guardarFormulario', 'eliminarFormulario'
        ]);
        servicio.getFormularios.and.returnValue(of([]));
        servicio.obtenerRespuestasUnificadas.and.returnValue(of([]));
        avisos = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));

        TestBed.configureTestingModule({
            imports: [SurveysListComponent, NoopAnimationsModule],
            providers: [
                { provide: SurveysProductsService, useValue: servicio },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
            ]
        });
        TestBed.overrideComponent(SurveysListComponent, { set: { template: '' } });
        componente = TestBed.createComponent(SurveysListComponent).componentInstance;
    });

    describe('errores del servidor al interactuar con encuestas', () => {
        it('si el servidor no pudo activar o desactivar una encuesta, la deja como estaba y avisa', () => {
            const form = encuesta(1, true);
            servicio.guardarFormulario.and.returnValue(servidorCaido());

            componente.toggleActivoFormulario(form);

            expect(form.activo).withContext('debe volver a su valor original').toBeTrue();
            expect(avisos.calls.mostRecent().args[2]).toBe('error');
        });

        it('si el servidor no pudo duplicar una encuesta, avisa', () => {
            servicio.guardarFormulario.and.returnValue(servidorCaido());

            componente.duplicarFormulario(encuesta(1));

            expect(avisos.calls.mostRecent().args[2]).toBe('error');
        });

        it('si el servidor no pudo eliminar una encuesta, avisa en lugar de decir que se eliminó', async () => {
            avisos.and.returnValues(Promise.resolve({ isConfirmed: true } as any), Promise.resolve({} as any));
            servicio.eliminarFormulario.and.returnValue(servidorCaido());

            componente.eliminarFormulario(encuesta(1));
            await Promise.resolve();
            await Promise.resolve();

            const ultimo = avisos.calls.mostRecent().args;
            expect(ultimo[2]).toBe('error');
            expect(String(ultimo[1])).not.toContain('eliminada correctamente');
        });
    });
});
