import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of } from 'rxjs';
import { ReportesComponent } from './reportes.component';
import { ReportesService, VistaConUsuarios, DescargasPaginadas, DescargasResumen, DescargaItem } from './reportes.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { FuseNavigationItem } from '@fuse/components/navigation';
import * as fileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';

describe('ReportesComponent (Seguridad)', () => {
    let component: ReportesComponent;
    let fixture: ComponentFixture<ReportesComponent>;
    let reportesServiceSpy: jasmine.SpyObj<ReportesService>;
    let navServiceSpy: jasmine.SpyObj<NavigationService>;

    const mockNav: FuseNavigationItem[] = [
        {
            id: 'ingenieria',
            title: 'Ingeniería',
            type: 'collapsable',
            children: [
                { id: 'ingenieria.control-ejecucion', title: 'Control de Ejecución', type: 'basic' }
            ]
        },
        {
            id: 'administracion',
            title: 'Administración',
            type: 'collapsable',
            children: [
                { id: 'administracion.minutas', title: 'Minutas', type: 'basic' }
            ]
        }
    ];

    const mockVistasApi: VistaConUsuarios[] = [
        {
            vistaId: 1,
            nombreVista: 'ingenieria.control-ejecucion',
            ruta: '/engineering/control-ejecucion',
            usuarios: [
                { usuarioId: 10, nombreUsuario: 'Carlos Ing', email: 'carlos@jr.com', activo: true, roles: ['Ingeniero'] }
            ]
        },
        {
            vistaId: 2,
            nombreVista: 'administracion.minutas',
            ruta: '/administration/minutas',
            usuarios: [
                { usuarioId: 20, nombreUsuario: 'Ana Admin', email: 'ana@jr.com', activo: true, roles: ['Admin'] }
            ]
        },
        {
            vistaId: 3,
            nombreVista: 'vista.huerfana-sin-menu',
            ruta: '/huerfana',
            usuarios: [
                { usuarioId: 30, nombreUsuario: 'Pedro Huerfano', email: 'pedro@jr.com', activo: true, roles: ['Especial'] }
            ]
        }
    ];

    const mockDescargasResp: DescargasPaginadas = {
        total: 1,
        items: [
            {
                id: 101,
                fechaUtc: '2026-11-27T12:00:00Z',
                usuarioId: 10,
                usuarioNombre: 'Carlos Ing',
                origen: 'Usuario',
                modulo: 'Ingeniería',
                nombreArchivo: 'plano_v1.pdf',
                ruta: '/api/Proyecto/archivo/1',
                tamanoBytes: 2048
            }
        ]
    };

    const mockResumen: DescargasResumen = {
        total: 1,
        porModulo: [{ modulo: 'Ingeniería', cantidad: 1 }],
        topUsuarios: [{ usuarioId: 10, usuarioNombre: 'Carlos Ing', cantidad: 1 }],
        topArchivos: [{ nombreArchivo: 'plano_v1.pdf', modulo: 'Ingeniería', cantidad: 1 }]
    };

    beforeEach(async () => {
        reportesServiceSpy = jasmine.createSpyObj<ReportesService>('ReportesService', [
            'obtenerUsuariosPorVista',
            'obtenerDescargas',
            'obtenerResumenDescargas',
            'exportarDescargas'
        ]);

        reportesServiceSpy.obtenerUsuariosPorVista.and.returnValue(of(mockVistasApi));
        reportesServiceSpy.obtenerDescargas.and.returnValue(of(mockDescargasResp));
        reportesServiceSpy.obtenerResumenDescargas.and.returnValue(of(mockResumen));
        reportesServiceSpy.exportarDescargas.and.returnValue(of(mockDescargasResp.items));

        navServiceSpy = jasmine.createSpyObj<NavigationService>('NavigationService', ['get']);
        navServiceSpy.get.and.returnValue(of({ default: mockNav, compact: [], futuristic: [], horizontal: [] }));

        await TestBed.configureTestingModule({
            imports: [
                ReportesComponent,
                NoopAnimationsModule,
                MatIconTestingModule
            ],
            providers: [
                { provide: ReportesService, useValue: reportesServiceSpy },
                { provide: NavigationService, useValue: navServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ReportesComponent);
        component = fixture.componentInstance;
    });

    it('debe crearse el componente', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('debe agrupar las vistas por módulo usando construirModulos y mandar vistas huerfanas a Otros', () => {
        fixture.detectChanges();

        expect(component.modulosConUsuarios.length).toBe(3);

        const modIng = component.modulosConUsuarios.find(m => m.id === 'ingenieria');
        expect(modIng).toBeDefined();
        expect(modIng!.vistas.length).toBe(1);
        expect(modIng!.vistas[0].id).toBe('ingenieria.control-ejecucion');
        expect(modIng!.vistas[0].usuarios.length).toBe(1);

        const modAdmin = component.modulosConUsuarios.find(m => m.id === 'administracion');
        expect(modAdmin).toBeDefined();
        expect(modAdmin!.vistas.length).toBe(1);

        const modOtros = component.modulosConUsuarios.find(m => m.id === '__otros');
        expect(modOtros).toBeDefined('Las vistas que no están en el menú deben ir a Otros');
        expect(modOtros!.titulo).toBe('Otros');
        expect(modOtros!.vistas.length).toBe(1);
        expect(modOtros!.vistas[0].id).toBe('vista.huerfana-sin-menu');
    });

    it('debe enviar los filtros al API en la pestaña de descargas (desde, hasta, usuarioId, modulo, texto, page, size)', () => {
        fixture.detectChanges();

        component.filtroDesde = '2026-11-01';
        component.filtroHasta = '2026-11-27';
        component.filtroUsuarioId = 15;
        component.filtroModuloDescarga = 'Proyectos';
        component.filtroTexto = 'presupuesto';

        component.aplicarFiltrosDescargas();

        expect(reportesServiceSpy.obtenerDescargas).toHaveBeenCalledWith(
            '2026-11-01',
            '2026-11-27',
            15,
            'Proyectos',
            'presupuesto',
            1,
            50
        );
    });

    it('debe paginar en servidor las descargas', () => {
        fixture.detectChanges();

        component.totalDescargas = 120;
        component.tamanoPagina = 50;

        component.cambiarPagina(2);

        expect(component.paginaActual).toBe(2);
        expect(reportesServiceSpy.obtenerDescargas).toHaveBeenCalledWith(
            component.filtroDesde,
            component.filtroHasta,
            null,
            '',
            '',
            2,
            50
        );
    });

    it('debe exportar descargas a Excel con las columnas correctas', async () => {
        fixture.detectChanges();

        let addWorksheetSpy: jasmine.Spy | null = null;
        const origAddWorksheet = ExcelJS.Workbook.prototype.addWorksheet;
        let columnasAsignadas: any[] = [];

        spyOn(ExcelJS.Workbook.prototype, 'addWorksheet').and.callFake(function (this: any, name: string) {
            const sheet = origAddWorksheet.call(this, name);
            Object.defineProperty(sheet, 'columns', {
                set(cols: any[]) {
                    columnasAsignadas = cols;
                },
                get() {
                    return columnasAsignadas;
                }
            });
            return sheet;
        });

        spyOn(fileSaver, 'saveAs').and.stub();

        await component.exportarDescargasExcel();

        expect(reportesServiceSpy.exportarDescargas).toHaveBeenCalled();
        expect(columnasAsignadas.length).toBe(8);
        const headers = columnasAsignadas.map(c => c.header);
        expect(headers).toContain('ID');
        expect(headers).toContain('Fecha y Hora (México)');
        expect(headers).toContain('Usuario');
        expect(headers).toContain('Origen');
        expect(headers).toContain('Módulo');
        expect(headers).toContain('Nombre de Archivo');
        expect(headers).toContain('Ruta');
        expect(headers).toContain('Tamaño (Bytes)');
    });

    it('debe formatear la fecha con -0600 en el template', () => {
        component.tabActiva = 'descargas';
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const celdasFecha = compiled.querySelectorAll('td.font-mono');
        expect(celdasFecha.length).toBeGreaterThan(0);

        // 12:00 UTC en México (UTC-6) son las 06:00
        expect(celdasFecha[0].textContent?.trim()).toContain('27/11/2026 06:00');
    });

    it('debe mostrar estado vacío cuando no hay descargas', () => {
        reportesServiceSpy.obtenerDescargas.and.returnValue(of({ total: 0, items: [] }));
        component.tabActiva = 'descargas';
        component.aplicarFiltrosDescargas();
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('No se encontraron registros de descargas con los filtros seleccionados.');
    });
});
