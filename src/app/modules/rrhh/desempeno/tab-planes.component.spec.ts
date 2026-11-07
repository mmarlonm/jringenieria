import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DesempenoService } from './desempeno.service';
import { PlanDesarrollo } from './desempeno.types';
import { TabPlanesComponent } from './tab-planes.component';

function plan(parcial: Partial<PlanDesarrollo> = {}): PlanDesarrollo {
    return {
        planId: 1,
        colaboradorId: 3,
        colaboradorNombre: 'ANA RAMOS',
        competencia: 'NOM-029',
        accion: 'Curso con certificación',
        fechaCompromiso: '2027-01-15T00:00:00',
        estatus: 'Pendiente',
        visibleParaColaborador: false,
        ...parcial
    };
}

describe('TabPlanesComponent', () => {
    let servicio: jasmine.SpyObj<DesempenoService>;

    async function montar(lista: PlanDesarrollo[], gestor: boolean): Promise<ComponentFixture<TabPlanesComponent>> {
        servicio = jasmine.createSpyObj<DesempenoService>('DesempenoService', ['listarPlanes', 'cambiarVisibilidadPlan', 'eliminarPlan']);
        servicio.listarPlanes.and.returnValue(of(lista));

        await TestBed.configureTestingModule({
            imports: [TabPlanesComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                { provide: DesempenoService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => gestor && c === 'rrhh.desempeno.gestionar' } }
            ]
        }).compileComponents();

        const f = TestBed.createComponent(TabPlanesComponent);
        f.detectChanges();
        return f;
    }

    const texto = (f: ComponentFixture<TabPlanesComponent>) => ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    it('muestra el plan con su competencia, acción, compromiso y seguimiento', async () => {
        const f = await montar([plan({ estatus: 'EnProceso' })], false);
        const t = texto(f);
        expect(t).toContain('ANA RAMOS');
        expect(t).toContain('NOM-029');
        expect(t).toContain('Curso con certificación');
        expect(t).toContain('15/01/2027');
        expect(t).toContain('En proceso');
    });

    it('indica si el colaborador ya lo puede ver', async () => {
        const f = await montar([plan({ visibleParaColaborador: true }), plan({ planId: 2, visibleParaColaborador: false })], false);
        const filas = Array.from((f.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map((tr) => (tr.textContent ?? '').replace(/\s+/g, ' '));
        expect(filas[0]).toContain('Sí');
        expect(filas[1]).toContain('No');
    });

    it('solo RRHH ve el botón para mostrar u ocultar el plan al colaborador', async () => {
        expect(texto(await montar([plan()], true))).toContain('Mostrar');
        TestBed.resetTestingModule();
        const sinPermiso = texto(await montar([plan()], false));
        expect(sinPermiso).not.toContain('Mostrar');
        expect(sinPermiso).not.toContain('Ocultar');
    });

    it('al mostrar el plan llama al API con visible = true y actualiza la fila', async () => {
        const original = plan();
        const f = await montar([original], true);
        servicio.cambiarVisibilidadPlan.and.returnValue(of({ ...original, visibleParaColaborador: true }));

        f.componentInstance.cambiarVisibilidad(original);
        f.detectChanges();

        expect(servicio.cambiarVisibilidadPlan).toHaveBeenCalledWith(1, true);
        expect(texto(f)).toContain('Ocultar');
    });

    it('eliminar confirma y recarga', async () => {
        const f = await montar([plan()], true);
        servicio.eliminarPlan.and.returnValue(of(undefined));
        spyOn(window, 'confirm').and.returnValue(true);
        servicio.listarPlanes.calls.reset();

        f.componentInstance.eliminar(plan());

        expect(servicio.eliminarPlan).toHaveBeenCalledWith(1);
        expect(servicio.listarPlanes).toHaveBeenCalled();
    });

    it('sin planes muestra el mensaje vacío', async () => {
        const f = await montar([], true);
        expect(texto(f)).toContain('No hay planes de desarrollo');
    });
});
