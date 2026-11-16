import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RequerimientoSgcComponent } from './requerimiento-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('RequerimientoSgcComponent', () => {
  let component: RequerimientoSgcComponent;
  let fixture: ComponentFixture<RequerimientoSgcComponent>;
  let mockQuotesService: any;

  beforeEach(async () => {
    mockQuotesService = {
      requerimientosDisponibles: jasmine.createSpy('requerimientosDisponibles').and.returnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [RequerimientoSgcComponent, NoopAnimationsModule],
      providers: [{ provide: QuotesService, useValue: mockQuotesService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RequerimientoSgcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('El_buscador_pide_requerimientos_con_debounce', fakeAsync(() => {
    mockQuotesService.requerimientosDisponibles.and.returnValue(
      of([
        { id: 1, folio: 'REQ-01', empresa: 'Empresa A', nombreContacto: 'Juan', estatus: 'Calificado Comercial' },
      ])
    );

    component.busquedaControl.setValue('REQ');
    tick(200);
    expect(mockQuotesService.requerimientosDisponibles).not.toHaveBeenCalled();

    tick(200); // 400ms reached
    expect(mockQuotesService.requerimientosDisponibles).toHaveBeenCalledWith('REQ');
    expect(component.opciones.length).toBe(1);
    expect(component.opciones[0].folio).toBe('REQ-01');
  }));

  it('Un_error_del_buscador_se_ve_con_Reintentar', fakeAsync(() => {
    mockQuotesService.requerimientosDisponibles.and.returnValue(throwError(() => new Error('Error de red')));

    component.busquedaControl.setValue('REQ-FAIL');
    tick(400);
    fixture.detectChanges();

    expect(component.errorBusqueda).toBeTrue();
    const alert = fixture.nativeElement.querySelector('.alerta-error-busqueda');
    expect(alert).toBeTruthy();

    // Now mock success and click Reintentar
    mockQuotesService.requerimientosDisponibles.and.returnValue(of([{ id: 2, folio: 'REQ-02' } as any]));
    const btnReintentar = fixture.nativeElement.querySelector('.btn-reintentar-busqueda');
    expect(btnReintentar).toBeTruthy();
    btnReintentar.click();
    tick(400);
    fixture.detectChanges();

    expect(component.errorBusqueda).toBeFalse();
    expect(component.opciones.length).toBe(1);
  }));

  it('Los_textos_del_requerimiento_se_muestran_escapados', () => {
    const xss = '<img src=x onerror=alert(1)>';
    component.requerimiento = {
      id: 1,
      folio: 'REQ-XSS',
      empresa: xss,
      nombreContacto: xss,
      estatus: 'Calificado Comercial',
      descripcion: xss,
      fechaCalificacion: new Date(),
    };
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img[src="x"]');
    expect(img).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(xss);
  });
});
