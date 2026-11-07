import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { ActasService } from './actas/actas.service';
import { DialogoActaComponent } from './actas/dialogos/dialogo-acta.component';
import { DesempenoService } from './desempeno/desempeno.service';
import { DialogoEvaluacionCompetenciaComponent } from './desempeno/dialogos/dialogo-evaluacion-competencia.component';
import { DialogoEvaluacionDesempenoComponent } from './desempeno/dialogos/dialogo-evaluacion-desempeno.component';
import { DialogoPlanComponent } from './desempeno/dialogos/dialogo-plan.component';
import { DialogoBajaComponent } from './offboarding/dialogos/dialogo-baja.component';
import { OffboardingService } from './offboarding/offboarding.service';

interface Caso {
    nombre: string;
    componente: Type<any>;
    servicio: Type<any>;
    /** Lo que el diálogo llama al abrirse además de `colaboradores`. */
    extras: Record<string, unknown>;
    aviso: string;
}

const AVISO_GENERAL = 'No hay colaboradores disponibles. Dalos de alta en RRHH › Colaboradores.';

const CASOS: Caso[] = [
    { nombre: 'nueva acta', componente: DialogoActaComponent, servicio: ActasService, extras: {}, aviso: AVISO_GENERAL },
    {
        nombre: 'apertura de baja', componente: DialogoBajaComponent, servicio: OffboardingService, extras: { catalogos: { causas: [] } },
        aviso: 'No hay colaboradores activos. Solo se da de baja a quien ya está activo: actívalo en RRHH › Colaboradores.'
    },
    { nombre: 'evaluación de desempeño', componente: DialogoEvaluacionDesempenoComponent, servicio: DesempenoService, extras: {}, aviso: AVISO_GENERAL },
    { nombre: 'evaluación de competencia', componente: DialogoEvaluacionCompetenciaComponent, servicio: DesempenoService, extras: {}, aviso: AVISO_GENERAL },
    { nombre: 'plan de desarrollo', componente: DialogoPlanComponent, servicio: DesempenoService, extras: {}, aviso: AVISO_GENERAL }
];

const ANA = { colaboradorId: 3, codigo: 'JR-01', nombre: 'ANA RAMOS', puesto: 'Técnico', departamento: 'Operaciones' };

describe('Selector de colaborador de los módulos de RRHH', () => {
    function montar(caso: Caso, colaboradores: any) {
        const servicio = jasmine.createSpyObj('servicio', ['colaboradores', ...Object.keys(caso.extras)]);
        servicio.colaboradores.and.returnValue(colaboradores);
        for (const [metodo, valor] of Object.entries(caso.extras)) servicio[metodo].and.returnValue(of(valor));

        TestBed.configureTestingModule({
            imports: [caso.componente, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                { provide: caso.servicio, useValue: servicio },
                { provide: MatDialogRef, useValue: { close: () => undefined } },
                { provide: MAT_DIALOG_DATA, useValue: {} }
            ]
        });
        const f = TestBed.createComponent(caso.componente);
        f.detectChanges();
        return { f, texto: ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ') };
    }

    for (const caso of CASOS) {
        describe(caso.nombre, () => {
            it('si no hay colaboradores lo dice y explica dónde darlos de alta', () => {
                expect(montar(caso, of([])).texto).toContain(caso.aviso);
            });

            it('con colaboradores no muestra el aviso', () => {
                const { f, texto } = montar(caso, of([ANA]));
                expect(f.componentInstance.colaboradores.length).toBe(1);
                expect(texto).not.toContain('No hay colaboradores');
            });

            it('mientras carga no avisa que está vacío', () => {
                const { texto } = montar(caso, new Subject());
                expect(texto).not.toContain('No hay colaboradores');
            });
        });
    }

    it('si el API falla no dice que no hay colaboradores (ya se avisó del error)', () => {
        spyOn(window, 'alert');
        const { texto } = montar(CASOS[0], throwError(() => ({ status: 500 })));
        expect(window.alert).toHaveBeenCalledWith('No se pudo cargar la lista de colaboradores');
        expect(texto).not.toContain('No hay colaboradores');
    });
});
