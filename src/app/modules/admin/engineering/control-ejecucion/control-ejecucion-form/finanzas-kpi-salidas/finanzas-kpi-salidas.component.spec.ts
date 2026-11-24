import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { FinanzasKpiSalidasComponent } from './finanzas-kpi-salidas.component';

describe('FinanzasKpiSalidasComponent', () => {
  let fixture: ComponentFixture<FinanzasKpiSalidasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FinanzasKpiSalidasComponent, MatIconTestingModule] });
    fixture = TestBed.createComponent(FinanzasKpiSalidasComponent);
  });

  function pintar(salidas: { folio: string; total?: number | null }[] | null, error = false): void {
    fixture.componentRef.setInput('salidas', salidas);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }
  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  const texto = (testid: string): string => (q(testid)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  // Con la configuración regional de las pruebas el peso sale como «MX$»; en la app es «$»: se compara sin ese prefijo.
  const moneda = (testid: string): string => texto(testid).replace(/^MX/, '');

  it('Finanzas_suma_el_total_de_las_salidas_registradas', () => {
    pintar([{ folio: 'S-1', total: 1200.5 }, { folio: 'S-2', total: 800 }, { folio: 'S-3', total: 99.5 }]);
    expect(moneda('valor-salidas')).toBe('$2,100.00');
  });

  it('Muestra_cuantos_folios_se_sumaron_en_singular_y_plural', () => {
    pintar([{ folio: 'S-1', total: 10 }]);
    expect(texto('folios-salidas')).toBe('1 folio vinculado');

    pintar([{ folio: 'S-1', total: 10 }, { folio: 'S-2', total: 20 }]);
    expect(texto('folios-salidas')).toBe('2 folios vinculados');
  });

  it('Un_folio_sin_total_cuenta_cero_y_avisa', () => {
    pintar([{ folio: 'S-1', total: 500 }, { folio: 'S-2' }, { folio: 'S-3', total: null }]);

    expect(moneda('valor-salidas')).toBe('$500.00');
    expect(texto('aviso-sin-total')).toBe('2 folios sin total (cuentan como $0)');
  });

  it('Un_solo_folio_sin_total_usa_el_singular', () => {
    pintar([{ folio: 'S-1', total: 500 }, { folio: 'S-2', total: null }]);
    expect(texto('aviso-sin-total')).toBe('1 folio sin total (cuenta como $0)');
  });

  it('Un_total_en_cero_NO_es_un_folio_sin_total', () => {
    pintar([{ folio: 'S-1', total: 0 }]);
    expect(q('aviso-sin-total')).toBeNull();
    expect(moneda('valor-salidas')).toBe('$0.00');
  });

  it('Sin_salidas_muestra_cero_y_el_mensaje', () => {
    pintar([]);
    expect(moneda('valor-salidas')).toBe('$0.00');
    expect(texto('folios-salidas')).toBe('Sin salidas registradas');
    expect(q('aviso-sin-total')).toBeNull();
  });

  it('Una_lista_nula_no_rompe_y_se_ve_como_sin_salidas', () => {
    pintar(null);
    expect(moneda('valor-salidas')).toBe('$0.00');
  });

  it('Si_la_carga_fallo_se_ve_el_aviso_y_no_un_cero_enganoso', () => {
    pintar([], true);
    expect(texto('error-salidas')).toBe('No se pudieron cargar las salidas de almacén.');
    expect(q('valor-salidas')).toBeNull();
  });

  it('Se_recalcula_al_cambiar_la_lista', () => {
    pintar([{ folio: 'S-1', total: 100 }]);
    pintar([{ folio: 'S-1', total: 100 }, { folio: 'S-2', total: 50 }]);
    expect(moneda('valor-salidas')).toBe('$150.00');
  });
});
