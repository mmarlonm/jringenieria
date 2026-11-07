import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DesempenoService } from './desempeno.service';
import { EvaluacionDesempeno } from './desempeno.types';
import { TabEvaluacionesComponent } from './tab-evaluaciones.component';

function evaluacion(parcial: Partial<EvaluacionDesempeno>): EvaluacionDesempeno {
    return {
        desempenoId: 1,
        colaboradorId: 3,
        colaboradorNombre: 'ANA RAMOS',
        periodo: '2026-S1',
        objetivo: 'Cerrar 12 instalaciones',
        resultado: 'Cumplió',
        calificacion: 4.5,
        tipoEvaluacion: 'ObjetivosKpis',
        evaluador: 'Jefe',
        cicloCerrado: false,
        resultadoLiberado: false,
        creadoEn: '2026-11-01T00:00:00',
        ...parcial
    };
}

describe('TabEvaluacionesComponent', () => {
    let servicio: jasmine.SpyObj<DesempenoService>;

    async function montar(lista: EvaluacionDesempeno[], gestor: boolean): Promise<ComponentFixture<TabEvaluacionesComponent>> {
        servicio = jasmine.createSpyObj<DesempenoService>('DesempenoService', ['listarEvaluaciones', 'liberar', 'cerrarCiclo']);
        servicio.listarEvaluaciones.and.returnValue(of(lista));

        await TestBed.configureTestingModule({
            imports: [TabEvaluacionesComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                { provide: DesempenoService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => gestor && c === 'rrhh.desempeno.gestionar' } }
            ]
        }).compileComponents();

        const f = TestBed.createComponent(TabEvaluacionesComponent);
        f.detectChanges();
        return f;
    }

    const texto = (f: ComponentFixture<TabEvaluacionesComponent>) => ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    const botones = (f: ComponentFixture<TabEvaluacionesComponent>) =>
        Array.from((f.nativeElement as HTMLElement).querySelectorAll('tbody button')).map((b) => (b.textContent ?? '').trim());

    it('muestra la evaluación con su calificación y estado', async () => {
        const f = await montar([evaluacion({})], false);
        const t = texto(f);
        expect(t).toContain('ANA RAMOS');
        expect(t).toContain('2026-S1');
        expect(t).toContain('4.5');
        expect(t).toContain('Abierta');
        expect(t).toContain('Objetivos/KPIs');
    });

    it('con el ciclo abierto cualquiera puede editar y cerrar', async () => {
        const f = await montar([evaluacion({})], false);
        expect(botones(f)).toEqual(['Editar', 'Cerrar ciclo']);
    });

    it('cerrada: quien no es RRHH no ve acciones y RRHH puede liberar o reabrir', async () => {
        const cerrada = evaluacion({ cicloCerrado: true });
        expect(botones(await montar([cerrada], false))).toEqual([]);
        TestBed.resetTestingModule();
        expect(botones(await montar([cerrada], true))).toEqual(['Liberar', 'Reabrir']);
    });

    it('liberada: RRHH puede retirar la liberación', async () => {
        const f = await montar([evaluacion({ cicloCerrado: true, resultadoLiberado: true })], true);
        expect(texto(f)).toContain('Liberada');
        expect(botones(f)).toEqual(['Retirar liberación', 'Reabrir']);
    });

    it('al liberar confirma, llama al API y actualiza el estado en la lista', async () => {
        const cerrada = evaluacion({ cicloCerrado: true });
        const f = await montar([cerrada], true);
        servicio.liberar.and.returnValue(of({ ...cerrada, resultadoLiberado: true }));
        spyOn(window, 'confirm').and.returnValue(true);

        f.componentInstance.ejecutar('liberar', cerrada);
        f.detectChanges();

        expect(servicio.liberar).toHaveBeenCalledWith(1);
        expect(texto(f)).toContain('Liberada');
    });

    it('si no se confirma no llama al API', async () => {
        const cerrada = evaluacion({ cicloCerrado: true });
        const f = await montar([cerrada], true);
        spyOn(window, 'confirm').and.returnValue(false);

        f.componentInstance.ejecutar('liberar', cerrada);

        expect(servicio.liberar).not.toHaveBeenCalled();
    });

    it('quien no es RRHH ve el aviso de que RRHH libera los resultados', async () => {
        expect(texto(await montar([], false))).toContain('RRHH libera los resultados');
        TestBed.resetTestingModule();
        expect(texto(await montar([], true))).not.toContain('RRHH libera los resultados');
    });

    it('sin evaluaciones muestra el mensaje vacío', async () => {
        const f = await montar([], true);
        expect(texto(f)).toContain('No hay evaluaciones de desempeño');
    });
});
