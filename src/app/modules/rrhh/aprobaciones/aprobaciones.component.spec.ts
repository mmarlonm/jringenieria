import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { AusenciasService } from '../ausencias/ausencias.service';
import { AprobacionRespuesta, SolicitudAusencia } from '../ausencias/ausencias.types';
import { AprobacionesComponent } from './aprobaciones.component';

const SOLICITUD = {
    solicitudId: 7, colaboradorId: 3, colaborador: 'ANA RAMOS', area: 'Operaciones', tipo: 'Vacaciones', tipoCodigo: 'VACACIONES',
    fechaInicio: '2026-12-01T00:00:00', fechaFin: '2026-12-03T00:00:00', diasHabiles: 3, motivo: null, estatus: 'PENDIENTE_RRHH',
    jefeComentario: null, rrhhComentario: null, creadoEn: '2026-11-01T00:00:00', disponible: 10, traslapes: []
} as SolicitudAusencia;

const OK: AprobacionRespuesta = { mensaje: 'Solicitud aprobada.', calendarioEnviado: false, calendarioAviso: null };

describe('AprobacionesComponent', () => {
    let servicio: jasmine.SpyObj<AusenciasService>;
    let dialogo: jasmine.Spy;
    let aviso: jasmine.Spy;

    /** `esRrhh` = tiene el permiso especial de aprobar; `elegido` = lo que devuelve el diálogo (undefined = canceló). */
    async function montar(esRrhh: boolean, elegido?: { calendarioId: string | null }): Promise<ComponentFixture<AprobacionesComponent>> {
        servicio = jasmine.createSpyObj<AusenciasService>('AusenciasService', ['porAprobar', 'aprobar', 'rechazar']);
        servicio.porAprobar.and.returnValue(of([SOLICITUD]));
        servicio.aprobar.and.returnValue(of(OK));
        dialogo = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(elegido) });
        aviso = jasmine.createSpy('open');

        await TestBed.configureTestingModule({
            imports: [AprobacionesComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                { provide: AusenciasService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => esRrhh && c === 'rrhh.permisos.aprobar' } },
                { provide: MatDialog, useValue: { open: dialogo } },
                { provide: MatSnackBar, useValue: { open: aviso } }
            ]
        }).compileComponents();

        const f = TestBed.createComponent(AprobacionesComponent);
        f.detectChanges();
        return f;
    }

    it('un jefe sin el permiso de RRHH aprueba directo, como siempre, sin preguntar por el calendario', async () => {
        const f = await montar(false);

        f.componentInstance.aprobar(SOLICITUD);

        expect(dialogo).not.toHaveBeenCalled();
        expect(servicio.aprobar).toHaveBeenCalledWith(7, undefined, undefined);
    });

    it('RRHH primero elige el calendario y la aprobación lo manda con la solicitud', async () => {
        const f = await montar(true, { calendarioId: 'vacaciones' });

        f.componentInstance.aprobar(SOLICITUD);

        expect(dialogo).toHaveBeenCalled();
        expect(servicio.aprobar).toHaveBeenCalledWith(7, undefined, 'vacaciones');
    });

    it('si RRHH cancela el diálogo no se aprueba nada', async () => {
        const f = await montar(true, undefined);

        f.componentInstance.aprobar(SOLICITUD);

        expect(servicio.aprobar).not.toHaveBeenCalled();
    });

    it('RRHH puede aprobar sin calendario', async () => {
        const f = await montar(true, { calendarioId: null });

        f.componentInstance.aprobar(SOLICITUD);

        expect(servicio.aprobar).toHaveBeenCalledWith(7, undefined, undefined);
    });

    it('avisa que se agregó al calendario', async () => {
        const f = await montar(true, { calendarioId: 'vacaciones' });
        servicio.aprobar.and.returnValue(of({ ...OK, calendarioEnviado: true }));

        f.componentInstance.aprobar(SOLICITUD);

        expect(aviso.calls.mostRecent().args[0]).toBe('Solicitud aprobada. Se agregó al calendario de Google.');
    });

    it('si el calendario falló dice que la solicitud sí quedó aprobada y por qué no llegó', async () => {
        const f = await montar(true, { calendarioId: 'vacaciones' });
        servicio.aprobar.and.returnValue(of({ ...OK, calendarioAviso: 'Vuelve a conectar tu cuenta de Google.' }));

        f.componentInstance.aprobar(SOLICITUD);

        expect(aviso.calls.mostRecent().args[0]).toBe('Solicitud aprobada. No se agregó al calendario: Vuelve a conectar tu cuenta de Google.');
    });
});
