import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
  let backdropSubject: Subject<any>;
  let keydownSubject: Subject<any>;

  function abrir(puedeCalificar: boolean, override: Partial<Requerimiento> = {}, serviceMock: any = {}): void {
    mockReqService = {
      getArchivos: () => of([]),
      getSeguimientos: () => of([]),
      calificarRequerimiento: () => of({}),
      guardarBorrador: () => of({}),
      aprobarRequerimiento: () => of({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización', destino: 'ingenieria' }),
      ...serviceMock
    };
    backdropSubject = new Subject<any>();
    keydownSubject = new Subject<any>();
    dialogRefSpy = {
      close: jasmine.createSpy('close'),
      backdropClick: () => backdropSubject.asObservable(),
      keydownEvents: () => keydownSubject.asObservable()
    };

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
    abrir(true, { estatus: 'Pendiente' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnPendiente = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnPendiente.disabled).toBeTrue();

    // 2. Con información faltante guardada -> disabled
    abrir(true, { estatus: 'Calificado Comercial', faltaPlano: true });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnConFaltante = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnConFaltante.disabled).toBeTrue();

    // 3. Con cambios sin guardar -> disabled
    abrir(true, { estatus: 'Calificado Comercial' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement).disabled).toBeFalse();
    fixture.componentInstance.calificarForm.markAsDirty();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement).disabled).toBeTrue();

    // 4. Sin permiso (puedeCalificar: false) -> disabled
    abrir(false, { estatus: 'Calificado Comercial' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnSinPermiso = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnSinPermiso.disabled).toBeTrue();

    // 5. Completo y calificado comercial -> ENABLED
    abrir(true, { estatus: 'Calificado Comercial' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnComercial = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnComercial.disabled).toBeFalse();

    // 6. Completo y calificado técnico -> ENABLED
    abrir(true, { estatus: 'Calificado Técnico' });
    pestana('Aprobación').click();
    fixture.detectChanges();
    const btnTecnico = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btnTecnico.disabled).toBeFalse();
  });

  it('Si_faltan_campos_el_boton_explica_cuales', () => {
    abrir(true, { estatus: 'Calificado Comercial', faltaPlano: true, faltaFotografia: true });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.faltantesGuardados).toEqual(['Plano eléctrico', 'Fotografías del sitio']);
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('No se puede aprobar: falta información');
    expect(texto).toContain('Plano eléctrico, Fotografías del sitio');
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

    abrir(true, { estatus: 'Calificado Técnico', tipoProyecto: 'Ingeniería', titulo: 'Subestación ACME' });
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

  it('Tipo_y_titulo_son_opcionales_para_un_tecnico_y_se_puede_aprobar_sin_llenarlos', () => {
    abrir(true, { estatus: 'Calificado Técnico' });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Datos para Ingeniería');
    expect(fixture.nativeElement.querySelector('#aprobacion-form')).not.toBeNull();
    const btn = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btn.disabled).toBeFalse();
    expect(fixture.componentInstance.camposFaltantesAprobacion).toEqual([]);
  });

  it('Al_capturar_tipo_y_titulo_se_habilita_Aprobar_y_viajan_en_la_peticion', () => {
    spyOn(Swal, 'fire').and.callFake(() => ({
      then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
    } as any));
    const spyAprobar = jasmine.createSpy('aprobarRequerimiento').and.returnValue(
      of({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización', destino: 'ingenieria' })
    );
    abrir(true, { estatus: 'Calificado Técnico' }, { aprobarRequerimiento: spyAprobar });
    pestana('Aprobación').click();
    fixture.detectChanges();

    fixture.componentInstance.aprobacionForm.patchValue({ tipoProyecto: 'Instalación', titulo: '  Subestación ACME  ' });
    fixture.componentInstance.aprobacionForm.markAsPristine();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('#btn-aprobar') as HTMLButtonElement;
    expect(btn.disabled).toBeFalse();

    btn.click();
    fixture.detectChanges();

    expect(spyAprobar).toHaveBeenCalledOnceWith(8, { tipoProyecto: 'Instalación', titulo: 'Subestación ACME' });
    expect(fixture.componentInstance.requerimiento.tipoProyecto).toBe('Instalación');
    expect(fixture.componentInstance.aprobacionForm.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.resumen-titulo')?.textContent).toContain('Subestación ACME');
  });

  it('Quien_no_es_el_responsable_ve_los_campos_pero_no_puede_escribir', () => {
    abrir(false, { estatus: 'Calificado Técnico' });

    expect(fixture.componentInstance.aprobacionForm.disabled).toBeTrue();
  });

  it('Un_titulo_de_mas_de_500_caracteres_no_deja_aprobar', () => {
    abrir(true, { estatus: 'Calificado Técnico' });
    fixture.componentInstance.aprobacionForm.patchValue({ tipoProyecto: 'Instalación', titulo: 'x'.repeat(501) });

    expect(fixture.componentInstance.puedeAprobar).toBeFalse();
    expect(fixture.componentInstance.camposFaltantesAprobacion.join(' ')).toContain('Título');
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

    expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
  });

  it('Los_tres_datos_se_escriben_en_la_fila_de_su_casilla', () => {
    abrir(true, {
      cantidades: '10 piezas',
      ubicacionExacta: 'Nave 1',
      marcaModelo: 'Siemens S7'
    });
    pestana('Información faltante').click();
    fixture.detectChanges();

    const inputCantidades = fixture.nativeElement.querySelector('input[formControlName="cantidades"]');
    const inputUbicacion = fixture.nativeElement.querySelector('input[formControlName="ubicacionExacta"]');
    const inputMarca = fixture.nativeElement.querySelector('input[formControlName="marcaModelo"]');

    expect(inputCantidades).not.toBeNull();
    expect(inputUbicacion).not.toBeNull();
    expect(inputMarca).not.toBeNull();
    expect(inputCantidades.value).toBe('10 piezas');
    expect(inputUbicacion.value).toBe('Nave 1');
    expect(inputMarca.value).toBe('Siemens S7');
  });

  it('Marcar_falta_apaga_el_texto_y_conserva_lo_escrito', () => {
    abrir(true, {
      cantidades: '10 piezas',
      faltaCantidad: false
    });
    pestana('Información faltante').click();
    fixture.detectChanges();

    const form = fixture.componentInstance.calificarForm;
    const inputCant = fixture.nativeElement.querySelector('input[formControlName="cantidades"]');
    expect(form.get('cantidades')?.disabled).toBeFalse();

    form.get('faltaCantidad')?.setValue(true);
    fixture.detectChanges();

    expect(form.get('cantidades')?.disabled).toBeTrue();
    expect(form.get('cantidades')?.value).toBe('10 piezas');
    expect(inputCant.disabled).toBeTrue();

    form.get('faltaCantidad')?.setValue(false);
    fixture.detectChanges();

    expect(form.get('cantidades')?.disabled).toBeFalse();
    expect(form.get('cantidades')?.value).toBe('10 piezas');
  });

  it('Calificado_exige_el_texto_de_lo_que_no_esta_marcado_como_faltante', () => {
    abrir(true, {
      estatus: 'Calificado Comercial',
      faltaCantidad: false, cantidades: '',
      faltaUbicacion: false, ubicacionExacta: 'Lugar X',
      faltaMarcaModelo: false, marcaModelo: 'Marca Y'
    });
    pestana('Información faltante').click();
    fixture.detectChanges();

    const form = fixture.componentInstance.calificarForm;
    expect(form.invalid).toBeTrue();

    const btnGuardar = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btnGuardar.disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Escríbelo o márcalo como faltante');

    form.get('cantidades')?.setValue('5 tableros');
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(btnGuardar.disabled).toBeFalse();
  });

  it('Pendiente_no_exige_los_textos', () => {
    abrir(true, {
      estatus: 'Pendiente',
      faltaCantidad: false, cantidades: '',
      faltaUbicacion: false, ubicacionExacta: '',
      faltaMarcaModelo: false, marcaModelo: ''
    });
    fixture.detectChanges();

    const form = fixture.componentInstance.calificarForm;
    expect(form.valid).toBeTrue();
    const btnGuardar = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btnGuardar.disabled).toBeFalse();
  });

  it('Guardar_calificacion_manda_los_tres_textos_recortados', () => {
    let dtoEnviado: any = null;
    abrir(true, {
      estatus: 'Calificado Comercial',
      faltaCantidad: false,
      faltaUbicacion: false,
      faltaMarcaModelo: false
    }, {
      calificarRequerimiento: (id: number, dto: any) => {
        dtoEnviado = dto;
        return of(null);
      }
    });

    const form = fixture.componentInstance.calificarForm;
    form.patchValue({
      cantidades: '   10 piezas   ',
      ubicacionExacta: '   Nave 2   ',
      marcaModelo: '   Modelo Z   '
    });
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();

    expect(dtoEnviado).not.toBeNull();
    expect(dtoEnviado.cantidades).toBe('10 piezas');
    expect(dtoEnviado.ubicacionExacta).toBe('Nave 2');
    expect(dtoEnviado.marcaModelo).toBe('Modelo Z');
  });

  it('Guardar_borrador_manda_todo_sin_estatus_y_no_cierra_el_dialogo', () => {
    let dtoEnviado: any = null;
    const spyBorrador = jasmine.createSpy('guardarBorrador').and.callFake((id: number, dto: any) => {
      dtoEnviado = dto;
      return of(null);
    });
    abrir(true, { estatus: 'Pendiente', nombreContacto: 'Ana', empresa: 'ACME' }, { guardarBorrador: spyBorrador });

    fixture.componentInstance.calificarForm.patchValue({
      naturaleza: 'Venta',
      cantidades: ' 10 unidades ',
      faltaCantidad: false,
      faltaFotografia: true
    });
    fixture.componentInstance.calificarForm.markAsDirty();
    fixture.componentInstance.aprobacionForm.patchValue({
      tipoProyecto: 'Ingeniería',
      titulo: ' Nuevo Proyecto '
    });
    fixture.componentInstance.aprobacionForm.markAsDirty();

    fixture.componentInstance.guardarBorrador();

    expect(spyBorrador).toHaveBeenCalled();
    expect(dtoEnviado).not.toBeNull();
    expect(dtoEnviado.estatus).toBeUndefined();
    expect(dtoEnviado.naturaleza).toBe('Venta');
    expect(dtoEnviado.cantidades).toBe('10 unidades');
    expect(dtoEnviado.faltaCantidad).toBeFalse();
    expect(dtoEnviado.faltaFotografia).toBeTrue();
    expect(dtoEnviado.tipoProyecto).toBe('Ingeniería');
    expect(dtoEnviado.titulo).toBe('Nuevo Proyecto');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.calificarForm.pristine).toBeTrue();
    expect(fixture.componentInstance.aprobacionForm.pristine).toBeTrue();
    expect(fixture.componentInstance.requerimiento.cantidades).toBe('10 unidades');
    expect(fixture.componentInstance.huboGuardado).toBeTrue();
  });

  it('Guardar_borrador_se_apaga_sin_permiso_o_si_esta_aprobado_o_no_viable', () => {
    // 1. Sin permiso
    abrir(false, { estatus: 'Pendiente' });
    let btns = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(btns.some(b => b.textContent?.includes('Guardar borrador'))).toBeFalse();

    // 2. Aprobado
    abrir(true, { estatus: 'Aprobado para cotización' });
    btns = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(btns.some(b => b.textContent?.includes('Guardar borrador'))).toBeFalse();

    // 3. No Viable
    abrir(true, { estatus: 'No Viable' });
    btns = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(btns.some(b => b.textContent?.includes('Guardar borrador'))).toBeFalse();

    // 4. Con permiso y pendiente -> visible
    abrir(true, { estatus: 'Pendiente' });
    btns = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(btns.some(b => b.textContent?.includes('Guardar borrador'))).toBeTrue();
  });

  it('Un_error_del_borrador_se_ve_y_conserva_lo_escrito', () => {
    let errorMostrado = '';
    spyOn(Swal, 'fire').and.callFake((arg1: any, arg2?: any) => {
      errorMostrado = typeof arg1 === 'string' ? `${arg1} ${arg2 || ''}` : (arg1?.text || arg1?.title);
      return Promise.resolve({ isConfirmed: false } as any);
    });
    const spyBorrador = jasmine.createSpy('guardarBorrador').and.returnValue(
      throwError(() => ({ error: { mensaje: 'Texto demasiado largo' } }))
    );
    abrir(true, { estatus: 'Pendiente' }, { guardarBorrador: spyBorrador });

    fixture.componentInstance.calificarForm.patchValue({ cantidades: 'Texto que debe conservarse' });
    fixture.componentInstance.calificarForm.markAsDirty();

    fixture.componentInstance.guardarBorrador();

    expect(errorMostrado).toContain('Texto demasiado largo');
    expect(fixture.componentInstance.calificarForm.get('cantidades')?.value).toBe('Texto que debe conservarse');
    expect(fixture.componentInstance.calificarForm.dirty).toBeTrue();
  });

  it('Cerrar_con_cambios_sin_guardar_pregunta_y_no_cierra_hasta_decidir', () => {
    let swalLlamado = false;
    let resolverSwal: any;
    spyOn(Swal, 'fire').and.callFake(() => {
      swalLlamado = true;
      return new Promise(resolve => { resolverSwal = resolve; }) as any;
    });

    abrir(true, { estatus: 'Pendiente' });
    fixture.componentInstance.calificarForm.patchValue({ cantidades: 'Nuevo valor' });
    fixture.componentInstance.calificarForm.markAsDirty();

    fixture.componentInstance.intentarCerrar();

    expect(swalLlamado).toBeTrue();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();

    resolverSwal({ isDismissed: true });
    expect(dialogRefSpy.close).not.toHaveBeenCalled();

    backdropSubject.next(null);
    expect(swalLlamado).toBeTrue();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();

    keydownSubject.next({ key: 'Escape', preventDefault: () => {} });
    expect(swalLlamado).toBeTrue();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('Descartar_cambios_cierra_sin_guardar', fakeAsync(() => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isDenied: true } as any));
    const spyBorrador = jasmine.createSpy('guardarBorrador');
    abrir(true, { estatus: 'Pendiente' }, { guardarBorrador: spyBorrador });

    fixture.componentInstance.calificarForm.markAsDirty();
    fixture.componentInstance.intentarCerrar();
    tick();

    expect(spyBorrador).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
  }));

  it('Cerrar_tras_haber_guardado_un_borrador_cierra_con_true_para_recargar_el_tablero', () => {
    abrir(true, { estatus: 'Pendiente' });
    fixture.componentInstance.huboGuardado = true;

    fixture.componentInstance.intentarCerrar();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('Guardar_borrador_desde_la_pregunta_guarda_y_cierra', fakeAsync(() => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    const spyBorrador = jasmine.createSpy('guardarBorrador').and.returnValue(of(null));
    abrir(true, { estatus: 'Pendiente' }, { guardarBorrador: spyBorrador });

    fixture.componentInstance.calificarForm.patchValue({ cantidades: 'Borrador' });
    fixture.componentInstance.calificarForm.markAsDirty();

    fixture.componentInstance.intentarCerrar();
    tick();

    expect(spyBorrador).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  }));

  it('Sin_cambios_cerrar_cierra_directo', () => {
    const swalSpy = spyOn(Swal, 'fire');
    abrir(true, { estatus: 'Pendiente' });

    fixture.componentInstance.intentarCerrar();

    expect(swalSpy).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
  });

  it('Aprobar_se_apaga_con_informacion_faltante_guardada_y_lista_lo_que_falta', () => {
    abrir(true, { estatus: 'Calificado Comercial', faltaPlano: true, faltaVisita: true });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.puedeAprobar).toBeFalse();
    expect(fixture.componentInstance.faltantesGuardados).toEqual(['Plano eléctrico', 'Visita / levantamiento previo']);
    const banner = fixture.nativeElement.querySelector('.banner-faltantes');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('Plano eléctrico, Visita / levantamiento previo');
  });

  it('Aprobar_se_apaga_si_hay_cambios_sin_guardar_y_lo_dice', () => {
    abrir(true, { estatus: 'Calificado Comercial' });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.puedeAprobar).toBeTrue();
    expect(fixture.nativeElement.querySelector('.banner-cambios-sin-guardar')).toBeNull();

    fixture.componentInstance.calificarForm.markAsDirty();
    fixture.detectChanges();

    expect(fixture.componentInstance.puedeAprobar).toBeFalse();
    const banner = fixture.nativeElement.querySelector('.banner-cambios-sin-guardar');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('Tienes cambios sin guardar');
  });

  it('La_aprobacion_ya_no_pide_solicitante_ni_dice_Datos_para_Ingenieria', () => {
    abrir(true, { estatus: 'Calificado Técnico' });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Datos para Ingeniería');
    expect(fixture.nativeElement.querySelector('mat-select[formControlName="solicitanteId"]')).toBeNull();
    expect(fixture.componentInstance.aprobacionForm.get('solicitanteId')).toBeNull();
  });

  it('Un_tecnico_pide_tipo_y_titulo_y_los_manda_al_aprobar_sin_solicitanteId', () => {
    spyOn(Swal, 'fire').and.callFake(() => ({
      then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
    } as any));
    const spyAprobar = jasmine.createSpy('aprobarRequerimiento').and.returnValue(
      of({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización', destino: 'ingenieria' })
    );
    abrir(true, { estatus: 'Calificado Técnico' }, { aprobarRequerimiento: spyAprobar });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#aprobacion-form')).not.toBeNull();

    fixture.componentInstance.aprobacionForm.patchValue({ tipoProyecto: 'Instalación', titulo: 'Tableros Principales' });
    fixture.componentInstance.aprobacionForm.markAsPristine();
    fixture.detectChanges();

    fixture.componentInstance.aprobar();

    expect(spyAprobar).toHaveBeenCalledOnceWith(8, { tipoProyecto: 'Instalación', titulo: 'Tableros Principales' });
  });

  it('Un_comercial_no_muestra_tipo_ni_titulo_dice_que_pasa_directo_a_cotizacion_y_aprueba_con_cuerpo_vacio', () => {
    spyOn(Swal, 'fire').and.callFake(() => ({
      then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
    } as any));
    const spyAprobar = jasmine.createSpy('aprobarRequerimiento').and.returnValue(
      of({ idSeguimiento: null, folio: 'REQ-2026-0008', estatus: 'Aprobado para cotización', destino: 'cotizacion' })
    );
    abrir(true, { estatus: 'Calificado Comercial' }, { aprobarRequerimiento: spyAprobar });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#aprobacion-form')).toBeNull();
    const bannerComercial = fixture.nativeElement.querySelector('.banner-comercial-directo');
    expect(bannerComercial).not.toBeNull();
    expect(bannerComercial.textContent).toContain('pasa directo a cotización; no se abre caso en Ingeniería');

    fixture.componentInstance.aprobar();

    expect(spyAprobar).toHaveBeenCalledOnceWith(8, {});
  });

  it('Aprobar_un_comercial_muestra_que_paso_directo_y_enlaza_a_Cotizaciones_sin_decir_undefined', () => {
    spyOn(Swal, 'fire').and.callFake(() => ({
      then: (resolve: any) => { resolve({ isConfirmed: true }); return Promise.resolve({ isConfirmed: true }); }
    } as any));
    const spyAprobar = jasmine.createSpy('aprobarRequerimiento').and.returnValue(
      of({ idSeguimiento: null, folio: 'REQ-2026-0008', estatus: 'Aprobado para cotización', destino: 'cotizacion' })
    );
    abrir(true, { estatus: 'Calificado Comercial' }, { aprobarRequerimiento: spyAprobar });
    pestana('Aprobación').click();
    fixture.detectChanges();

    fixture.componentInstance.aprobar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('#undefined');
    const enlace = fixture.nativeElement.querySelector('.enlace-cotizaciones') as HTMLAnchorElement;
    expect(enlace).not.toBeNull();
    expect(enlace.getAttribute('href')).toBe('#/dashboards/quote-products');
    expect(fixture.nativeElement.textContent).toContain('pasó directo a cotización y no requirió caso en Ingeniería');
  });

  it('El_resumen_muestra_al_contacto_como_solicitante', () => {
    abrir(true, { nombreContacto: 'Ing. Carlos Slim', empresa: 'Grupo Carso' });
    pestana('Aprobación').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.solicitanteResumen).toBe('Ing. Carlos Slim (Grupo Carso)');
    const resumen = fixture.nativeElement.querySelector('.resumen-solicitante');
    expect(resumen.textContent).toContain('Ing. Carlos Slim (Grupo Carso)');
  });
});
