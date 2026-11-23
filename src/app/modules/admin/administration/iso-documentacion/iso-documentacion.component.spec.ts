import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { IsoDocumentacionComponent } from './iso-documentacion.component';
import { IsoDocumentacionService, IsoApartado, IsoSubcarpeta, IsoArchivo } from './iso-documentacion.service';

describe('IsoDocumentacionComponent - Buscador General', () => {
    let fixture: ComponentFixture<IsoDocumentacionComponent>;
    let component: IsoDocumentacionComponent;
    let isoServiceMock: jasmine.SpyObj<IsoDocumentacionService>;
    let snackBarMock: jasmine.SpyObj<MatSnackBar>;
    let dialogMock: jasmine.SpyObj<MatDialog>;

    const mockApartados: IsoApartado[] = [
        { nombre: '04_contexto', label: '04. Contexto de la Organización', icon: 'heroicons_outline:building-office' },
        { nombre: '05_liderazgo', label: '05. Liderazgo y Política de Calidad', icon: 'heroicons_outline:user-group' },
        { nombre: '09_auditorias', label: '09. Evaluación y Auditorías', icon: 'heroicons_outline:clipboard-document-check' }
    ];

    const mockSubcarpetas: IsoSubcarpeta[] = [
        { tipo: '09_auditorias', nombreSubcarpeta: '2026' },
        { tipo: '09_auditorias', nombreSubcarpeta: '2026/Internas' },
        { tipo: '05_liderazgo', nombreSubcarpeta: 'Politicas' }
    ];

    const mockArchivos: IsoArchivo[] = [
        {
            tipo: '04_contexto',
            nombreArchivo: 'matriz_riesgos_2026.pdf',
            tamanoBytes: 102400,
            fechaModificacion: '2026-01-15T10:00:00Z'
        },
        {
            tipo: '04_contexto',
            nombreArchivo: 'alcance_sgc.docx',
            tamanoBytes: 51200,
            fechaModificacion: '2026-01-16T10:00:00Z'
        },
        {
            tipo: '05_liderazgo',
            nombreArchivo: 'Politicas/politica_calidad_firmada.pdf',
            tamanoBytes: 204800,
            fechaModificacion: '2026-02-01T10:00:00Z'
        },
        {
            tipo: '09_auditorias',
            nombreArchivo: '2026/Internas/informe_auditoria_interna.pdf',
            tamanoBytes: 409600,
            fechaModificacion: '2026-03-01T10:00:00Z'
        },
        {
            tipo: '09_auditorias',
            nombreArchivo: 'plan_anual_auditorias.xlsx',
            tamanoBytes: 81920,
            fechaModificacion: '2026-03-05T10:00:00Z'
        }
    ];

    beforeEach(async () => {
        isoServiceMock = jasmine.createSpyObj('IsoDocumentacionService', [
            'obtenerArchivos',
            'crearApartado',
            'crearSubcarpeta',
            'descargarArchivo',
            'eliminar',
            'getToken',
            'renombrar',
            'renombrarCarpeta',
            'subirArchivosConProgreso',
            'obtenerBitacora'
        ]);

        isoServiceMock.obtenerArchivos.and.returnValue(of({
            apartados: mockApartados,
            subcarpetas: mockSubcarpetas,
            archivos: mockArchivos
        }));
        isoServiceMock.obtenerBitacora.and.returnValue(of([]));

        snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);
        dialogMock = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                IsoDocumentacionComponent,
                NoopAnimationsModule,
                MatIconTestingModule
            ],
            providers: [
                { provide: IsoDocumentacionService, useValue: isoServiceMock },
                { provide: MatSnackBar, useValue: snackBarMock },
                { provide: MatDialog, useValue: dialogMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(IsoDocumentacionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('debe crearse correctamente e inicializar la lista de apartados y archivos', () => {
        expect(component).toBeTruthy();
        expect(component.apartados.length).toBe(3);
        expect(component.archivos.length).toBe(5);
        expect(component.busquedaGeneralActiva).toBeFalse();
        expect(component.apartadosFiltrados.length).toBe(3);
    });

    describe('normalizar', () => {
        it('debe remover acentos y convertir a minúsculas', () => {
            expect(component.normalizar('Auditoría')).toBe('auditoria');
            expect(component.normalizar('POLÍTICA DE CALIDAD')).toBe('politica de calidad');
            expect(component.normalizar('Organización')).toBe('organizacion');
            expect(component.normalizar('  ÁéÍóÚ  ')).toBe('aeiou');
        });

        it('debe manejar nulos, indefinidos y cadenas vacías', () => {
            expect(component.normalizar(null)).toBe('');
            expect(component.normalizar(undefined)).toBe('');
            expect(component.normalizar('')).toBe('');
        });
    });

    describe('getFileNameOnly y getFileFolderPath', () => {
        it('debe extraer el nombre base de archivos en raíz y en subcarpetas', () => {
            expect(component.getFileNameOnly('matriz.pdf')).toBe('matriz.pdf');
            expect(component.getFileNameOnly('2026/Internas/informe.pdf')).toBe('informe.pdf');
            expect(component.getFileNameOnly(undefined)).toBe('');
        });

        it('debe extraer la ruta de carpetas de archivos anidados', () => {
            expect(component.getFileFolderPath('2026/Internas/informe.pdf')).toBe('2026/Internas');
            expect(component.getFileFolderPath('Politicas/doc.docx')).toBe('Politicas');
            expect(component.getFileFolderPath('archivo_raiz.pdf')).toBe('');
            expect(component.getFileFolderPath(undefined)).toBe('');
        });
    });

    describe('Búsqueda General', () => {
        it('debe activar busquedaGeneralActiva cuando se escribe un término no vacío', () => {
            expect(component.busquedaGeneralActiva).toBeFalse();

            component.busquedaGeneral = 'auditoria';
            expect(component.busquedaGeneralActiva).toBeTrue();

            component.busquedaGeneral = '   ';
            expect(component.busquedaGeneralActiva).toBeFalse();
        });

        it('debe encontrar archivos anidados y en raíz que coincidan sin importar acentos ni mayúsculas', () => {
            // "auditoría" con acento debe coincidir con informe_auditoria_interna.pdf y plan_anual_auditorias.xlsx
            component.busquedaGeneral = 'auditoría';
            component.onBusquedaGeneralChange();

            expect(component.busquedaGeneralActiva).toBeTrue();
            // Apartado de auditorías debe estar presente
            const auditoriasCat = component.apartadosFiltrados.find(c => c.nombre === '09_auditorias');
            expect(auditoriasCat).toBeDefined();

            const archivosAuditorias = component.getFilesByCategory('09_auditorias');
            expect(archivosAuditorias.length).toBe(2);

            const nombres = archivosAuditorias.map(a => a.nombreArchivo);
            expect(nombres).toContain('2026/Internas/informe_auditoria_interna.pdf');
            expect(nombres).toContain('plan_anual_auditorias.xlsx');
        });

        it('debe filtrar archivos de subcarpetas cuando se busca "politica"', () => {
            // "politica" sin acento debe coincidir con Politicas/politica_calidad_firmada.pdf
            component.busquedaGeneral = 'politica';
            component.onBusquedaGeneralChange();

            const liderazgoCat = component.apartadosFiltrados.find(c => c.nombre === '05_liderazgo');
            expect(liderazgoCat).toBeDefined();

            const archivosLiderazgo = component.getFilesByCategory('05_liderazgo');
            expect(archivosLiderazgo.length).toBe(1);
            expect(archivosLiderazgo[0].nombreArchivo).toBe('Politicas/politica_calidad_firmada.pdf');
        });

        it('debe coincidir por nombre de apartado si el usuario busca una categoría', () => {
            component.busquedaGeneral = 'contexto';
            component.onBusquedaGeneralChange();

            expect(component.apartadosFiltrados.length).toBe(1);
            expect(component.apartadosFiltrados[0].nombre).toBe('04_contexto');

            const archivosContexto = component.getFilesByCategory('04_contexto');
            expect(archivosContexto.length).toBe(2);
        });

        it('debe calcular correctamente totalArchivosEncontrados y totalApartadosConCoincidencias', () => {
            component.busquedaGeneral = 'pdf';
            component.onBusquedaGeneralChange();

            // Existen 3 PDFs en total en el mock (matriz_riesgos_2026.pdf, politica_calidad_firmada.pdf, informe_auditoria_interna.pdf)
            expect(component.totalArchivosEncontrados).toBe(3);
            expect(component.totalApartadosConCoincidencias).toBe(3);
        });

        it('debe retornar lista vacía en apartadosFiltrados si nada coincide', () => {
            component.busquedaGeneral = 'termino_inexistente_xyz_123';
            component.onBusquedaGeneralChange();

            expect(component.apartadosFiltrados.length).toBe(0);
            expect(component.totalArchivosEncontrados).toBe(0);
            expect(component.totalApartadosConCoincidencias).toBe(0);
        });

        it('limpiarBusquedaGeneral debe restablecer el estado original', () => {
            component.busquedaGeneral = 'auditoria';
            component.onBusquedaGeneralChange();
            expect(component.busquedaGeneralActiva).toBeTrue();

            component.limpiarBusquedaGeneral();
            expect(component.busquedaGeneral).toBe('');
            expect(component.busquedaGeneralActiva).toBeFalse();
            expect(component.apartadosFiltrados.length).toBe(3);
            expect(component.totalArchivosEncontrados).toBe(0);
        });

        it('navegarSubcarpeta debe limpiar busquedaGeneral y establecer la carpeta activa', () => {
            component.busquedaGeneral = 'auditoria';
            component.onBusquedaGeneralChange();
            expect(component.busquedaGeneralActiva).toBeTrue();

            component.navegarSubcarpeta('09_auditorias', '2026/Internas');

            expect(component.busquedaGeneral).toBe('');
            expect(component.busquedaGeneralActiva).toBeFalse();
            expect(component.activeSubcarpetas['09_auditorias']).toBe('2026/Internas');
        });

        it('getFileDisplayName debe mostrar sólo el nombre de archivo durante la búsqueda general', () => {
            const archivoAnidado = mockArchivos.find(a => a.nombreArchivo.includes('informe_auditoria_interna.pdf'))!;

            // En búsqueda global
            component.busquedaGeneral = 'informe';
            component.onBusquedaGeneralChange();

            const displayNameGlobal = component.getFileDisplayName(archivoAnidado, '09_auditorias');
            expect(displayNameGlobal).toBe('informe_auditoria_interna.pdf');

            // En modo normal sin subcarpeta activa
            component.limpiarBusquedaGeneral();
            const displayNameNormal = component.getFileDisplayName(archivoAnidado, '09_auditorias');
            expect(displayNameNormal).toBe('2026/Internas/informe_auditoria_interna.pdf');
        });
    });
});
