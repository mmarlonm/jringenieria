import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OffboardingService } from '../offboarding.service';
import { OffboardingResumen } from '../offboarding.types';
import { OffboardingListaComponent } from './offboarding-lista.component';

function resumen(parcial: Partial<OffboardingResumen>): OffboardingResumen {
    return {
        bajaId: 1,
        folio: 'BAJA-2026-0001',
        colaboradorId: 3,
        colaboradorNombre: 'ANA RAMOS',
        puestoArea: 'Técnico / Operaciones',
        causa: 'RenunciaConAviso',
        ruta: 1,
        rutaNombre: 'Renuncia con aviso',
        fechaApertura: '2026-11-02T00:00:00',
        ultimoDiaLaborado: '2026-11-06T00:00:00',
        estatus: 'Abierto',
        tareasTotal: 14,
        tareasResueltas: 7,
        tareasVencidas: 0,
        limiteBajaImss: '2026-11-13T00:00:00',
        alertaBajaImss: 'EnTiempo',
        ...parcial
    };
}

describe('OffboardingListaComponent', () => {
    let servicio: jasmine.SpyObj<OffboardingService>;

    async function montar(bajas: OffboardingResumen[]): Promise<ComponentFixture<OffboardingListaComponent>> {
        servicio = jasmine.createSpyObj<OffboardingService>('OffboardingService', ['listar']);
        servicio.listar.and.returnValue(of(bajas));

        await TestBed.configureTestingModule({
            imports: [OffboardingListaComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [provideRouter([]), { provide: OffboardingService, useValue: servicio }]
        }).compileComponents();

        const fixture = TestBed.createComponent(OffboardingListaComponent);
        fixture.detectChanges();
        return fixture;
    }

    const texto = (f: ComponentFixture<OffboardingListaComponent>) =>
        ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    it('lista los casos con su causa, avance y estatus', async () => {
        const f = await montar([resumen({})]);
        const t = texto(f);
        expect(t).toContain('ANA RAMOS');
        expect(t).toContain('BAJA-2026-0001');
        expect(t).toContain('Renuncia con aviso');
        expect(t).toContain('7/14');
        expect(t).toContain('Abierto');
    });

    it('cuenta los casos en proceso y los que tienen la baja IMSS vencida', async () => {
        const f = await montar([
            resumen({ bajaId: 1 }),
            resumen({ bajaId: 2, folio: 'BAJA-2026-0002', colaboradorNombre: 'LUIS PEREZ', alertaBajaImss: 'Vencida' }),
            resumen({ bajaId: 3, folio: 'BAJA-2026-0003', colaboradorNombre: 'MARTA DIAZ', estatus: 'Cerrado', alertaBajaImss: 'Registrada' })
        ]);

        expect(f.componentInstance.enProceso).toBe(2);
        expect(f.componentInstance.conImssVencida).toBe(1);
        expect(texto(f)).toContain('Plazo de baja IMSS vencido');
    });

    it('avisa cuántas tareas están vencidas', async () => {
        const f = await montar([resumen({ tareasVencidas: 3 })]);
        expect(texto(f)).toContain('3 tareas vencidas');
    });

    it('sin casos muestra el mensaje vacío', async () => {
        const f = await montar([]);
        expect(texto(f)).toContain('No hay casos de baja');
    });

    it('al filtrar vuelve a pedir la lista con el estatus', async () => {
        const f = await montar([]);
        servicio.listar.calls.reset();

        f.componentInstance.filtroEstatus = 'BajaRegistrada';
        f.componentInstance.cargar();

        expect(servicio.listar).toHaveBeenCalledWith(jasmine.objectContaining({ estatus: 'BajaRegistrada' }));
    });
});
