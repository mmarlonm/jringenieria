import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DesempenoService } from './desempeno.service';
import { EvaluacionCompetencia } from './desempeno.types';
import { TabCompetenciasComponent } from './tab-competencias.component';

function competencia(parcial: Partial<EvaluacionCompetencia>): EvaluacionCompetencia {
    return {
        evaluacionId: 1,
        colaboradorId: 3,
        colaboradorNombre: 'ANA RAMOS',
        puesto: 'Técnico electricista',
        area: 'Operaciones',
        competencia: 'NOM-029',
        nivelRequerido: 4,
        nivelActual: 2,
        brecha: 2,
        clasificacion: 'BrechaCritica',
        requiereCapacitacion: true,
        estatus: 'Pendiente',
        creadoEn: '2026-11-01T00:00:00',
        ...parcial
    };
}

describe('TabCompetenciasComponent', () => {
    let servicio: jasmine.SpyObj<DesempenoService>;

    async function montar(lista: EvaluacionCompetencia[], gestor: boolean): Promise<ComponentFixture<TabCompetenciasComponent>> {
        servicio = jasmine.createSpyObj<DesempenoService>('DesempenoService', ['listarCompetencias', 'generarCapacitacion']);
        servicio.listarCompetencias.and.returnValue(of(lista));

        await TestBed.configureTestingModule({
            imports: [TabCompetenciasComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: DesempenoService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => gestor && c === 'rrhh.desempeno.gestionar' } }
            ]
        }).compileComponents();

        const f = TestBed.createComponent(TabCompetenciasComponent);
        f.detectChanges();
        return f;
    }

    const texto = (f: ComponentFixture<TabCompetenciasComponent>) => ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    const botones = (f: ComponentFixture<TabCompetenciasComponent>) =>
        Array.from((f.nativeElement as HTMLElement).querySelectorAll('tbody button')).map((b) => (b.textContent ?? '').trim());

    it('muestra niveles, brecha y clasificación', async () => {
        const f = await montar([competencia({})], true);
        const t = texto(f);
        expect(t).toContain('NOM-029');
        expect(t).toContain('4 / 2');
        expect(t).toContain('Brecha crítica (2)');
        expect(t).toContain('Requiere capacitación');
    });

    it('el resumen cuenta evaluaciones, brechas, críticas y las que faltan por capacitar', async () => {
        const f = await montar([
            competencia({ evaluacionId: 1 }),
            competencia({ evaluacionId: 2, brecha: 1, clasificacion: 'BrechaMenor', capacitacionId: 9, capacitacionFolio: 'CAP-2026-0009' }),
            competencia({ evaluacionId: 3, brecha: 0, clasificacion: 'SinBrecha', requiereCapacitacion: false })
        ], true);

        expect(f.componentInstance.resumen).toEqual({ total: 3, conBrecha: 2, criticas: 1, sinCapacitacion: 1 });
    });

    it('RRHH puede generar la capacitación; quien no es RRHH solo edita', async () => {
        expect(botones(await montar([competencia({})], true))).toEqual(['Editar', 'Generar capacitación']);
        TestBed.resetTestingModule();
        expect(botones(await montar([competencia({})], false))).toEqual(['Editar']);
    });

    it('si ya se generó muestra el folio del curso y no vuelve a ofrecer generarlo', async () => {
        const f = await montar([competencia({ capacitacionId: 9, capacitacionFolio: 'CAP-2026-0009' })], true);
        expect(texto(f)).toContain('CAP-2026-0009');
        expect(botones(f)).toEqual(['Editar']);
    });

    it('al generar confirma, llama al API y recarga la lista', async () => {
        const ev = competencia({});
        const f = await montar([ev], true);
        servicio.generarCapacitacion.and.returnValue(of({ ...ev, capacitacionId: 9, capacitacionFolio: 'CAP-2026-0009' }));
        spyOn(window, 'confirm').and.returnValue(true);
        servicio.listarCompetencias.calls.reset();

        f.componentInstance.ejecutar('generarCapacitacion', ev);

        expect(servicio.generarCapacitacion).toHaveBeenCalledWith(1);
        expect(servicio.listarCompetencias).toHaveBeenCalled();
    });

    it('el filtro "solo con brecha" se manda al API', async () => {
        const f = await montar([], true);
        servicio.listarCompetencias.calls.reset();

        f.componentInstance.soloConBrecha = true;
        f.componentInstance.cargar();

        expect(servicio.listarCompetencias).toHaveBeenCalledWith(jasmine.objectContaining({ soloConBrecha: true }));
    });

    it('sin evaluaciones muestra el mensaje vacío', async () => {
        const f = await montar([], true);
        expect(texto(f)).toContain('No hay evaluaciones de competencias');
    });
});
