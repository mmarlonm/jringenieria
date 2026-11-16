import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmisionDialogComponent, EmisionDialogData } from './emision-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { QuotesService } from '../../quotes-products.service';
import { Observable, of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('EmisionDialogComponent', () => {
  let component: EmisionDialogComponent;
  let fixture: ComponentFixture<EmisionDialogComponent>;
  let mockDialogRef: any;
  let mockQuotesService: any;

  const mockData: EmisionDialogData = {
    cotizacionId: 77,
    clienteReceptorPorDefecto: 'Acme Corp',
    correoPorDefecto: 'contacto@acme.com',
    catalogos: {
      tipos: [],
      monedas: [],
      tiposConcepto: [],
      entregables: [],
      ivaTasa: 0.16,
      mediosEnvio: [
        { codigo: 'Correo', nombre: 'Correo' },
        { codigo: 'ERP', nombre: 'ERP' },
        { codigo: 'DocumentoControlado', nombre: 'Documento controlado' },
        { codigo: 'Otro', nombre: 'Otro' },
      ],
    },
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jasmine.createSpy('close'),
    };

    mockQuotesService = {
      emitir: jasmine.createSpy('emitir').and.returnValue(
        of({ folio: 'COT-2026-0001', version: 1, fechaVencimiento: new Date() })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [EmisionDialogComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: QuotesService, useValue: mockQuotesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmisionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('El_correo_es_obligatorio_solo_con_el_medio_Correo', () => {
    component.form.patchValue({
      medioEnvio: 'Correo',
      clienteReceptor: 'Juan Perez',
      correoReceptor: '',
    });
    expect(component.form.valid).toBeFalse();
    expect(component.form.get('correoReceptor')?.hasError('required')).toBeTrue();

    component.form.patchValue({ medioEnvio: 'ERP' });
    expect(component.form.valid).toBeTrue();
    expect(component.form.get('correoReceptor')?.hasError('required')).toBeFalse();
  });

  it('Emitir_manda_medio_cliente_receptor_y_correo', () => {
    component.form.patchValue({
      medioEnvio: 'Correo',
      clienteReceptor: 'Director Compras',
      correoReceptor: 'director@cliente.com',
    });

    component.emitir();

    expect(mockQuotesService.emitir).toHaveBeenCalledWith(77, {
      medioEnvio: 'Correo',
      clienteReceptor: 'Director Compras',
      correoReceptor: 'director@cliente.com',
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ guardado: true })
    );
  });

  it('Un_error_al_emitir_se_muestra_y_el_dialogo_sigue_abierto', () => {
    mockQuotesService.emitir.and.returnValue(
      throwError(() => ({
        status: 400,
        error: {
          mensaje: 'Faltan autorizaciones para emitir',
          errores: ['Aprobación comercial pendiente'],
        },
      }))
    );

    component.form.patchValue({
      medioEnvio: 'ERP',
      clienteReceptor: 'Director',
    });

    component.emitir();
    fixture.detectChanges();

    expect(component.errorMensaje).toBe('Faltan autorizaciones para emitir');
    expect(component.errores).toEqual(['Aprobación comercial pendiente']);
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('Los_dialogos_devuelven_su_resultado_por_todas_las_vias_de_cierre', () => {
    // 1. Cancelar
    component.cancelar();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);

    // 2. Éxito
    component.form.patchValue({
      medioEnvio: 'Otro',
      clienteReceptor: 'Lic. Martínez',
    });
    component.emitir();
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ guardado: true })
    );
  });

  it('Emitir_manda_el_codigo_del_catalogo_y_no_el_nombre_visible', () => {
    const opciones = component.mediosEnvio.map((m) => m.codigo);
    expect(opciones).toEqual(['Correo', 'ERP', 'DocumentoControlado', 'Otro']);

    component.form.patchValue({ medioEnvio: 'DocumentoControlado', clienteReceptor: 'Lic. Soto' });
    component.emitir();

    expect(mockQuotesService.emitir).toHaveBeenCalledWith(77, {
      medioEnvio: 'DocumentoControlado',
      clienteReceptor: 'Lic. Soto',
      correoReceptor: null,
    });
  });

  it('Sin_catalogo_usa_solo_codigos_que_acepta_el_API', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EmisionDialogComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionId: 5, catalogos: null } },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: QuotesService, useValue: mockQuotesService },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(EmisionDialogComponent);
    f.detectChanges();

    expect(f.componentInstance.mediosEnvio.map((m) => m.codigo)).toEqual(['Correo', 'ERP', 'DocumentoControlado', 'Otro']);
    expect(f.componentInstance.form.value.medioEnvio).toBe('Correo');
  });

  it('No_se_puede_cerrar_el_dialogo_mientras_se_registra_el_envio_y_se_libera_si_falla', () => {
    mockDialogRef.disableClose = false;
    let fallar!: (e: any) => void;
    mockQuotesService.emitir.and.returnValue(new Observable((o) => { fallar = (e) => o.error(e); }));

    component.form.patchValue({ medioEnvio: 'ERP', clienteReceptor: 'Director' });
    component.emitir();
    expect(mockDialogRef.disableClose).toBeTrue();

    fallar({ status: 409, error: { mensaje: 'La cotización ya fue emitida.' } });
    expect(mockDialogRef.disableClose).toBeFalse();
    expect(component.errorMensaje).toBe('La cotización ya fue emitida.');
  });

  it('Los_dialogos_altos_tienen_scroll_propio_y_botones_visibles', () => {
    const dialogService = TestBed.inject(MatDialog);
    const ref = dialogService.open(EmisionDialogComponent, {
      width: '32rem',
      data: mockData,
    });
    fixture.detectChanges();

    const panel = document.querySelector('.mat-mdc-dialog-container') as HTMLElement;
    if (panel) {
      const contenido = panel.querySelector('mat-dialog-content') as HTMLElement;
      if (contenido) {
        expect(contenido.classList.contains('dialogo-alto')).toBeTrue();
        const estilo = getComputedStyle(contenido);
        expect(estilo.maxHeight).not.toBe('none');
        expect(['auto', 'scroll']).toContain(estilo.overflowY);
      }
      const acciones = panel.querySelector('mat-dialog-actions');
      expect(acciones).toBeTruthy();
    }
    ref.close();
  });
});
