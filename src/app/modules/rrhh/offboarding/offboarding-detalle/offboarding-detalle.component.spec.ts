import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { OffboardingService } from '../offboarding.service';
import { OffboardingDetalle, TareaOffboarding } from '../offboarding.types';
import { OffboardingDetalleComponent } from './offboarding-detalle.component';

function tarea(parcial: Partial<TareaOffboarding>): TareaOffboarding {
    return {
        tareaId: 1,
        orden: 1,
        clave: 'X',
        plazo: 'Día 1',
        tarea: 'Tarea de prueba',
        responsable: 'RRHH',
        evidencia: 'Registro',
        estatus: 'Pendiente',
        vencida: false,
        ...parcial
    };
}

function baja(parcial: Partial<OffboardingDetalle> = {}): OffboardingDetalle {
    return {
        bajaId: 4,
        folio: 'BAJA-2026-0004',
        colaboradorId: 3,
        colaboradorNombre: 'ANA RAMOS',
        puestoArea: 'Técnico / Operaciones',
        causa: 'RenunciaConAviso',
        ruta: 1,
        rutaNombre: 'Renuncia con aviso',
        fechaApertura: '2026-11-02T00:00:00',
        ultimoDiaLaborado: '2026-11-06T00:00:00',
        estatus: 'Abierto',
        tareasTotal: 3,
        tareasResueltas: 1,
        tareasVencidas: 0,
        limiteBajaImss: '2026-11-13T00:00:00',
        alertaBajaImss: 'EnTiempo',
        autorizadaDireccion: false,
        documento: 'Carta de renuncia escrita y firmada por el colaborador',
        conceptosPago: 'Salario devengado, vacaciones pendientes y proporcionales',
        controles: 'Sin tareas que condicionen la salida',
        requiereValidacionLegal: false,
        requiereAutorizacionDireccion: false,
        tareas: [
            tarea({ tareaId: 1, orden: 1, tarea: 'Registrar causa de baja', responsable: 'RRHH', estatus: 'Hecha' }),
            tarea({ tareaId: 2, orden: 2, tarea: 'Revocar privilegios de administrador', responsable: 'TI', estatus: 'Pendiente' }),
            tarea({ tareaId: 3, orden: 3, tarea: 'Notificación interna', responsable: 'RRHH', estatus: 'Pendiente' })
        ],
        ...parcial
    };
}

