import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormArray, FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartidasSgcComponent } from './partidas-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import { CatalogosSgc } from '../../quotes-products.types';
import Swal from 'sweetalert2';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

describe('PartidasSgcComponent', () => {
  let component: PartidasSgcComponent;
  let fixture: ComponentFixture<PartidasSgcComponent>;
  let fb: FormBuilder;
  let mockQuotesService: any;
  let mockDialog: any;

  const mockCatalogos: CatalogosSgc = {
    tipos: [
      { codigo: 'CS', nombre: 'Comercial simple' },
      { codigo: 'CT', nombre: 'Técnico-comercial' },
      { codigo: 'CE', nombre: 'Estratégica' },
    ],
    monedas: [
      { codigo: 'MXN', nombre: 'Pesos Mexicanos' },
      { codigo: 'USD', nombre: 'Dólares Americanos' },
    ],
    tiposConcepto: [
      { codigo: 'Material', nombre: 'Material eléctrico' },
      { codigo: 'ManoDeObra', nombre: 'Mano de obra' },
    ],
    entregables: [],
    ivaTasa: 0.16,
  };

  beforeEach(async () => {
    mockQuotesService = {
      buscarExistencia: jasmine.createSpy('buscarExistencia').and.returnValue(
        of([
          {
            productoId: 101,
            codigoProducto: 'CBL-01',
            nombreProducto: 'Cable Calibre 12',
            unidadMedida: 'METRO',
            existencia: 100,
            existenciasDesglosadas: [{ almacen: 'Principal', cantidad: 100 }],
          },
        ])
      ),
      importarPorFolio: jasmine.createSpy('importarPorFolio').and.returnValue(of([])),
    };

    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () =>
          of({
            productoId: 50,
            nombreProducto: 'Tubo Conduit 1/2',
            codigoProducto: 'TUB-01',
            unidadMedida: 'PZA',
            cantidad: 10,
            precioUnitario: 45,
            descuento: 5,
          }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, NoopAnimationsModule, PartidasSgcComponent],
      providers: [
        FormBuilder,
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(PartidasSgcComponent);
    component = fixture.componentInstance;
    component.partidas = fb.array([]);
    component.tipo = 'CS';
    component.moneda = 'MXN';
    component.catalogos = mockCatalogos;
    component.heredadas = false;
    fixture.detectChanges();
  });

  it('Anadir_partida_agrega_una_fila_vacia_numerada', () => {
    expect(component.partidas.length).toBe(0);

    component.addPartida();
    expect(component.partidas.length).toBe(1);
    expect(component.partidas.at(0).get('partida')?.value).toBe(1);
    expect(component.partidas.at(0).get('cantidad')?.value).toBe(1);
    expect(component.partidas.at(0).get('unidad')?.value).toBe('PZA');

    component.addPartida();
    expect(component.partidas.length).toBe(2);
    expect(component.partidas.at(1).get('partida')?.value).toBe(2);
  });

  it('Eliminar_pide_confirmacion_y_renumera', fakeAsync(() => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));

    component.addPartida();
    component.addPartida();
    component.addPartida();
    expect(component.partidas.length).toBe(3);

    component.eliminarPartida(0);
    tick();

    expect(Swal.fire).toHaveBeenCalled();
    expect(component.partidas.length).toBe(2);
    expect(component.partidas.at(0).get('partida')?.value).toBe(1);
    expect(component.partidas.at(1).get('partida')?.value).toBe(2);
  }));

  it('La_columna_concepto_y_costo_solo_aparecen_en_CT_y_CE', () => {
    component.tipo = 'CS';
    component.addPartida();
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.col-concepto')).toBeNull();
    expect(compiled.querySelector('.col-costo')).toBeNull();

    component.tipo = 'CT';
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.col-concepto')).not.toBeNull();
    expect(compiled.querySelector('.col-costo')).not.toBeNull();

    component.tipo = 'CE';
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.col-concepto')).not.toBeNull();
    expect(compiled.querySelector('.col-costo')).not.toBeNull();
  });

  it('Escribir_dos_caracteres_busca_existencia_con_debounce', fakeAsync(() => {
    component.addPartida();
    fixture.detectChanges();

    const control = component.partidas.at(0).get('materialServicio');
    control?.setValue('ca');
    tick(200);
    expect(mockQuotesService.buscarExistencia).not.toHaveBeenCalled();

    tick(300); // 500 ms debounce
    expect(mockQuotesService.buscarExistencia).toHaveBeenCalledWith('ca');
  }));

  it('Elegir_una_opcion_llena_material_codigo_descripcion_y_unidad', () => {
    component.addPartida();
    const mockProduct = {
      productoId: 101,
      codigoProducto: 'CBL-01',
      nombreProducto: 'Cable Calibre 12',
      unidadMedida: 'METRO',
      existencia: 100,
    };

    component.onProductoSeleccionado(mockProduct, 0);

    const row = component.partidas.at(0);
    expect(row.get('materialServicio')?.value).toBe('Cable Calibre 12');
    expect(row.get('codigoProducto')?.value).toBe('CBL-01');
    expect(row.get('descripcion')?.value).toBe('CBL-01 - Cable Calibre 12');
    expect(row.get('unidad')?.value).toBe('METRO');
  });

  it('Sin_resultados_muestra_entrada_manual', fakeAsync(() => {
    mockQuotesService.buscarExistencia.and.returnValue(of([]));
    component.addPartida();
    fixture.detectChanges();

    const control = component.partidas.at(0).get('materialServicio');
    control?.setValue('Inexistente');
    tick(500);
    fixture.detectChanges();

    expect(component.entradasManuales[0]).toBe('Inexistente');
  }));

  it('Pegar_varias_lineas_reparte_en_filas_y_agrega_las_que_faltan', () => {
    component.addPartida();

    const clipboardEvent = {
      clipboardData: {
        getData: () => 'Material A\nMaterial B\nMaterial C',
      },
      preventDefault: jasmine.createSpy('preventDefault'),
    } as any;

    component.onPegarMateriales(clipboardEvent, 0, 'materialServicio');

    expect(clipboardEvent.preventDefault).toHaveBeenCalled();
    expect(component.partidas.length).toBe(3);
    expect(component.partidas.at(0).get('materialServicio')?.value).toBe('Material A');
    expect(component.partidas.at(1).get('materialServicio')?.value).toBe('Material B');
    expect(component.partidas.at(2).get('materialServicio')?.value).toBe('Material C');
  });

  it('El_importe_de_la_linea_y_el_pie_usan_el_calculo_compartido', () => {
    component.addPartida();
    component.partidas.at(0).patchValue({
      cantidad: 3,
      precioUnitario: 0.335,
      descuento: 0,
    });

    const imp = component.calcularImporteLinea(0);
    expect(imp).toBe(1.01);

    const totales = component.totales;
    expect(totales.subtotal).toBe(1.01);
    expect(totales.iva).toBe(0.16);
    expect(totales.total).toBe(1.17);
  });

  it('Catalogo_con_precio_agrega_la_partida_con_su_producto', () => {
    component.abrirCatalogoConPrecio();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(component.partidas.length).toBe(1);

    const row = component.partidas.at(0);
    expect(row.get('materialServicio')?.value).toBe('Tubo Conduit 1/2');
    expect(row.get('codigoProducto')?.value).toBe('TUB-01');
    expect(row.get('unidad')?.value).toBe('PZA');
    expect(row.get('productoId')?.value).toBe(50);
    expect(row.get('cantidad')?.value).toBe(10);
    expect(row.get('precioUnitario')?.value).toBe(45);
    expect(row.get('descuento')?.value).toBe(5);
  });

  it('El_banner_de_heredadas_solo_aparece_si_corresponde', () => {
    component.heredadas = false;
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.banner-heredadas')).toBeNull();

    component.heredadas = true;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.banner-heredadas')).not.toBeNull();
    expect(compiled.textContent).toContain(
      'Esta cotización viene de CONTPAQi. Al guardarla se copiarán sus partidas al ERP y los cambios posteriores en CONTPAQi ya no se reflejarán.'
    );
  });

  it('Una_unidad_desconocida_se_agrega_a_la_lista', () => {
    expect(component.unidadesDisponibles).not.toContain('TRAMO');

    component.addPartida();
    component.partidas.at(0).patchValue({ unidad: 'TRAMO' });
    component.asegurarUnidad('TRAMO');

    expect(component.unidadesDisponibles).toContain('TRAMO');
  });

  it('Un_error_de_busqueda_se_muestra_y_no_rompe_la_fila', fakeAsync(() => {
    mockQuotesService.buscarExistencia.and.returnValue(throwError(() => new Error('Error CONTPAQi')));

    component.addPartida();
    fixture.detectChanges();

    const control = component.partidas.at(0).get('materialServicio');
    control?.setValue('cable');
    tick(500);
    fixture.detectChanges();

    expect(component.errorBusqueda[0]).toBeTrue();
    // La fila sigue viva y usable
    expect(component.partidas.length).toBe(1);
    expect(control?.value).toBe('cable');
  }));
});
