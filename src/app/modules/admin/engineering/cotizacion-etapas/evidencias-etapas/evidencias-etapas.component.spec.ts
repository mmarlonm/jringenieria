import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { CotizacionEtapasArchivoCasoDto } from '../cotizacion-etapas.models';
import { EvidenciasEtapasComponent } from './evidencias-etapas.component';

describe('EvidenciasEtapasComponent', () => {
    let fixture: ComponentFixture<EvidenciasEtapasComponent>;
    let component: EvidenciasEtapasComponent;
    let serviceMock: jasmine.SpyObj<CotizacionEtapasService>;
    let dialogMock: jasmine.SpyObj<MatDialog>;

    const archivos: CotizacionEtapasArchivoCasoDto[] = [
        { etapa: 1, revision: 1, nombreArchivo: 'solicitud.pdf' },
        { etapa: 3, revision: 1, nombreArchivo: 'erp.pptx' },
        { etapa: 3, revision: 2, nombreArchivo: 'erp_v2.pptx' },
        { etapa: 4, revision: 1, nombreArchivo: 'foto.png' }
    ];

    function crear(lista: CotizacionEtapasArchivoCasoDto[] = archivos): void {
        serviceMock.archivosDelCaso.and.returnValue(of(lista));
        fixture = TestBed.createComponent(EvidenciasEtapasComponent);
        component = fixture.componentInstance;
        component.idSeguimiento = 85;
        fixture.detectChanges();
    }

    const html = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
        serviceMock = jasmine.createSpyObj('CotizacionEtapasService', ['archivosDelCaso', 'descargarArchivo']);
        dialogMock = jasmine.createSpyObj('MatDialog', ['open']);

        TestBed.configureTestingModule({
            imports: [EvidenciasEtapasComponent, NoopAnimationsModule],
            providers: [
                { provide: CotizacionEtapasService, useValue: serviceMock },
                { provide: MatDialog, useValue: dialogMock }
            ]
        });
    });

    it('pide los archivos del caso y los agrupa por etapa con el nombre de la etapa', () => {
        crear();

        expect(serviceMock.archivosDelCaso).toHaveBeenCalledOnceWith(85);
        expect(component.grupos.map((g) => g.etapa)).toEqual([1, 3, 4]);
        const texto = html().textContent || '';
        expect(texto).toContain('Solicitud del cliente');
        expect(texto).toContain('Diseño/Cálculo e Ingeniería');
        expect(texto).toContain('Presupuesto técnico');
        expect(texto).not.toContain('Levantamiento técnico'); // la etapa 2 no tiene archivos
        expect(texto).toContain('solicitud.pdf');
        expect(texto).toContain('erp_v2.pptx');
    });

    it('indica la revisión de cada archivo', () => {
        crear();

        const fila = html().querySelector('[data-archivo="erp_v2.pptx"]') as HTMLElement;
        expect(fila.textContent).toContain('R2');
    });

    it('sin archivos muestra que aún no hay evidencias', () => {
        crear([]);

        expect(component.grupos.length).toBe(0);
        expect(html().textContent).toContain('Aún no hay archivos');
    });

    it('«Ver» solo se ofrece para PDF e imágenes; descargar, para todos', () => {
        crear();

        const boton = (archivo: string, accion: string) =>
            html().querySelector(`[data-archivo="${archivo}"] button[aria-label="${accion}"]`);
        expect(boton('solicitud.pdf', 'Ver')).not.toBeNull();
        expect(boton('foto.png', 'Ver')).not.toBeNull();
        expect(boton('erp.pptx', 'Ver')).toBeNull();
        for (const a of archivos) expect(boton(a.nombreArchivo, 'Descargar')).withContext(a.nombreArchivo).not.toBeNull();
    });

    it('descargar pide el archivo de esa etapa y revisión', () => {
        crear();
        serviceMock.descargarArchivo.and.returnValue(of(new Blob(['x'])));
        spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
        spyOn(URL, 'revokeObjectURL');
        const clic = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();

        component.descargar(archivos[2]);

        expect(serviceMock.descargarArchivo).toHaveBeenCalledOnceWith(85, 3, 2, 'erp_v2.pptx');
        expect(clic).toHaveBeenCalledTimes(1);
    });

    it('ver abre el visor con el archivo y avisa si es PDF', () => {
        crear();
        serviceMock.descargarArchivo.and.returnValue(of(new Blob(['x'])));
        spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');

        component.ver(archivos[0]);

        expect(dialogMock.open).toHaveBeenCalledOnceWith(
            ImagePreviewDialogComponent,
            jasmine.objectContaining({ data: { url: 'blob:prueba', name: 'solicitud.pdf', isPdf: true } })
        );
    });

    it('si la API falla muestra el error y no rompe la pantalla', () => {
        serviceMock.archivosDelCaso.and.returnValue(throwError(() => ({ status: 500 })));
        fixture = TestBed.createComponent(EvidenciasEtapasComponent);
        component = fixture.componentInstance;
        component.idSeguimiento = 85;
        fixture.detectChanges();

        expect(component.error).toBeTrue();
        expect(html().textContent).toContain('No se pudieron cargar');
    });
});
