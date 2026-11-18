import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { RequerimientosService, Requerimiento } from '../requerimientos.service';
import { EngineeringService, Solicitante } from 'app/modules/admin/engineering/engineering.service';
import { RequerimientoDialogComponent } from './requerimiento-dialog.component';

function mockRequerimientoAntiguo(): Requerimiento {
  return {
    id: 15,
    folio: 'REQ-2026-0015',
    fechaRecepcion: '2026-10-01T12:00:00',
    nombreContacto: 'Cliente Antiguo',
    empresa: 'Empresa Vieja SA',
    telefono: '4421112233',
    email: 'viejo@test.com',
    sucursal: 'Querétaro',
    descripcion: 'Requerimiento registrado antes de los campos nuevos',
    estatus: 'Pendiente',
    fechaRegistro: '2026-10-01T12:00:00',
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
    faltaOtros: false
  };
}

const mockSolicitantes: Solicitante[] = [
  { idSolicitante: 1, nombreCompleto: 'Solicitante Uno', empresa: 'Empresa A', activo: true },
  { idSolicitante: 2, nombreCompleto: 'Solicitante Dos', empresa: 'Empresa B', activo: true },
  { idSolicitante: 3, nombreCompleto: 'Solicitante Inactivo', empresa: 'Empresa C', activo: false }
];

