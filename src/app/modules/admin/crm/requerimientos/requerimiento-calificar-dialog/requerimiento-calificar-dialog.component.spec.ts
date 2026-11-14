import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, Subject } from 'rxjs';
import { Requerimiento, RequerimientosService } from '../requerimientos.service';
import { RequerimientoCalificarDialogComponent } from './requerimiento-calificar-dialog.component';
import Swal from 'sweetalert2';

function requerimiento(override: Partial<Requerimiento> = {}): Requerimiento {
  return {
    id: 8, folio: 'REQ-2026-0001', fechaRecepcion: '2026-10-23T12:02:00', nombreContacto: 'Contacto', empresa: 'ACME',
    descripcion: 'Necesidad', estatus: 'Pendiente', usuarioAsignadoId: 18, fechaRegistro: '2026-10-23T12:02:00',
    faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
    faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
    faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false,
    ...override
  };
}

describe('RequerimientoCalificarDialogComponent', () => {
  let fixture: ComponentFixture<RequerimientoCalificarDialogComponent>;
  let mockReqService: any;
  let dialogRefSpy: any;

  function abrir(puedeCalificar: boolean, override: Partial<Requerimiento> = {}, serviceMock: any = {}): void {
    mockReqService = {
      getArchivos: () => of([]),
      getSeguimientos: () => of([]),
      aprobarRequerimiento: () => of({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización' }),
      ...serviceMock
    };
    dialogRefSpy = { close: jasmine.createSpy('close') };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RequerimientoCalificarDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { requerimiento: requerimiento(override), currentUser: { id: 18 }, puedeCalificar } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: RequerimientosService, useValue: mockReqService }
      ]
    });
    fixture = TestBed.createComponent(RequerimientoCalificarDialogComponent);
    fixture.detectChanges();
  }

  const pestanas = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
  const pestana = (texto: string): HTMLButtonElement => pestanas().find(b => b.textContent!.includes(texto))!;
  const casillas = (): HTMLInputElement[] => Array.from(fixture.nativeElement.querySelectorAll('mat-checkbox input'));

  it('no destruye ni recrea los botones de las pestañas en cada revisión de cambios', () => {
    abrir(true);
    const antes = pestanas();
    expect(antes.length).toBe(5);

    fixture.detectChanges();
    fixture.detectChanges();

    expect(antes.every(b => b.isConnected)).toBeTrue();
    expect(pestanas().every((b, i) => b === antes[i])).toBeTrue();
  });

  it('cada pestaña muestra su contenido al hacer clic', () => {
    abrir(true);

    pestana('Información faltante').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Marca lo que falta');

    pestana('Seguimiento').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Registrar contacto de seguimiento');

    pestana('Archivos y planos').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Marca lo que falta');
  });

  it('el responsable asignado puede marcar la información faltante', () => {
    abrir(true);
    pestana('Información faltante').click();
    fixture.detectChanges();

    expect(casillas().length).toBeGreaterThan(0);
    expect(casillas().every(c => !c.disabled)).toBeTrue();
  });

  it('quien no es el responsable ve la información faltante en solo lectura', () => {
    abrir(false);
    pestana('Información faltante').click();
    fixture.detectChanges();

    expect(casillas().length).toBeGreaterThan(0);
    expect(casillas().every(c => c.disabled)).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('puede calificar este requerimiento');
  });

  // Tarea B3 tests
  it('La_pestana_Aprobacion_es_la_ultima', () => {
    abrir(true);
    const tabs = pestanas();
    const ultimaPestana = tabs[tabs.length - 1];
    expect(ultimaPestana.textContent).toContain('Aprobación');
    expect(fixture.componentInstance.pestanas[fixture.componentInstance.pestanas.length - 1].id).toBe('aprobacion');
  });

  it('El_boton_Aprobar_solo_se_habilita_si_esta_calificado_y_completo', () => {
    // 1. Pendiente -> disabled
    abrir(true, { estatus: 'Pendiente', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Título' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnPendiente = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnPendiente.disabled).toBeTrue();

    // 2. Sin solicitante -> disabled
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: undefined, tipoProyecto: 'Ingeniería', titulo: 'Título' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnSinSolicitante = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnSinSolicitante.disabled).toBeTrue();

    // 3. Sin tipoProyecto -> disabled
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: undefined, titulo: 'Título' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnSinTipo = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnSinTipo.disabled).toBeTrue();

    // 4. Sin título -> disabled
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: '' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnSinTitulo = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnSinTitulo.disabled).toBeTrue();

    // 5. Sin permiso (puedeCalificar: false) -> disabled
    abrir(false, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Título' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnSinPermiso = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnSinPermiso.disabled).toBeTrue();

    // 6. Completo y calificado -> ENABLED
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Título' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnHabilitado = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnHabilitado.disabled).toBeFalse();
  });

  it('Si_faltan_campos_el_boton_explica_cuales', () => {
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: undefined, tipoProyecto: undefined, titulo: undefined });
    pestana('Aprobación').click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Solicitante');
    expect(texto).toContain('Tipo de proyecto');
    expect(texto).toContain('Título');
    expect(texto).toContain('Editar requerimiento');
  });

  it('Aprobar_pide_confirmacion_y_muestra_el_folio', () => {
    let swalConfirmado = false;
    spyOn(Swal, 'fire').and.callFake((opts: any) => {
      if (typeof opts === 'object' && opts?.title?.includes('Aprobar')) {
        swalConfirmado = true;
        return {
          then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
        } as any;
      }
      return Promise.resolve({ isConfirmed: false } as any);
    });

    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Subestación ACME' });
    pestana('Aprobación').click();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(swalConfirmado).toBeTrue();
    expect(fixture.componentInstance.requerimiento.seguimientoProyectoId).toBe(42);
    expect(fixture.componentInstance.requerimiento.estatus).toBe('Aprobado para cotización');

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('#42');
  });

  it('Aprobar_no_se_repite_con_doble_clic', () => {
    spyOn(Swal, 'fire').and.callFake(() => ({
      then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
    } as any));
    const pendingSubject = new Subject<any>();
    const spyAprobar = jasmine.createSpy('aprobarRequerimiento').and.returnValue(pendingSubject.asObservable());

    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Subestación' }, { aprobarRequerimiento: spyAprobar });
    pestana('Aprobación').click();
    fixture.detectChanges();

    fixture.componentInstance.aprobar();
    fixture.componentInstance.aprobar(); // segundo intento mientras el primero está en vuelo

    expect(spyAprobar.calls.count()).toBe(1);
    pendingSubject.next({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización' });
    pendingSubject.complete();
  });

  it('Un_error_al_aprobar_se_muestra_y_no_cambia_el_estatus', () => {
    let mensajeErrorVisto = '';
    spyOn(Swal, 'fire').and.callFake((arg1: any, arg2?: any) => {
      if (typeof arg1 === 'object' && arg1?.title?.includes('Aprobar')) {
        return {
          then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
        } as any;
      }
      mensajeErrorVisto = typeof arg1 === 'string' ? `${arg1} ${arg2 || ''}` : (arg1?.text || arg1?.title);
      return Promise.resolve({ isConfirmed: false } as any);
    });

    const spyError = jasmine.createSpy('aprobarRequerimiento').and.returnValue(throwError(() => ({
      error: { mensaje: 'No se pudo generar el folio en Ingeniería por falla de conexión' }
    })));

    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Subestación' }, { aprobarRequerimiento: spyError });
    pestana('Aprobación').click();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(mensajeErrorVisto).toContain('No se pudo generar el folio en Ingeniería por falla de conexión');
    expect(fixture.componentInstance.requerimiento.estatus).toBe('Calificado Comercial');
    expect(fixture.componentInstance.requerimiento.seguimientoProyectoId).toBeUndefined();
  });

  // Revisión de Claude: el API exige sesión; una descarga por <a href> no lleva el token y daría 401.
  it('Descargar_un_archivo_usa_el_servicio_con_sesion_y_guarda_el_archivo', () => {
    const descargar = jasmine.createSpy('descargarArchivo').and.returnValue(of(new Blob(['contenido'])));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    spyOn(URL, 'revokeObjectURL');
    const clic = spyOn(HTMLAnchorElement.prototype, 'click');
    abrir(true, {}, { descargarArchivo: descargar });

    fixture.componentInstance.descargarArchivo({
      id: 5, requerimientoId: 8, nombreArchivo: 'plano.pdf', rutaArchivo: 'x', fechaSubida: '2026-11-13T10:00:00'
    });

    expect(descargar).toHaveBeenCalledWith(8, 5);
    expect(clic).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
  });

  it('Un_error_al_descargar_un_archivo_se_muestra', () => {
    const aviso = spyOn(Swal, 'fire');
    abrir(true, {}, { descargarArchivo: () => throwError(() => ({ status: 401 })) });

    fixture.componentInstance.descargarArchivo({
      id: 5, requerimientoId: 8, nombreArchivo: 'plano.pdf', rutaArchivo: 'x', fechaSubida: '2026-11-13T10:00:00'
    });

    expect(aviso).toHaveBeenCalled();
    expect(String(aviso.calls.mostRecent().args[0])).toContain('No se pudo descargar');
  });

  it('Al_cerrar_despues_de_aprobar_el_tablero_se_recarga', () => {
    spyOn(Swal, 'fire').and.callFake(() => ({
      then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
    } as any));
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Subestación' });

    fixture.componentInstance.aprobar();
    expect(fixture.componentInstance.estaAprobado).toBeTrue();
    fixture.componentInstance.onCancel();

    // El padre solo recarga el tablero si el diálogo se cierra con un valor verdadero.
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('Cerrar_sin_aprobar_no_recarga_el_tablero', () => {
    abrir(true, { estatus: 'Calificado Comercial', solicitanteId: 1, tipoProyecto: 'Ingeniería', titulo: 'Subestación' });

    fixture.componentInstance.onCancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
