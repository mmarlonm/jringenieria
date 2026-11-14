import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { Requerimiento, RequerimientosService } from '../requerimientos.service';
import { RequerimientosComponent } from '../requerimientos.component';
import { RequerimientoVerDialogComponent, RequerimientoVerDialogData } from './requerimiento-ver-dialog.component';
import Swal from 'sweetalert2';

function mockRequerimiento(overrides: Partial<Requerimiento> = {}): Requerimiento {
  return {
    id: 10,
    folio: 'REQ-2026-0010',
    fechaRecepcion: '2026-11-13T10:00:00',
    nombreContacto: 'Juan Pérez',
    empresa: 'Industrias Ficticias SA de CV',
    telefono: '5551234567',
    email: 'contacto@ficticio.com',
    sucursal: 'Querétaro',
    solicitanteId: 1,
    solicitanteNombre: 'Solicitante Ficticio',
    tipoProyecto: 'Ingeniería',
    titulo: 'Instalación de Subestación Eléctrica',
    usuarioCreadorId: 5,
    usuarioCreadorNombre: 'Creador Ficticio',
    usuarioAsignadoId: 18,
    usuarioAsignadoNombre: 'Responsable Ficticio',
    descripcion: 'Proyecto de modernización eléctrica integral',
    estatus: 'Pendiente',
    fechaRegistro: '2026-11-13T10:00:00',
    faltaPlano: false,
    faltaFotografia: false,
    faltaCantidad: false,
    faltaUbicacion: false,
    faltaDatosElectricos: false,
    faltaCapacidad: false,
    faltaFechaEjecucion: false,
    faltaCondicionesSitio: false,
    faltaNormativa: false,
    faltaEvidenciaFalla: false,
    faltaMarcaModelo: false,
    faltaVisita: false,
    faltaOtros: false,
    archivos: [],
    seguimientos: [],
    ...overrides
  };
}

