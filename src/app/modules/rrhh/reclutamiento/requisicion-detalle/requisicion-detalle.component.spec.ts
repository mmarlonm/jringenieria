import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ChatIaService } from 'app/core/services/chat-ia.service';
import { ReclutamientoService } from '../reclutamiento.service';
import { Candidato, RequisicionDetalle } from '../reclutamiento.types';
import { RequisicionDetalleComponent } from './requisicion-detalle.component';

function candidato(parcial: Partial<Candidato>): Candidato {
    return {
        candidatoId: 1,
        requisicionId: 10,
        requisicionFolio: 'REQ-1',
        requisicionPuesto: 'Ingeniero',
        nombre: 'Ana',
        fuente: 'Web',
        avisoPrivacidadAceptado: true,
        fechaPrimerContacto: '2026-11-01',
        estatus: 'Nuevo',
        calificacionIncompleta: false,
        creadoEn: '2026-11-01',
        entrevistas: [],
        evaluaciones: [],
        ...parcial
    };
}

const VACANTE: RequisicionDetalle = {
    requisicionId: 10,
    folio: 'REQ-1',
    areaOSolicitante: 'Ingeniería',
    puesto: 'Ingeniero de software',
    tipo: 'NuevaCreacion',
    fechaSolicitud: '2026-10-01',
    estatus: 'Publicada',
    diasEnProceso: 20,
    numeroPlazas: 2,
    plazasCubiertas: 0,
    razonSocial: 'JR',
    validacionRrhh: true,
    aprobacionAdminGeneral: true,
    aprobacionDireccion: true,
    totalCandidatos: 3,
    perfilRequerido: 'C# y .NET',
    creadoEn: '2026-10-01',
    candidatos: [
        candidato({ candidatoId: 1, nombre: 'Alta Afinidad', consentimientoIa: true, puntajeIa: 4.8, calificacionGeneral: 4.5 }),
        candidato({ candidatoId: 2, nombre: 'Baja Afinidad', consentimientoIa: true, puntajeIa: 2.0, calificacionGeneral: 3.0 }),
        candidato({ candidatoId: 3, nombre: 'Sin Analizar', consentimientoIa: false, puntajeIa: null })
    ]
};

describe('RequisicionDetalleComponent', () => {
    let fixture: ComponentFixture<RequisicionDetalleComponent>;
    let componente: RequisicionDetalleComponent;
    let servicio: jasmine.SpyObj<ReclutamientoService>;
    let chat: jasmine.SpyObj<ChatIaService>;

    beforeEach(async () => {
        servicio = jasmine.createSpyObj<ReclutamientoService>('ReclutamientoService', ['obtenerRequisicion', 'analizarRequisicionIa']);
        servicio.obtenerRequisicion.and.returnValue(of(VACANTE));
        chat = jasmine.createSpyObj<ChatIaService>('ChatIaService', ['setContext', 'clearContext']);

        await TestBed.configureTestingModule({
            imports: [RequisicionDetalleComponent, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: ReclutamientoService, useValue: servicio },
                { provide: ChatIaService, useValue: chat },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RequisicionDetalleComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
    });

    function filas(): string[] {
        const trs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'));
        return trs.map((tr) => (tr.textContent ?? '').replace(/\s+/g, ' ').trim());
    }

    it('al cargar la vacante entrega al chat solo candidatos con consentimiento de IA', () => {
        expect(chat.setContext).toHaveBeenCalledTimes(1);
        const [modulo, datos] = chat.setContext.calls.mostRecent().args as [string, any];
        expect(modulo).toContain('REQ-1');
        expect(datos.totalCandidatos).toBe(3);
        expect(datos.candidatosNoCompartidosConIa).toBe(1);
        expect(JSON.stringify(datos)).not.toContain('Sin Analizar');
    });

    it('al salir de la pantalla limpia el contexto del chat', () => {
        fixture.destroy();
        expect(chat.clearContext).toHaveBeenCalled();
    });

    it('muestra todos los candidatos por defecto en el orden del ranking', () => {
        const f = filas();
        expect(f.length).toBe(3);
        expect(f[0]).toContain('Alta Afinidad');
        expect(f[2]).toContain('Sin Analizar');
    });

    it('el filtro de sugeridos solo muestra a quien alcanza el umbral y conserva su posición', () => {
        componente.filtroIa = 'sugeridos';
        fixture.detectChanges();

        const f = filas();
        expect(f.length).toBe(1);
        expect(f[0]).toContain('Alta Afinidad');
        expect(componente.posicionRanking(VACANTE.candidatos[0])).toBe(1);
    });

    it('el filtro sin analizar conserva la posición real del ranking', () => {
        componente.filtroIa = 'sinAnalizar';
        fixture.detectChanges();

        const f = filas();
        expect(f.length).toBe(1);
        expect(f[0]).toContain('Sin Analizar');
        expect(componente.posicionRanking(VACANTE.candidatos[2])).toBe(3);
    });

    it('al analizar elegibles muestra los totales y el motivo de cada omitido', () => {
        servicio.analizarRequisicionIa.and.returnValue(of({
            requisicionId: 10,
            totalCandidatos: 3,
            totalAnalizados: 2,
            totalOmitidos: 1,
            omitidos: [{ candidatoId: 3, nombre: 'Sin Analizar', motivo: 'Se requiere consentimiento para análisis automatizado' }],
            resultados: []
        }));
        const alerta = spyOn(window, 'alert');

        componente.analizarElegiblesIa();

        const mensaje = alerta.calls.mostRecent().args[0] as string;
        expect(mensaje).toContain('Analizados exitosamente: 2');
        expect(mensaje).toContain('Candidatos omitidos: 1');
        expect(mensaje).toContain('Sin Analizar: Se requiere consentimiento para análisis automatizado');
        expect(servicio.obtenerRequisicion).toHaveBeenCalledTimes(2);
    });
});
