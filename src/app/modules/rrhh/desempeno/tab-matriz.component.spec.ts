import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { DesempenoService } from './desempeno.service';
import { MatrizCompetencia } from './desempeno.types';
import { TabMatrizComponent } from './tab-matriz.component';

const FILAS: MatrizCompetencia[] = [
    { matrizId: 1, puesto: 'Técnico electricista', competencia: 'NOM-029', nivelRequerido: 3, descripcion: 'Seguridad eléctrica' },
    { matrizId: 2, puesto: 'Almacenista', competencia: 'Inventarios', nivelRequerido: 2 },
    { matrizId: 3, puesto: 'Técnico electricista', competencia: 'Alturas', nivelRequerido: 4 }
];

describe('TabMatrizComponent', () => {
    let servicio: jasmine.SpyObj<DesempenoService>;

    async function montar(filas: MatrizCompetencia[], gestor: boolean): Promise<ComponentFixture<TabMatrizComponent>> {
        servicio = jasmine.createSpyObj<DesempenoService>('DesempenoService', ['listarMatriz', 'eliminarMatriz']);
        servicio.listarMatriz.and.returnValue(of(filas));

        await TestBed.configureTestingModule({
            imports: [TabMatrizComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                { provide: DesempenoService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => gestor && c === 'rrhh.desempeno.gestionar' } }
            ]
        }).compileComponents();

        const f = TestBed.createComponent(TabMatrizComponent);
        f.detectChanges();
        return f;
    }

    const texto = (f: ComponentFixture<TabMatrizComponent>) => ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    it('agrupa las competencias por puesto con su nivel requerido', async () => {
        const f = await montar(FILAS, true);
        const t = texto(f);
        expect(f.componentInstance.grupos.map((g) => g.puesto)).toEqual(['Almacenista', 'Técnico electricista']);
        expect(t).toContain('2 competencias');
        expect(t).toContain('1 competencia');
        expect(t).toContain('Nivel 4');
        expect(t).toContain('Seguridad eléctrica');
    });

    it('RRHH ve agregar, editar y eliminar', async () => {
        const f = await montar(FILAS, true);
        const root = f.nativeElement as HTMLElement;
        expect(texto(f)).toContain('Agregar competencia');
        expect(root.querySelectorAll('button[aria-label="Editar"]').length).toBe(3);
        expect(root.querySelectorAll('button[aria-label="Eliminar"]').length).toBe(3);
    });

    it('quien no es RRHH solo consulta la matriz', async () => {
        const f = await montar(FILAS, false);
        const root = f.nativeElement as HTMLElement;
        expect(texto(f)).toContain('Solo RRHH define la matriz de competencias');
        expect(texto(f)).not.toContain('Agregar competencia');
        expect(root.querySelectorAll('button[aria-label="Editar"]').length).toBe(0);
    });

    it('eliminar confirma, llama al API y recarga', async () => {
        const f = await montar(FILAS, true);
        servicio.eliminarMatriz.and.returnValue(of(undefined));
        spyOn(window, 'confirm').and.returnValue(true);
        servicio.listarMatriz.calls.reset();

        f.componentInstance.eliminar(FILAS[0]);

        expect(servicio.eliminarMatriz).toHaveBeenCalledWith(1);
        expect(servicio.listarMatriz).toHaveBeenCalled();
    });

    it('sin filas muestra el mensaje vacío', async () => {
        const f = await montar([], true);
        expect(texto(f)).toContain('La matriz de competencias está vacía');
    });
});
