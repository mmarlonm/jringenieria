import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, Subject } from 'rxjs';
import { FolioCotizacionComponent } from './folio-cotizacion.component';
import { QuotesService } from '../quotes-products.service';

describe('FolioCotizacionComponent', () => {
  let component: FolioCotizacionComponent;
  let fixture: ComponentFixture<FolioCotizacionComponent>;
  let quotesService: jasmine.SpyObj<QuotesService>;

  const q = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    quotesService = jasmine.createSpyObj<QuotesService>('QuotesService', ['agregarFolio']);

    await TestBed.configureTestingModule({
      imports: [FolioCotizacionComponent, NoopAnimationsModule],
      providers: [{ provide: QuotesService, useValue: quotesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(FolioCotizacionComponent);
    component = fixture.componentInstance;
    component.cotizacionProductosId = 311;
  });

  it('Con_folio_lo_muestra_y_no_ofrece_agregar', () => {
    component.folio = 'COT-1234';
    component.puedeAgregar = true;
    fixture.detectChanges();

    expect(q('folio-valor')?.textContent?.trim()).toBe('COT-1234');
    expect(q('btn-agregar-folio')).toBeNull();
  });

  it('Sin_folio_y_sin_permiso_muestra_Sin_folio_y_no_ofrece_agregar', () => {
    component.folio = null;
    component.puedeAgregar = false;
    fixture.detectChanges();

    expect(q('folio-sin-folio')?.textContent?.trim()).toBe('Sin folio');
    expect(q('btn-agregar-folio')).toBeNull();
  });

  it('Sin_folio_y_con_permiso_ofrece_el_boton_Agregar_folio', () => {
    component.folio = null;
    component.puedeAgregar = true;
    fixture.detectChanges();

    expect(q('folio-sin-folio')?.textContent?.trim()).toBe('Sin folio');
    const btn = q('btn-agregar-folio');
    expect(btn).not.toBeNull();
    expect(btn?.textContent?.trim()).toContain('Agregar folio');
  });

  it('Al_pulsar_Agregar_folio_aparece_el_campo_con_Guardar_y_Cancelar', () => {
    component.folio = null;
    component.puedeAgregar = true;
    fixture.detectChanges();

    const btn = q('btn-agregar-folio') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(q('formulario-agregar-folio')).not.toBeNull();
    expect(q('input-folio')).not.toBeNull();
    expect(q('btn-guardar')).not.toBeNull();
    expect(q('btn-cancelar')).not.toBeNull();
  });

  it('Guardar_esta_deshabilitado_con_folio_vacio_de_solo_espacios_largo_o_con_caracteres_de_control', () => {
    component.folio = null;
    component.puedeAgregar = true;
    component.abrirEdicion();
    fixture.detectChanges();

    const btnGuardar = q('btn-guardar') as HTMLButtonElement;

    // Vacío
    component.folioControl.setValue('');
    fixture.detectChanges();
    expect(component.folioControl.invalid).toBeTrue();
    expect(btnGuardar.disabled).toBeTrue();

    // Solo espacios
    component.folioControl.setValue('    ');
    fixture.detectChanges();
    expect(component.folioControl.invalid).toBeTrue();
    expect(btnGuardar.disabled).toBeTrue();

    // Más de 50 caracteres
    component.folioControl.setValue('A'.repeat(51));
    fixture.detectChanges();
    expect(component.folioControl.invalid).toBeTrue();
    expect(btnGuardar.disabled).toBeTrue();

    // Caracteres de control
    component.folioControl.setValue('COT\t1234');
    fixture.detectChanges();
    expect(component.folioControl.invalid).toBeTrue();
    expect(btnGuardar.disabled).toBeTrue();

    component.folioControl.setValue('COT\n1234');
    fixture.detectChanges();
    expect(component.folioControl.invalid).toBeTrue();
    expect(btnGuardar.disabled).toBeTrue();

    // Válido
    component.folioControl.setValue('COT-1234');
    fixture.detectChanges();
    expect(component.folioControl.valid).toBeTrue();
    expect(btnGuardar.disabled).toBeFalse();
  });

  it('Guardar_envia_el_folio_recortado_y_al_terminar_lo_muestra_y_emite_folioAgregado_y_oculta_el_boton', () => {
    quotesService.agregarFolio.and.returnValue(
      of({ cotizacionProductosId: 311, folioCotizacion: 'COT-1234' })
    );
    spyOn(component.folioAgregado, 'emit');

    component.folio = null;
    component.puedeAgregar = true;
    component.abrirEdicion();
    fixture.detectChanges();

    component.folioControl.setValue('   COT-1234   ');
    fixture.detectChanges();

    component.guardar();
    fixture.detectChanges();

    expect(quotesService.agregarFolio).toHaveBeenCalledWith(311, 'COT-1234');
    expect(component.folioAgregado.emit).toHaveBeenCalledWith('COT-1234');
    expect(component.folio).toBe('COT-1234');
    expect(component.editando).toBeFalse();
    expect(component.puedeAgregar).toBeFalse();
    expect(q('btn-agregar-folio')).toBeNull();
    expect(q('folio-valor')?.textContent?.trim()).toBe('COT-1234');
  });

  it('Un_409_o_400_muestra_el_mensaje_del_API_dentro_del_componente_y_conserva_lo_escrito', () => {
    quotesService.agregarFolio.and.returnValue(
      throwError(() => ({
        error: { mensaje: 'El folio COT-1234 ya está en la cotización COT-2026-0002.' }
      }))
    );

    component.folio = null;
    component.puedeAgregar = true;
    component.abrirEdicion();
    fixture.detectChanges();

    component.folioControl.setValue('COT-1234');
    fixture.detectChanges();

    component.guardar();
    fixture.detectChanges();

    expect(component.errorApi).toBe('El folio COT-1234 ya está en la cotización COT-2026-0002.');
    expect(component.folioControl.value).toBe('COT-1234');
    expect(q('error-api')?.textContent).toContain('El folio COT-1234 ya está en la cotización COT-2026-0002.');
    expect(component.editando).toBeTrue();
  });

  it('Mientras_guarda_no_permite_doble_envio', () => {
    const subject = new Subject<{ cotizacionProductosId: number; folioCotizacion: string }>();
    quotesService.agregarFolio.and.returnValue(subject.asObservable());

    component.folio = null;
    component.puedeAgregar = true;
    component.abrirEdicion();
    fixture.detectChanges();

    component.folioControl.setValue('COT-1234');
    fixture.detectChanges();

    component.guardar();
    fixture.detectChanges();

    expect(component.guardando).toBeTrue();
    const btnGuardar = q('btn-guardar') as HTMLButtonElement;
    expect(btnGuardar.disabled).toBeTrue();

    // Intentar segundo envío mientras el primero sigue en curso
    component.guardar();
    expect(quotesService.agregarFolio).toHaveBeenCalledTimes(1);

    // Resuelve el Observable
    subject.next({ cotizacionProductosId: 311, folioCotizacion: 'COT-1234' });
    subject.complete();
    fixture.detectChanges();

    expect(component.guardando).toBeFalse();
  });

  it('Cancelar_cierra_el_campo_sin_llamar_al_API', () => {
    component.folio = null;
    component.puedeAgregar = true;
    component.abrirEdicion();
    fixture.detectChanges();

    component.folioControl.setValue('COT-CANCELAR');
    fixture.detectChanges();

    const btnCancelar = q('btn-cancelar') as HTMLButtonElement;
    btnCancelar.click();
    fixture.detectChanges();

    expect(component.editando).toBeFalse();
    expect(q('formulario-agregar-folio')).toBeNull();
    expect(quotesService.agregarFolio).not.toHaveBeenCalled();
  });
});