describe('RequerimientoVerDialogComponent', () => {
  let fixture: ComponentFixture<RequerimientoVerDialogComponent>;
  let component: RequerimientoVerDialogComponent;
  let mockReqService: jasmine.SpyObj<RequerimientosService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<RequerimientoVerDialogComponent>>;

  beforeEach(() => {
    mockReqService = jasmine.createSpyObj('RequerimientosService', [
      'getRequerimiento',
      'puedeCalificar',
      'descargarArchivoUrl',
      'descargarArchivo'
    ]);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  function configurar(data: RequerimientoVerDialogData, reqObservable = of(mockRequerimiento())): void {
    mockReqService.getRequerimiento.and.returnValue(reqObservable);
    mockReqService.puedeCalificar.and.returnValue(data.puedeCalificar ?? true);
    mockReqService.descargarArchivoUrl.and.callFake((reqId, archId) => `/api/Requerimiento/${reqId}/archivos/${archId}/descargar`);

    TestBed.configureTestingModule({
      imports: [RequerimientoVerDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: RequerimientosService, useValue: mockReqService }
      ]
    });

    fixture = TestBed.createComponent(RequerimientoVerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('El_ojo_abre_la_visualizacion_del_requerimiento', () => {
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const serviceSpy = jasmine.createSpyObj('RequerimientosService', [
      'getRequerimientos',
      'getIndicadores',
      'puedeCalificar',
      'usuarioActualId'
    ]);
    const usersSpy = jasmine.createSpyObj('UsersService', ['getUsers']);
    serviceSpy.getRequerimientos.and.returnValue(of([]));
    serviceSpy.getIndicadores.and.returnValue(of({} as any));
    usersSpy.getUsers.and.returnValue(of([]));

    const comp = new RequerimientosComponent(
      serviceSpy,
      usersSpy,
      dialogSpy,
      jasmine.createSpyObj('MatSnackBar', ['open']),
      jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']),
      { nativeElement: document.createElement('div') } as any
    );

    const req = mockRequerimiento();
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);

    comp.openVerDialog(req);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      RequerimientoVerDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({ id: req.id })
      })
    );
  });

  it('La_visualizacion_es_de_solo_lectura', () => {
    configurar({ id: 10 });
    const inputs = fixture.nativeElement.querySelectorAll('input:not([type="hidden"]), textarea, select');
    expect(inputs.length).toBe(0);
  });

  it('La_visualizacion_muestra_los_datos_y_los_campos_nuevos', () => {
    const req = mockRequerimiento({
      seguimientoProyectoId: 42,
      estatus: 'Calificado Comercial',
      naturaleza: 'Proyecto Nuevo',
      viabilidad: 'Alta',
      rutaAtencion: 'Cotización Directa',
      observacionesRiesgo: 'Sin riesgos aparentes',
      faltaPlano: true,
      archivos: [
        { id: 1, requerimientoId: 10, nombreArchivo: 'plano-electrico.dwg', rutaArchivo: 'path/1', fechaSubida: '2026-11-13' }
      ],
      seguimientos: [
        { id: 1, requerimientoId: 10, fechaContacto: '2026-11-13', medio: 'Llamada', detalle: 'Llamada con cliente sobre especificaciones', idResponsable: 18, responsableNombre: 'Responsable Ficticio', fechaRegistro: '2026-11-13' }
      ]
    });

    configurar({ id: 10 }, of(req));
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('REQ-2026-0010');
    expect(text).toContain('Calificado Comercial');
    expect(text).toContain('Juan Pérez');
    expect(text).toContain('Industrias Ficticias SA de CV');
    expect(text).toContain('5551234567');
    expect(text).toContain('contacto@ficticio.com');
    expect(text).toContain('Querétaro');
    expect(text).toContain('Solicitante Ficticio');
    expect(text).toContain('Ingeniería');
    expect(text).toContain('Instalación de Subestación Eléctrica');
    expect(text).toContain('Creador Ficticio');
    expect(text).toContain('Responsable Ficticio');
    expect(text).toContain('Proyecto de modernización eléctrica integral');
    expect(text).toContain('Proyecto Nuevo');
    expect(text).toContain('Alta');
    expect(text).toContain('Cotización Directa');
    expect(text).toContain('Sin riesgos aparentes');
    expect(text).toContain('Plano');
    expect(text).toContain('plano-electrico.dwg');
    expect(text).toContain('Llamada con cliente sobre especificaciones');
    expect(text).toContain('#42');

    const link = fixture.nativeElement.querySelector('a[href*="/engineering/solicitud-cliente"]');
    expect(link).not.toBeNull();
  });

  it('El_boton_Calificar_abre_la_calificacion_y_cierra_la_visualizacion', () => {
    const req = mockRequerimiento({ estatus: 'Pendiente' });
    configurar({ id: 10, puedeCalificar: true }, of(req));

    const btnCalificar = fixture.nativeElement.querySelector('[data-testid="btn-calificar"]');
    expect(btnCalificar).not.toBeNull();
    btnCalificar.click();

    expect(mockDialogRef.close).toHaveBeenCalledWith({ accion: 'calificar', requerimiento: req });
  });

  it('El_boton_Calificar_no_aparece_si_no_puede_calificar_o_esta_aprobado', () => {
    // Caso 1: no puede calificar
    configurar({ id: 10, puedeCalificar: false }, of(mockRequerimiento()));
    let btnCalificar = fixture.nativeElement.querySelector('[data-testid="btn-calificar"]');
    expect(btnCalificar).toBeNull();

    // Caso 2: ya aprobado por seguimientoProyectoId
    fixture.destroy();
    TestBed.resetTestingModule();
    configurar({ id: 10, puedeCalificar: true }, of(mockRequerimiento({ seguimientoProyectoId: 42 })));
    btnCalificar = fixture.nativeElement.querySelector('[data-testid="btn-calificar"]');
    expect(btnCalificar).toBeNull();

    // Caso 3: estatus "Aprobado para cotización"
    fixture.destroy();
    TestBed.resetTestingModule();
    configurar({ id: 10, puedeCalificar: true }, of(mockRequerimiento({ estatus: 'Aprobado para cotización' })));
    btnCalificar = fixture.nativeElement.querySelector('[data-testid="btn-calificar"]');
    expect(btnCalificar).toBeNull();
  });

  it('Un_error_de_carga_se_ve_con_Reintentar', () => {
    configurar({ id: 10 }, throwError(() => ({ error: { mensaje: 'Error al conectar con el servidor' } })));

    expect(fixture.nativeElement.textContent).toContain('Error al conectar con el servidor');
    const btnReintentar = fixture.nativeElement.querySelector('[data-testid="btn-reintentar"]');
    expect(btnReintentar).not.toBeNull();

    mockReqService.getRequerimiento.and.returnValue(of(mockRequerimiento()));
    btnReintentar.click();
    fixture.detectChanges();

    expect(mockReqService.getRequerimiento).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('REQ-2026-0010');
  });

  it('La_visualizacion_muestra_escapado_lo_que_viene_del_API', () => {
    const req = mockRequerimiento({
      titulo: '<b>Titulo Peligroso</b>',
      descripcion: '<script>alert("xss")</script><img src="x" onerror="evil()">'
    });
    configurar({ id: 10 }, of(req));

    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('img[onerror]')).toBeNull();
    const tituloEl = fixture.nativeElement.querySelector('[data-testid="campo-titulo"]');
    expect(tituloEl.querySelector('b')).toBeNull();
    expect(tituloEl.textContent).toContain('<b>Titulo Peligroso</b>');
    const descEl = fixture.nativeElement.querySelector('[data-testid="campo-descripcion"]');
    expect(descEl.textContent).toContain('<script>alert("xss")</script><img src="x" onerror="evil()">');
  });

  // Revisión de Claude: el API exige sesión; window.open no lleva el token y daría 401.
  const conArchivo = () => mockRequerimiento({
    archivos: [{ id: 7, requerimientoId: 10, nombreArchivo: 'plano.pdf', rutaArchivo: 'x', fechaSubida: '2026-11-13T10:00:00' }]
  });

  it('Descargar_un_archivo_usa_el_servicio_con_sesion_y_guarda_el_archivo', () => {
    spyOn(window, 'open').and.returnValue(null);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    spyOn(URL, 'revokeObjectURL');
    const clic = spyOn(HTMLAnchorElement.prototype, 'click');
    mockReqService.descargarArchivo.and.returnValue(of(new Blob(['contenido'])));
    configurar({ id: 10 }, of(conArchivo()));

    component.descargarArchivo(7);

    expect(mockReqService.descargarArchivo).toHaveBeenCalledWith(10, 7);
    expect(clic).toHaveBeenCalled();
  });

  it('Un_error_al_descargar_un_archivo_se_muestra', () => {
    spyOn(window, 'open').and.returnValue(null);
    const aviso = spyOn(Swal, 'fire');
    mockReqService.descargarArchivo.and.returnValue(throwError(() => ({ status: 401 })));
    configurar({ id: 10 }, of(conArchivo()));

    component.descargarArchivo(7);

    expect(aviso).toHaveBeenCalled();
    expect(String(aviso.calls.mostRecent().args[0])).toContain('No se pudo descargar');
  });
});
