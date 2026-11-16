import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { CierreDialogComponent, CierreDialogData } from './cierre-dialog.component';
import { QuotesService } from '../../quotes-products.service';
import { CierreResultado, CierreSgcDto } from '../../quotes-products.types';

describe('CierreDialogComponent', () => {
  let component: CierreDialogComponent;
  let fixture: ComponentFixture<CierreDialogComponent>;
  let quotesService: jasmine.SpyObj<QuotesService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CierreDialogComponent>>;

  const mockDialogData: CierreDialogData = {
    cotizacionId: 42,
    total: 25000,
    moneda: 'MXN',
    accionesCerrar: ['Ganada', 'Perdida', 'Cancelada', 'Vencida', 'CerradaSinRespuesta'],
    catalogos: {
      tipos: [],
      monedas: [],
      tiposConcepto: [],
      entregables: [],
      ivaTasa: 0.16,
      motivosCierre: [
        { codigo: 'Precio', nombre: 'Precio' },
        { codigo: 'Tiempo', nombre: 'Tiempo de entrega' },
        { codigo: 'Otro', nombre: 'Otro' },
      ],
      tiposEvidencia: [
        { codigo: 'OrdenCompra', nombre: 'Orden de compra' },
        { codigo: 'CorreoAceptacion', nombre: 'Correo de aceptación' },
      ],
    },
  };

  beforeEach(async () => {
    const quotesSpy = jasmine.createSpyObj('QuotesService', ['cerrar']);
    const dialogSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        CierreDialogComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: QuotesService, useValue: quotesSpy },
        { provide: MatDialogRef, useValue: dialogSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    }).compileComponents();

    quotesService = TestBed.inject(QuotesService) as jasmine.SpyObj<QuotesService>;
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<CierreDialogComponent>>;

    quotesService.cerrar.and.returnValue(
      of({ etapa: 'Ganada', fechaCierre: '2026-11-16T18:00:00Z' })
    );

    fixture = TestBed.createComponent(CierreDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('El_dialogo_solo_ofrece_los_resultados_permitidos', () => {
    // Si accionesCerrar solo permite Perdida y Cancelada
    component.data.accionesCerrar = ['Perdida', 'Cancelada'];
    fixture.detectChanges();

    const disponibles = component.resultadosDisponibles.map((r) => r.codigo);
    expect(disponibles).toEqual(['Perdida', 'Cancelada']);
    expect(disponibles).not.toContain('Ganada');
    expect(disponibles).not.toContain('Vencida');
  });

  it('Ganada_pide_evidencia_referencia_y_monto_precargado', () => {
    // Al seleccionar Ganada, montoVendido está precargado con el total de la cotización
    component.form.patchValue({ resultado: 'Ganada' });
    component.actualizarValidadoresPorResultado('Ganada');
    fixture.detectChanges();

    expect(component.form.get('montoVendido')?.value).toBe(component.data.total);

    // Evidencia, referencia y monto son obligatorios
    component.form.patchValue({
      tipoEvidencia: null,
      referenciaEvidencia: '',
      montoVendido: null,
    });
    expect(component.form.get('tipoEvidencia')?.hasError('required')).toBeTrue();
    expect(component.form.get('referenciaEvidencia')?.hasError('required')).toBeTrue();
    expect(component.form.get('montoVendido')?.hasError('required')).toBeTrue();

    // Con valores válidos
    component.form.patchValue({
      tipoEvidencia: 'OrdenCompra',
      referenciaEvidencia: 'OC-98765',
      montoVendido: 25000,
    });
    expect(component.form.valid).toBeTrue();
  });

  it('Perdida_pide_motivo_y_Otro_exige_comentario', () => {
    component.form.patchValue({
      resultado: 'Perdida',
      motivo: 'Precio',
      comentario: '',
    });
    component.actualizarValidadoresPorResultado('Perdida');
    fixture.detectChanges();

    // Con motivo 'Precio', comentario es opcional
    expect(component.form.valid).toBeTrue();

    // Si cambia motivo a 'Otro', comentario es obligatorio de al menos 5 caracteres
    component.form.patchValue({ motivo: 'Otro', comentario: '' });
    component.actualizarValidadorComentario('Otro');
    fixture.detectChanges();

    expect(component.form.get('comentario')?.hasError('required')).toBeTrue();
    expect(component.form.valid).toBeFalse();

    // Comentario con menos de 5 caracteres
    component.form.patchValue({ comentario: 'abc' });
    expect(component.form.get('comentario')?.hasError('minlength')).toBeTrue();
    expect(component.form.valid).toBeFalse();

    // Comentario válido
    component.form.patchValue({ comentario: 'Comentario explicativo suficiente' });
    expect(component.form.valid).toBeTrue();
  });

  it('Vencida_no_exige_motivo', () => {
    component.form.patchValue({
      resultado: 'Vencida',
      motivo: null,
      comentario: null,
    });
    component.actualizarValidadoresPorResultado('Vencida');
    fixture.detectChanges();

    expect(component.form.get('motivo')?.hasError('required')).toBeFalsy();
    expect(component.form.valid).toBeTrue();
  });

  it('Cerrar_pide_confirmacion_con_texto_fijo', () => {
    component.form.patchValue({
      resultado: 'Ganada',
      tipoEvidencia: 'OrdenCompra',
      referenciaEvidencia: 'OC-1111',
      montoVendido: 25000,
    });
    component.actualizarValidadoresPorResultado('Ganada');
    fixture.detectChanges();

    // Antes de confirmar
    expect(component.confirmando).toBeFalse();

    component.solicitarConfirmacion();
    fixture.detectChanges();

    expect(component.confirmando).toBeTrue();
    const texto = fixture.nativeElement.querySelector('.texto-confirmacion')?.textContent;
    expect(texto).toContain('¿Está seguro de cerrar definitivamente la cotización?');

    // No se llama al servicio hasta que se confirme expresamente
    expect(quotesService.cerrar).not.toHaveBeenCalled();
  });

  it('Un_error_del_API_se_muestra_y_el_dialogo_sigue_abierto', () => {
    component.form.patchValue({
      resultado: 'Perdida',
      motivo: 'Competencia',
      comentario: 'Ganó el competidor local',
    });
    component.actualizarValidadoresPorResultado('Perdida');

    quotesService.cerrar.and.returnValue(
      throwError(() => ({
        error: { mensaje: 'La cotización ya está cerrada o aún no se emite.' },
      }))
    );

    component.ejecutarCierre();
    fixture.detectChanges();

    expect(component.errorMensaje).toBe('La cotización ya está cerrada o aún no se emite.');
    const mensajeError = fixture.nativeElement.querySelector('.mensaje-error');
    expect(mensajeError).not.toBeNull();
    expect(mensajeError.textContent).toContain('La cotización ya está cerrada o aún no se emite.');

    // El diálogo NO se cierra
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.guardando).toBeFalse();
  });

  it('El_dialogo_devuelve_el_resultado_por_todas_las_vias_de_cierre', () => {
    const vias: string[] = ['Ganada', 'Perdida', 'Cancelada', 'Vencida', 'CerradaSinRespuesta'];

    for (const via of vias) {
      dialogRef.close.calls.reset();
      quotesService.cerrar.calls.reset();

      // Copiado de CierreResultadoDto del API C# (CotizacionSgcDtos.cs)
      const mockResultado: CierreResultado = {
        etapa: via,
        fechaCierre: '2026-11-16T19:00:00Z',
      };
      quotesService.cerrar.and.returnValue(of(mockResultado));

      component.form.patchValue({
        resultado: via,
        tipoEvidencia: via === 'Ganada' ? 'OrdenCompra' : null,
        referenciaEvidencia: via === 'Ganada' ? 'OC-123' : null,
        montoVendido: via === 'Ganada' ? 25000 : null,
        motivo: via === 'Perdida' || via === 'Cancelada' ? 'Precio' : null,
      });
      component.actualizarValidadoresPorResultado(via);

      component.ejecutarCierre();

      expect(dialogRef.close).toHaveBeenCalledWith({
        guardado: true,
        resultado: via,
        fechaCierre: '2026-11-16T19:00:00Z',
      });
    }
  });

  it('El_dialogo_alto_tiene_scroll_propio_y_botones_visibles', () => {
    const content = fixture.nativeElement.querySelector('mat-dialog-content');
    expect(content).not.toBeNull();
    expect(content.classList.contains('dialogo-alto')).toBeTrue();

    const actions = fixture.nativeElement.querySelector('mat-dialog-actions');
    expect(actions).not.toBeNull();
    expect(actions.classList.contains('botones-accion')).toBeTrue();
  });

  it('Los_textos_del_API_se_muestran_escapados', () => {
    // Texto con intento de inyección de script procedente del API
    const xss = '<script id="xss-test">window.__xss = true;</script>';
    component.errorMensaje = xss;
    fixture.detectChanges();

    const scriptElement = fixture.nativeElement.querySelector('#xss-test');
    expect(scriptElement).toBeNull();

    const compiled = fixture.nativeElement.querySelector('.mensaje-error');
    expect(compiled.textContent).toContain('<script id="xss-test">window.__xss = true;</script>');
  });
});
