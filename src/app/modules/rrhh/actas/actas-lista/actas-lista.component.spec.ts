import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { ActasService } from '../actas.service';
import { ActaResumen } from '../actas.types';
import { ActasListaComponent } from './actas-lista.component';

function resumen(parcial: Partial<ActaResumen>): ActaResumen {
    return {
        actaId: 1,
        folio: 'ACTA-2026-0001',
        colaboradorId: 3,
        colaboradorNombre: 'ANA RAMOS',
        puestoArea: 'Técnico / Operaciones',
        fechaHechos: '2026-11-03T09:00:00',
        fechaConocimiento: '2026-11-03T00:00:00',
        tipoFalta: 'Art. 47 fr. X',
        gravedad: 'Grave',
        estatus: 'Borrador',
        alertaNivel: 'EnPlazo',
        diasRestantes: 25,
        diasTranscurridos: 5,
        validacion: 'Ok',
        creadoEn: '2026-11-03T10:00:00',
        ...parcial
    };
}

describe('ActasListaComponent', () => {
    let servicio: jasmine.SpyObj<ActasService>;

    async function montar(permisosDelUsuario: string[], actas: ActaResumen[], alertas: ActaResumen[] = []): Promise<ComponentFixture<ActasListaComponent>> {
        servicio = jasmine.createSpyObj<ActasService>('ActasService', ['listar', 'alertas']);
        servicio.listar.and.returnValue(of(actas));
        servicio.alertas.and.returnValue(of(alertas));

        await TestBed.configureTestingModule({
            imports: [ActasListaComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: ActasService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => permisosDelUsuario.includes(c) } }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(ActasListaComponent);
        fixture.detectChanges();
        return fixture;
    }

    function texto(fixture: ComponentFixture<ActasListaComponent>): string {
        return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    }

    it('quien no tiene permisos de consulta ve el aviso de "las que tú iniciaste" y no pide las alertas', async () => {
        const f = await montar([], [resumen({})]);

        expect(texto(f)).toContain('las actas que tú iniciaste');
        expect(servicio.alertas).not.toHaveBeenCalled();
        expect(texto(f)).toContain('ANA RAMOS');
    });

    it('quien puede consultar todas pide las alertas y muestra las actas por cerrar', async () => {
        const porCerrar = resumen({ actaId: 2, folio: 'ACTA-2026-0002', colaboradorNombre: 'LUIS PEREZ', alertaNivel: 'Cerrar', diasRestantes: 4, diasTranscurridos: 26 });
        const f = await montar(['rrhh.actas.consultar'], [resumen({}), porCerrar], [porCerrar]);

        expect(servicio.alertas).toHaveBeenCalled();
        const t = texto(f);
        expect(t).toContain('1 acta con el plazo de 30 días por cerrar');
        expect(t).toContain('Cerrar: quedan 4 días');
        expect(t).not.toContain('las actas que tú iniciaste');
    });

    it('el gestor también ve todas y las alertas', async () => {
        await montar(['rrhh.actas.gestionar'], []);
        expect(servicio.alertas).toHaveBeenCalled();
    });

    it('muestra la validación pendiente de un acta', async () => {
        const f = await montar([], [resumen({ validacion: 'FaltanTestigos', estatus: 'Citado' })]);
        expect(texto(f)).toContain('Faltan testigos');
    });

    it('al cambiar el estatus vuelve a pedir la lista filtrada', async () => {
        const f = await montar([], []);
        servicio.listar.calls.reset();

        f.componentInstance.filtroEstatus = 'Citado';
        f.componentInstance.cargar();

        expect(servicio.listar).toHaveBeenCalledWith(jasmine.objectContaining({ estatus: 'Citado' }));
    });

    it('sin actas muestra el mensaje vacío', async () => {
        const f = await montar([], []);
        expect(texto(f)).toContain('No hay actas que mostrar');
    });
});
