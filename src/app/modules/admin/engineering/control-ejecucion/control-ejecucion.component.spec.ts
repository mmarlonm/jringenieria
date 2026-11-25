import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { of } from 'rxjs';
import { ControlEjecucionComponent } from './control-ejecucion.component';
import { EngineeringService, SeguimientoEjecucion } from '../engineering.service';

describe('ControlEjecucionComponent', () => {
    let component: ControlEjecucionComponent;
    let fixture: ComponentFixture<ControlEjecucionComponent>;
    let engineeringServiceMock: jasmine.SpyObj<EngineeringService>;
    let dialogMock: jasmine.SpyObj<MatDialog>;
    let routerMock: jasmine.SpyObj<Router>;

    const mockProyectos: SeguimientoEjecucion[] = [
        {
            idEjecucion: 1,
            idSeguimiento: 10,
            actividad: 'Instalación de transformador',
            tituloProyecto: 'Subestación Norte',
            nombreSolicitante: 'Juan Pérez',
            empresa: 'CFE',
            tipo: 'PROYECTO',
            estatusAst: 1,
            estatusProgramaGantt: 1,
            estatusImssSua: 1,
            estatusAdquisicionMateriales: 1,
            estatusConstruccionEntrega: 1,
            estatusReporte: 1,
            enCambioIngenieria: true,
            cambioIngenieriaDesde: '2026-11-25T17:30:00Z',
            cambioIngenieriaMotivo: 'Modificación de ruta eléctrica'
        }
    ];

    beforeEach(async () => {
        engineeringServiceMock = jasmine.createSpyObj('EngineeringService', ['getSeguimientosEjecucion']);
        dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        engineeringServiceMock.getSeguimientosEjecucion.and.returnValue(of(mockProyectos));

        await TestBed.configureTestingModule({
            imports: [ControlEjecucionComponent, NoopAnimationsModule],
            providers: [
                { provide: EngineeringService, useValue: engineeringServiceMock },
                { provide: MatDialog, useValue: dialogMock },
                { provide: Router, useValue: routerMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ControlEjecucionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('Seguimiento_muestra_chip_Cambio_en_Ingenieria', () => {
        const chipDe = fixture.debugElement.query(By.css('[data-testid="chip-cambio-ingenieria"]'));
        expect(chipDe).not.toBeNull();
        const chipEl = chipDe.nativeElement as HTMLElement;
        expect(chipEl.textContent?.trim()).toBe('Cambio en Ingeniería');

        const tooltipDir = chipDe.injector.get(MatTooltip);
        expect(tooltipDir).toBeDefined();
        // 17:30 UTC -> 11:30 America/Mexico_City
        expect(tooltipDir.message).toContain('11:30');
        expect(tooltipDir.message).toContain('Modificación de ruta eléctrica');
    });
});
