import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { DesempenoService } from '../desempeno.service';
import { MiDesempeno } from '../desempeno.types';
import { MiDesempenoComponent } from './mi-desempeno.component';

const DATOS: MiDesempeno = {
    colaboradorNombre: 'ANA RAMOS',
    evaluaciones: [{
        desempenoId: 1, colaboradorId: 3, colaboradorNombre: 'ANA RAMOS', periodo: '2026-S1',
        objetivo: 'Cerrar 12 instalaciones', resultado: 'Superó la meta', calificacion: 4.6, planAccion: 'Curso de NOM-029',
        tipoEvaluacion: 'ObjetivosKpis', evaluador: 'Jefe', cicloCerrado: true, resultadoLiberado: true, creadoEn: '2026-11-01T00:00:00'
    }],
    planes: [{
        planId: 5, colaboradorId: 3, colaboradorNombre: 'ANA RAMOS', competencia: 'NOM-029', accion: 'Certificación',
        fechaCompromiso: '2027-02-01T00:00:00', estatus: 'EnProceso', visibleParaColaborador: true
    }]
};

describe('MiDesempenoComponent', () => {
    async function montar(respuesta: any): Promise<ComponentFixture<MiDesempenoComponent>> {
        const servicio = jasmine.createSpyObj<DesempenoService>('DesempenoService', ['miDesempeno']);
        servicio.miDesempeno.and.returnValue(respuesta);

        await TestBed.configureTestingModule({
            imports: [MiDesempenoComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [{ provide: DesempenoService, useValue: servicio }]
        }).compileComponents();

        const f = TestBed.createComponent(MiDesempenoComponent);
        f.detectChanges();
        return f;
    }

    const texto = (f: ComponentFixture<MiDesempenoComponent>) => ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    it('muestra el resultado liberado y el plan de desarrollo del colaborador', async () => {
        const t = texto(await montar(of(DATOS)));
        expect(t).toContain('ANA RAMOS');
        expect(t).toContain('Periodo 2026-S1');
        expect(t).toContain('4.6');
        expect(t).toContain('Superó la meta');
        expect(t).toContain('Curso de NOM-029');
        expect(t).toContain('NOM-029');
        expect(t).toContain('Certificación');
        expect(t).toContain('En proceso');
    });

    it('sin resultados liberados ni plan explica por qué no hay nada', async () => {
        const t = texto(await montar(of({ colaboradorNombre: 'ANA RAMOS', evaluaciones: [], planes: [] })));
        expect(t).toContain('Todavía no tienes resultados disponibles');
        expect(t).toContain('Aún no tienes un plan de desarrollo disponible');
    });

    it('si el usuario no es colaborador muestra el mensaje del API', async () => {
        const f = await montar(throwError(() => ({ error: { mensaje: 'Aún no eres colaborador; RRHH debe darte de alta.' } })));
        expect(texto(f)).toContain('Aún no eres colaborador; RRHH debe darte de alta.');
        expect(texto(f)).not.toContain('Mis evaluaciones');
    });
});