describe('OffboardingDetalleComponent', () => {
    let servicio: jasmine.SpyObj<OffboardingService>;

    async function montar(b: OffboardingDetalle, permisos: string[] = []): Promise<ComponentFixture<OffboardingDetalleComponent>> {
        servicio = jasmine.createSpyObj<OffboardingService>('OffboardingService', ['obtener', 'autorizar']);
        servicio.obtener.and.returnValue(of(b));

        await TestBed.configureTestingModule({
            imports: [OffboardingDetalleComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: OffboardingService, useValue: servicio },
                { provide: PermisosEspecialesService, useValue: { tiene: (c: string) => permisos.includes(c) } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '4' }) } } }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(OffboardingDetalleComponent);
        fixture.detectChanges();
        return fixture;
    }

    const texto = (f: ComponentFixture<OffboardingDetalleComponent>) =>
        ((f.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    function botones(f: ComponentFixture<OffboardingDetalleComponent>): string[] {
        return Array.from((f.nativeElement as HTMLElement).querySelectorAll('button'))
            .map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim())
            .filter((t) => t.length > 0);
    }

    it('muestra el folio, el colaborador, la ruta y el documento que la sustenta', async () => {
        const f = await montar(baja());
        expect(servicio.obtener).toHaveBeenCalledWith(4);
        const t = texto(f);
        expect(t).toContain('BAJA-2026-0004');
        expect(t).toContain('ANA RAMOS');
        expect(t).toContain('Ruta 1: Renuncia con aviso');
        expect(t).toContain('Carta de renuncia escrita y firmada');
    });

    it('agrupa el checklist por responsable y cuenta lo que falta de cada uno', async () => {
        const f = await montar(baja());
        const t = texto(f);
        expect(t).toContain('Checklist por responsable');
        expect(t).toContain('RRHH');
        expect(t).toContain('TI');
        expect(t).toContain('1 por resolver'); // RRHH: 1 hecha y 1 pendiente
        expect(f.componentInstance.grupos.map((g) => g.responsable)).toEqual(['RRHH', 'TI']);
    });

    it('un caso abierto de renuncia ofrece editar, registrar la baja y cancelar', async () => {
        const f = await montar(baja());
        const b = botones(f);
        expect(b).toContain('Editar');
        expect(b).toContain('Registrar baja');
        expect(b).toContain('Cancelar caso');
        expect(b).not.toContain('Autorizar (Dirección)');
    });

    it('en el despido injustificado solo ve "Autorizar" quien tiene el permiso', async () => {
        const caso = baja({ ruta: 4, causa: 'DespidoInjustificadoConvenio', rutaNombre: 'Despido injustificado o convenio', requiereAutorizacionDireccion: true, requiereValidacionLegal: true });

        const conPermiso = await montar(caso, ['rrhh.offboarding.autorizar']);
        expect(botones(conPermiso)).toContain('Autorizar (Dirección)');
        TestBed.resetTestingModule();

        const sinPermiso = await montar(caso, []);
        expect(botones(sinPermiso)).not.toContain('Autorizar (Dirección)');
    });

    it('al autorizar confirma, llama al API y muestra la autorización', async () => {
        const caso = baja({ ruta: 4, requiereAutorizacionDireccion: true });
        const f = await montar(caso, ['rrhh.offboarding.autorizar']);
        servicio.autorizar.and.returnValue(of({ ...caso, autorizadaDireccion: true, fechaAutorizacion: '2026-11-06T00:00:00' }));
        spyOn(window, 'confirm').and.returnValue(true);

        f.componentInstance.ejecutar('autorizar');
        f.detectChanges();

        expect(servicio.autorizar).toHaveBeenCalledWith(4);
        expect(texto(f)).toContain('Autorizada el 06/11/2026');
        expect(botones(f)).not.toContain('Autorizar (Dirección)');
    });

    it('muestra qué falta para poder registrar la baja', async () => {
        const f = await montar(baja({ ruta: 5, requiereValidacionLegal: true, motivoBloqueoBaja: 'Legal debe validar la causa y el documento antes de registrar la baja.' }));
        expect(texto(f)).toContain('Para registrar la baja falta: Legal debe validar la causa');
    });

    it('las tareas vencidas se avisan pero se aclara que no detienen la baja', async () => {
        const f = await montar(baja({ tareasVencidas: 2 }));
        const t = texto(f);
        expect(t).toContain('2 tareas vencidas');
        expect(t).toContain('no detiene la baja');
    });

    it('con la baja registrada solo se puede cerrar, y las tareas siguen siendo actualizables', async () => {
        const f = await montar(baja({ estatus: 'BajaRegistrada', fechaBajaImss: '2026-11-06T00:00:00', alertaBajaImss: 'Registrada' }));
        const b = botones(f);
        expect(b).toContain('Cerrar caso');
        expect(b).not.toContain('Registrar baja');
        expect(b.filter((x) => x === 'Actualizar').length).toBe(3);
    });

    it('un caso cerrado no ofrece acciones ni actualizar tareas', async () => {
        const f = await montar(baja({ estatus: 'Cerrado', recontratable: 'CON_RESERVAS', fechaRetencionHasta: '2031-11-06T00:00:00' }));
        expect(botones(f)).toEqual([]);
        const t = texto(f);
        expect(t).toContain('Con reservas');
        expect(t).toContain('06/11/2031');
    });

    it('un caso cancelado muestra el motivo', async () => {
        const f = await montar(baja({ estatus: 'Cancelado', motivoCancelacion: 'Retiró su renuncia' }));
        expect(texto(f)).toContain('Caso cancelado');
        expect(texto(f)).toContain('Retiró su renuncia');
        expect(botones(f)).toEqual([]);
    });

    it('en el despido justificado muestra el acta y el límite para el Tribunal', async () => {
        const f = await montar(baja({
            ruta: 3, causa: 'DespidoJustificado', actaId: 9, actaFolio: 'ACTA-2026-0009',
            fechaAvisoRescision: '2026-11-06T00:00:00', limiteNotificacionTribunal: '2026-11-13T00:00:00'
        }));
        const t = texto(f);
        expect(t).toContain('ACTA-2026-0009');
        expect(t).toContain('Tribunal, a más tardar: 13/11/2026');
    });
});
