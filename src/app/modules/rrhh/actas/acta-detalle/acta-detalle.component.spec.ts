import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { ActasService } from '../actas.service';
import { ActaDetalle } from '../actas.types';
import { ActaDetalleComponent } from './acta-detalle.component';

function acta(parcial: Partial<ActaDetalle> = {}): ActaDetalle {
    return {
        actaId: 7,
        folio: 'ACTA-2026-0007',
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
        lugar: 'Obra Puebla',
        narracion: 'No se presentó a laborar.',
        testigo1: 'Luis',
        testigo2: 'Marta',
        creadoPorUsuarioId: 5,
        editable: true,
        ...parcial
    };
}

describe('ActaDetalleComponent', () => {
    let servicio: jasmine.SpyObj<ActasService>;
    let permisos: { tiene: jasmine.Spy };

    async function montar(a: ActaDetalle, gestor: boolean): Promise<ComponentFixture<ActaDetalleComponent>> {
        servicio = jasmine.createSpyObj<ActasService>('ActasService', ['obtener', 'cerrar']);
        servicio.obtener.and.returnValue(of(a));
        permisos = { tiene: jasmine.createSpy('tiene').and.callFake((c: string) => gestor && c === 'rrhh.actas.gestionar') };

        await TestBed.configureTestingModule({
            imports: [ActaDetalleComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: ActasService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: permisos },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(ActaDetalleComponent);
        fixture.detectChanges();
        return fixture;
    }

    function botones(fixture: ComponentFixture<ActaDetalleComponent>): string[] {
        const nodos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
        return nodos.map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0);
    }

    function texto(fixture: ComponentFixture<ActaDetalleComponent>): string {
        return ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
    }

    it('muestra el folio, el colaborador y la narración', async () => {
        const f = await montar(acta(), true);
        expect(servicio.obtener).toHaveBeenCalledWith(7);
        expect(texto(f)).toContain('ACTA-2026-0007');
        expect(texto(f)).toContain('ANA RAMOS');
        expect(texto(f)).toContain('No se presentó a laborar.');
    });

    it('el gestor con el acta en borrador puede editar, citar y anular', async () => {
        const f = await montar(acta(), true);
        expect(botones(f)).toEqual(['Editar hechos', 'Citar al colaborador', 'Anular']);
    });

    it('quien no es gestor solo puede editar su borrador', async () => {
        const f = await montar(acta(), false);
        expect(botones(f)).toEqual(['Editar hechos']);
    });

    it('quien no es gestor no ve acciones cuando el acta ya fue citada', async () => {
        const f = await montar(acta({ estatus: 'Citado', editable: true }), false);
        expect(botones(f)).toEqual([]);
    });

    it('con la audiencia realizada el gestor solo puede sancionar o anular', async () => {
        const f = await montar(acta({ estatus: 'AudienciaRealizada', editable: false }), true);
        expect(botones(f)).toEqual(['Aplicar sanción', 'Anular']);
    });

    it('un acta cerrada no ofrece acciones ni siquiera al gestor', async () => {
        const f = await montar(acta({ estatus: 'Cerrada', editable: false, alertaNivel: 'Ninguna', diasTranscurridos: null }), true);
        expect(botones(f)).toEqual([]);
    });

    it('muestra la alerta de cierre con los días que quedan', async () => {
        const f = await montar(acta({ alertaNivel: 'Cerrar', diasRestantes: 8, diasTranscurridos: 22 }), true);
        expect(texto(f)).toContain('Cerrar: quedan 8 días');
    });

    it('un acta anulada muestra el motivo y no ofrece acciones', async () => {
        const f = await montar(acta({ estatus: 'Anulada', editable: false, motivoAnulacion: 'Colaborador equivocado' }), true);
        expect(texto(f)).toContain('Acta anulada');
        expect(texto(f)).toContain('Colaborador equivocado');
        expect(botones(f)).toEqual([]);
    });

    it('avisa cuando faltan testigos', async () => {
        const f = await montar(acta({ estatus: 'Citado', validacion: 'FaltanTestigos' }), true);
        expect(texto(f)).toContain('Faltan testigos');
    });

    it('al cerrar, confirma y actualiza el acta con la respuesta del API', async () => {
        const f = await montar(acta({ estatus: 'SancionAplicada', editable: false }), true);
        servicio.cerrar.and.returnValue(of(acta({ estatus: 'Cerrada', editable: false, alertaNivel: 'Ninguna', diasTranscurridos: null })));
        spyOn(window, 'confirm').and.returnValue(true);

        f.componentInstance.ejecutar('cerrar');
        f.detectChanges();

        expect(servicio.cerrar).toHaveBeenCalledWith(7);
        expect(texto(f)).toContain('Cerrada');
        expect(botones(f)).toEqual([]);
    });

    it('si no se confirma el cierre no llama al API', async () => {
        const f = await montar(acta({ estatus: 'SancionAplicada', editable: false }), true);
        spyOn(window, 'confirm').and.returnValue(false);

        f.componentInstance.ejecutar('cerrar');

        expect(servicio.cerrar).not.toHaveBeenCalled();
    });
});