describe('RequerimientoDialogComponent', () => {
  let fixture: ComponentFixture<RequerimientoDialogComponent>;
  let component: RequerimientoDialogComponent;
  let mockReqService: jasmine.SpyObj<RequerimientosService>;
  let mockEngService: jasmine.SpyObj<EngineeringService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<RequerimientoDialogComponent>>;

  beforeEach(() => {
    mockReqService = jasmine.createSpyObj('RequerimientosService', [
      'createRequerimiento',
      'updateRequerimiento',
      'getArchivos',
      'subirArchivos',
      'descargarArchivoUrl',
      'descargarArchivo',
      'eliminarArchivo'
    ]);
    mockEngService = jasmine.createSpyObj('EngineeringService', ['getSolicitantes']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    mockReqService.getArchivos.and.returnValue(of([]));
    mockReqService.createRequerimiento.and.returnValue(of({ id: 99, folio: 'REQ-2026-0099' } as any));
    mockReqService.updateRequerimiento.and.returnValue(of({}));
    mockEngService.getSolicitantes.and.returnValue(of(mockSolicitantes));
  });

  function inicializar(data: { requerimiento?: Requerimiento; users: any[] } = { users: [] }): void {
    TestBed.configureTestingModule({
      imports: [RequerimientoDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: RequerimientosService, useValue: mockReqService },
        { provide: EngineeringService, useValue: mockEngService }
      ]
    });

    fixture = TestBed.createComponent(RequerimientoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('El_solicitante_es_opcional_y_ya_no_se_piden_tipo_ni_titulo_de_proyecto', () => {
    inicializar();

    expect(component.reqForm.contains('solicitanteId')).toBeTrue();
    expect(component.reqForm.contains('tipoProyecto')).toBeFalse();
    expect(component.reqForm.contains('titulo')).toBeFalse();
    expect(component.reqForm.get('solicitanteId')?.hasError('required')).toBeFalse();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Solicitante (opcional)');
    expect(texto).not.toContain('Tipo de proyecto');
    expect(texto).not.toContain('Título del proyecto');
  });

  it('Se_puede_crear_un_requerimiento_sin_solicitante', () => {
    inicializar();

    component.reqForm.patchValue({
      nombreContacto: 'Carlos López',
      empresa: 'Logística SA',
      descripcion: 'Instalación de transformador'
    });

    expect(component.reqForm.valid).toBeTrue();
    component.onSubmit();

    const enviado = mockReqService.createRequerimiento.calls.mostRecent().args[0] as any;
    expect(enviado.solicitanteId).toBeNull();
  });

  it('La_fecha_se_llama_Fecha_de_la_requisicion', () => {
    inicializar();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fecha de la requisición');
    expect(text).not.toContain('Fecha de Recepción');
  });

  it('Se_envian_los_campos_nuevos_al_crear', () => {
    inicializar();

    component.reqForm.patchValue({
      nombreContacto: 'Carlos López',
      empresa: 'Logística SA',
      telefono: '5559876543',
      email: 'carlos@logistica.com',
      sucursal: 'Querétaro',
      descripcion: 'Instalación de transformador en patio de maniobras',
      solicitanteId: 2,
      fechaRecepcion: new Date('2026-11-13T12:00:00Z')
    });

    expect(component.reqForm.valid).toBeTrue();
    component.onSubmit();

    expect(mockReqService.createRequerimiento).toHaveBeenCalledWith(
      jasmine.objectContaining({ solicitanteId: 2 })
    );
    const enviado = mockReqService.createRequerimiento.calls.mostRecent().args[0] as any;
    expect('tipoProyecto' in enviado).toBeFalse();
    expect('titulo' in enviado).toBeFalse();
  });

  it('Al_editar_un_requerimiento_antiguo_el_solicitante_se_puede_agregar_y_no_se_tocan_tipo_ni_titulo', () => {
    const antiguo = mockRequerimientoAntiguo();
    inicializar({ requerimiento: antiguo, users: [] });

    // Sin solicitante guardado el formulario ya es valido: no se exige
    expect(component.reqForm.valid).toBeTrue();

    component.reqForm.patchValue({ solicitanteId: 1 });

    expect(component.reqForm.valid).toBeTrue();
    component.onSubmit();

    expect(mockReqService.updateRequerimiento).toHaveBeenCalledWith(
      antiguo.id,
      jasmine.objectContaining({ solicitanteId: 1 })
    );
    // Sin esas llaves el API conserva lo que el requerimiento ya tenga guardado
    const enviado = mockReqService.updateRequerimiento.calls.mostRecent().args[1] as any;
    expect('tipoProyecto' in enviado).toBeFalse();
    expect('titulo' in enviado).toBeFalse();
  });

  it('Un_error_al_cargar_los_solicitantes_se_ve', () => {
    mockEngService.getSolicitantes.and.returnValue(throwError(() => new Error('Error al consultar solicitantes')));
    inicializar();

    expect(component.errorSolicitantes).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los solicitantes');
  });

  // Revisión de Claude: el API exige sesión; window.open / <a href> no llevan el token y darían 401.
  const archivoExistente = { id: 5, requerimientoId: 15, nombreArchivo: 'plano.pdf', rutaArchivo: 'x', fechaSubida: '2026-11-13T10:00:00' };

  it('Descargar_un_archivo_existente_usa_el_servicio_con_sesion', () => {
    mockReqService.descargarArchivo.and.returnValue(of(new Blob(['contenido'])));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    spyOn(URL, 'revokeObjectURL');
    const clic = spyOn(HTMLAnchorElement.prototype, 'click');
    inicializar({ requerimiento: mockRequerimientoAntiguo(), users: [] });

    component.descargarArchivo(archivoExistente);

    expect(mockReqService.descargarArchivo).toHaveBeenCalledWith(15, 5);
    expect(clic).toHaveBeenCalled();
  });

  it('Ver_un_archivo_existente_lo_abre_en_otra_pestana_con_sesion', () => {
    mockReqService.descargarArchivo.and.returnValue(of(new Blob(['contenido'])));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    const abrir = spyOn(window, 'open').and.returnValue(null);
    inicializar({ requerimiento: mockRequerimientoAntiguo(), users: [] });

    component.verArchivo(archivoExistente);

    expect(mockReqService.descargarArchivo).toHaveBeenCalledWith(15, 5);
    expect(abrir).toHaveBeenCalledWith('blob:prueba', '_blank');
  });
});
