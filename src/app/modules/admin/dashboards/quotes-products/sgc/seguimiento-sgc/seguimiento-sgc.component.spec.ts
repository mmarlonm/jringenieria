import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, Subject } from 'rxjs';
import { SeguimientoSgcComponent } from './seguimiento-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import {
  AccionesSgc,
  CatalogosSgc,
  RegistrarSeguimientoDto,
  ResumenSeguimiento,
  SeguimientoItemSgc
} from '../../quotes-products.types';

describe('SeguimientoSgcComponent', () => {
  let component: SeguimientoSgcComponent;
  let fixture: ComponentFixture<SeguimientoSgcComponent>;
  let quotesService: jasmine.SpyObj<QuotesService>;

  beforeEach(async () => {
    const quotesServiceSpy = jasmine.createSpyObj('QuotesService', [
      'seguimientos',
      'registrarSeguimiento',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        SeguimientoSgcComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: QuotesService, useValue: quotesServiceSpy },
      ],
    }).compileComponents();

    quotesService = TestBed.inject(QuotesService) as jasmine.SpyObj<QuotesService>;
    quotesService.seguimientos.and.returnValue(of([]));
    quotesService.registrarSeguimiento.and.returnValue(of({ id: 1, etapa: 'EnSeguimiento' }));

    fixture = TestBed.createComponent(SeguimientoSgcComponent);
    component = fixture.componentInstance;
    component.cotizacionId = 42;
    component.etapa = 'Emitida';
    component.acciones = {
      editar: false,
      enviarRevision: false,
      volverBorrador: false,
      revisar: [],
      emitir: false,
      nuevaVersion: true,
      seguimiento: true,
      cerrar: ['Ganada', 'Perdida'],
    };
    fixture.detectChanges();
  });

  it('El_formulario_solo_aparece_si_acciones_seguimiento', () => {
    // Si acciones.seguimiento es true -> el formulario debe estar presente
    component.acciones = { ...component.acciones, seguimiento: true };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.formulario-seguimiento')).not.toBeNull();

    // Si acciones.seguimiento es false -> el formulario desaparece
    component.acciones = { ...component.acciones, seguimiento: false };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.formulario-seguimiento')).toBeNull();
  });

  it('Guardar_manda_tipo_notas_proxima_accion_fecha_y_probabilidad', () => {
    // Copiado de RegistrarSeguimientoDto del API C# (CotizacionSgcDtos.cs)
    const dtoEsperado: RegistrarSeguimientoDto = {
      tipo: 'RespuestaCliente',
      notas: 'Cliente solicitó ajuste de condiciones',
      proximaAccion: 'Enviar propuesta ajustada',
      fechaProximaAccion: component.hoy,
      probabilidadPorcentaje: 75,
    };

    component.form.patchValue({
      tipo: dtoEsperado.tipo,
      notas: dtoEsperado.notas,
      proximaAccion: dtoEsperado.proximaAccion,
      fechaProximaAccion: dtoEsperado.fechaProximaAccion,
      probabilidadPorcentaje: dtoEsperado.probabilidadPorcentaje,
    });

    component.guardarSeguimiento();

    expect(quotesService.registrarSeguimiento).toHaveBeenCalledWith(42, dtoEsperado);
  });

  it('La_fecha_de_proxima_accion_no_permite_dias_pasados', () => {
    // Si se asigna una fecha pasada en el control
    component.form.get('fechaProximaAccion')?.setValue('2020-01-01');
    component.form.get('notas')?.setValue('Notas válidas');

    expect(component.form.get('fechaProximaAccion')?.hasError('fechaPasada')).toBeTrue();
    expect(component.form.valid).toBeFalse();

    // Comprobar que en el template el atributo min es la fecha de hoy
    fixture.detectChanges();
    const inputFecha = fixture.nativeElement.querySelector('input[type="date"]');
    expect(inputFecha.getAttribute('min')).toBe(component.hoy);
  });

  it('El_resumen_dice_cuantos_dias_faltan_o_pasaron_del_vencimiento', () => {
    // Copiado de SeguimientoResumenDto del API C# (CotizacionSgcDtos.cs)
    // Caso 1: Faltan días para vencer
    component.seguimiento = {
      total: 1,
      ultimaFecha: '2026-11-16T12:00:00Z',
      proximaAccion: 'Llamar',
      fechaProximaAccion: '2026-11-20',
      atrasado: false,
      vencida: false,
      diasParaVencer: 5,
    };
    fixture.detectChanges();
    const textoVigente = fixture.nativeElement.querySelector('.vencimiento-texto').textContent;
    expect(textoVigente).toContain('Vence en 5 días');

    // Caso 2: Ya venció
    component.seguimiento = {
      total: 1,
      ultimaFecha: '2026-11-10T12:00:00Z',
      proximaAccion: null,
      fechaProximaAccion: null,
      atrasado: true,
      vencida: true,
      diasParaVencer: -3,
    };
    fixture.detectChanges();
    const textoVencido = fixture.nativeElement.querySelector('.vencimiento-texto').textContent;
    expect(textoVencido).toContain('Venció hace 3 días');
  });

  it('Se_muestra_el_aviso_de_atraso', () => {
    // Sin atraso
    component.seguimiento = {
      total: 1,
      atrasado: false,
      vencida: false,
      diasParaVencer: 5,
    };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso-atraso')).toBeNull();

    // Con atraso
    component.seguimiento = {
      total: 1,
      atrasado: true,
      vencida: false,
      diasParaVencer: 5,
    };
    fixture.detectChanges();
    const aviso = fixture.nativeElement.querySelector('.aviso-atraso');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('Seguimiento atrasado');
  });

  it('La_bitacora_se_muestra_de_la_mas_reciente_y_escapada', () => {
    // Copiado de SeguimientoItemDto del API C# (CotizacionSgcDtos.cs)
    const items: SeguimientoItemSgc[] = [
      {
        id: 2,
        version: 1,
        fecha: '2026-11-16T14:30:00Z',
        usuarioId: 5,
        usuarioNombre: 'Vendedor Principal',
        tipo: 'RespuestaCliente',
        notas: '<script>alert("xss")</script>Seguimiento reciente de hoy',
        proximaAccion: 'Confirmar pedido',
        fechaProximaAccion: '2026-11-18',
      },
      {
        id: 1,
        version: 1,
        fecha: '2026-11-14T09:00:00Z',
        usuarioId: 5,
        usuarioNombre: 'Vendedor Principal',
        tipo: 'PrimerSeguimiento',
        notas: 'Primer contacto con el cliente',
        proximaAccion: 'Esperar respuesta',
        fechaProximaAccion: '2026-11-16',
      },
    ];

    quotesService.seguimientos.and.returnValue(of(items));
    component.cargarBitacora();
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.bitacora-item');
    expect(filas.length).toBe(2);

    // Más reciente primero
    expect(filas[0].textContent).toContain('Seguimiento reciente de hoy');
    // Escapada contra XSS (sin elemento script inyectado)
    expect(filas[0].querySelector('script')).toBeNull();
    // Segunda fila
    expect(filas[1].textContent).toContain('Primer contacto con el cliente');
  });

  it('Un_error_se_muestra_y_no_borra_lo_capturado', () => {
    component.form.patchValue({
      tipo: 'Ajuste',
      notas: 'Captura importante que no debe borrarse',
      proximaAccion: 'Ajustar precios',
      fechaProximaAccion: '2026-11-28',
      probabilidadPorcentaje: 50,
    });

    quotesService.registrarSeguimiento.and.returnValue(
      throwError(() => ({
        error: {
          mensaje: 'La cotización cambió mientras se editaba. Recargue e intente de nuevo.',
        },
      }))
    );

    component.guardarSeguimiento();
    fixture.detectChanges();

    // El mensaje de error se muestra en pantalla
    expect(component.errorMensaje).toContain('La cotización cambió mientras se editaba');
    const alertaError = fixture.nativeElement.querySelector('.mensaje-error');
    expect(alertaError).not.toBeNull();
    expect(alertaError.textContent).toContain('La cotización cambió mientras se editaba');

    // No borra lo capturado
    expect(component.form.value.notas).toBe('Captura importante que no debe borrarse');
    expect(component.form.value.tipo).toBe('Ajuste');
    expect(component.form.value.proximaAccion).toBe('Ajustar precios');
    expect(component.form.value.probabilidadPorcentaje).toBe(50);
    expect(component.guardando).toBeFalse();
  });

  it('El_boton_no_se_repite_con_doble_clic', () => {
    component.form.patchValue({
      tipo: 'PrimerSeguimiento',
      notas: 'Notas válidas',
    });

    const pendingSubject = new Subject<{ id: number; etapa: string }>();
    quotesService.registrarSeguimiento.and.returnValue(pendingSubject.asObservable());

    // Primer clic
    component.guardarSeguimiento();
    expect(component.guardando).toBeTrue();
    expect(quotesService.registrarSeguimiento).toHaveBeenCalledTimes(1);

    // Segundo clic mientras está guardando
    component.guardarSeguimiento();
    expect(quotesService.registrarSeguimiento).toHaveBeenCalledTimes(1);

    // Termina la petición
    pendingSubject.next({ id: 1, etapa: 'EnSeguimiento' });
    pendingSubject.complete();
    expect(component.guardando).toBeFalse();
  });

  // ---- Revision de Claude (Fase 3, front) ----
  it('Un_409_muestra_el_mensaje_y_pide_recargar_la_cotizacion', () => {
    // El API responde 409 { mensaje } si la cotizacion cambio (cerrada, nueva version, otra persona)
    component.form.patchValue({ tipo: 'Ajuste', notas: 'Captura que no debe perderse' });
    quotesService.registrarSeguimiento.and.returnValue(
      throwError(() => ({ status: 409, error: { mensaje: 'La cotización está cerrada.' } }))
    );
    const recargar = jasmine.createSpy('recargar');
    component.recargar.subscribe(recargar);

    component.guardarSeguimiento();
    fixture.detectChanges();

    expect(component.errorMensaje).toBe('La cotización está cerrada.');
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(component.form.value.notas).toBe('Captura que no debe perderse');
  });

  it('Un_400_muestra_el_mensaje_y_no_recarga_la_cotizacion', () => {
    component.form.patchValue({ tipo: 'Ajuste', notas: 'Notas válidas' });
    quotesService.registrarSeguimiento.and.returnValue(
      throwError(() => ({ status: 400, error: { mensaje: 'Las notas son obligatorias.' } }))
    );
    const recargar = jasmine.createSpy('recargar');
    component.recargar.subscribe(recargar);

    component.guardarSeguimiento();

    expect(component.errorMensaje).toBe('Las notas son obligatorias.');
    expect(recargar).not.toHaveBeenCalled();
  });

  it('El_mensaje_de_error_se_ve_aunque_la_cotizacion_ya_no_permita_seguimientos', () => {
    component.form.patchValue({ tipo: 'Ajuste', notas: 'Notas válidas' });
    quotesService.registrarSeguimiento.and.returnValue(
      throwError(() => ({ status: 409, error: { mensaje: 'La cotización ya está cerrada.' } }))
    );
    component.guardarSeguimiento();

    // La recarga trae acciones.seguimiento = false (la cotizacion se cerro): el formulario desaparece
    component.acciones = { ...component.acciones, seguimiento: false };
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.formulario-seguimiento')).toBeNull();
    const aviso = fixture.nativeElement.querySelector('.mensaje-error');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('La cotización ya está cerrada.');
  });

  it('Tras_guardar_recarga_la_bitacora_y_la_cotizacion_una_sola_vez', () => {
    component.form.patchValue({ tipo: 'PrimerSeguimiento', notas: 'Notas válidas' });
    quotesService.seguimientos.calls.reset();
    const recargar = jasmine.createSpy('recargar');
    component.recargar.subscribe(recargar);

    component.guardarSeguimiento();

    expect(quotesService.registrarSeguimiento).toHaveBeenCalledTimes(1);
    expect(quotesService.seguimientos).toHaveBeenCalledTimes(1);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('Un_error_al_cargar_la_bitacora_se_ve_y_no_dice_que_no_hay_seguimientos', () => {
    quotesService.seguimientos.and.returnValue(
      throwError(() => ({ status: 500, error: { mensaje: 'Error interno.' } }))
    );
    component.cargarBitacora();
    fixture.detectChanges();

    const aviso = fixture.nativeElement.querySelector('.error-bitacora');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('No se pudo cargar la bitácora de seguimiento.');
    expect(fixture.nativeElement.querySelector('.sin-seguimientos')).toBeNull();

    // Reintentar vuelve a pedirla y, si llega, el aviso desaparece
    quotesService.seguimientos.and.returnValue(of([]));
    fixture.nativeElement.querySelector('.btn-reintentar-bitacora').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-bitacora')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sin-seguimientos')).not.toBeNull();
  });
});
