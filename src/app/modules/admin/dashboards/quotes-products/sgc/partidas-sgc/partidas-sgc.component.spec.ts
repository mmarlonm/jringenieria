import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormArray, FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PartidasSgcComponent } from './partidas-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import { CatalogosSgc } from '../../quotes-products.types';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { LectorPdfMateriales } from 'app/shared/materiales/lector-pdf-materiales';
import { ImportarMaterialesDialogComponent } from 'app/modules/admin/administration/solicitudes-compra/form/importar-materiales-dialog/importar-materiales-dialog.component';
import { ContpaqiMaterialDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';
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
  let mockChatService: any;

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

    mockChatService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showError: jasmine.createSpy('showError'),
      showWarning: jasmine.createSpy('showWarning'),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, NoopAnimationsModule, PartidasSgcComponent],
      providers: [
        FormBuilder,
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ChatNotificationService, useValue: mockChatService },
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

  it('Importar_por_folio_abre_el_dialogo_con_lo_encontrado', () => {
    const fakeMateriales: ContpaqiMaterialDto[] = [
      {
        materialServicio: 'Cable Calibre 10',
        descripcion: 'Cable de cobre uso rudo',
        codigoProducto: 'CAB-10',
        unidad: 'M',
        cantidad: 50,
        costoUnitario: 25.5,
        iva: 0,
        total: 0,
      },
    ];
    mockQuotesService.importarPorFolio.and.returnValue(of(fakeMateriales));
    component.folioContpaqi = 'FOL-001';

    component.importarPorFolio();

    expect(mockQuotesService.importarPorFolio).toHaveBeenCalledWith('FOL-001');
    expect(mockDialog.open).toHaveBeenCalledWith(ImportarMaterialesDialogComponent, {
      data: { materiales: fakeMateriales, folio: 'FOL-001' },
      width: '1000px',
      disableClose: true,
    });
  });

  it('Sin_folio_avisa_y_no_llama_al_servicio', () => {
    component.folioContpaqi = '   ';
    component.importarPorFolio();

    expect(mockQuotesService.importarPorFolio).not.toHaveBeenCalled();
    expect(mockChatService.showWarning).toHaveBeenCalled();
  });

  it('Sin_resultados_avisa_y_no_abre_el_dialogo', () => {
    mockQuotesService.importarPorFolio.and.returnValue(of([]));
    component.folioContpaqi = 'FOL-VACIO';

    component.importarPorFolio();

    expect(mockQuotesService.importarPorFolio).toHaveBeenCalledWith('FOL-VACIO');
    expect(mockDialog.open).not.toHaveBeenCalled();
    expect(mockChatService.showWarning).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.stringMatching(/No se encontraron materiales para el folio ingresado/)
    );
  });

  it('Un_error_del_API_al_importar_se_muestra', () => {
    mockQuotesService.importarPorFolio.and.returnValue(
      throwError(() => ({ error: { mensaje: 'Error al consultar CONTPAQi' } }))
    );
    component.folioContpaqi = 'FOL-ERR';

    component.importarPorFolio();

    expect(mockChatService.showError).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.stringMatching(/Error al consultar CONTPAQi/)
    );
  });

  it('Agregar_al_final_conserva_las_partidas_existentes', fakeAsync(() => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));

    component.addPartida({ materialServicio: 'Partida Inicial' });
    expect(component.partidas.length).toBe(1);

    const importados: ContpaqiMaterialDto[] = [
      { materialServicio: 'Importado 1', descripcion: 'D1', unidad: 'PZA', cantidad: 2, costoUnitario: 10, iva: 0, total: 0 },
      { materialServicio: 'Importado 2', descripcion: 'D2', unidad: 'PZA', cantidad: 3, costoUnitario: 20, iva: 0, total: 0 },
    ];

    component.procesarMaterialesImportados(importados);
    tick();

    expect(component.partidas.length).toBe(3);
    expect(component.partidas.at(0).get('materialServicio')?.value).toBe('Partida Inicial');
    expect(component.partidas.at(0).get('partida')?.value).toBe(1);
    expect(component.partidas.at(1).get('materialServicio')?.value).toBe('Importado 1');
    expect(component.partidas.at(1).get('partida')?.value).toBe(2);
    expect(component.partidas.at(2).get('materialServicio')?.value).toBe('Importado 2');
    expect(component.partidas.at(2).get('partida')?.value).toBe(3);
  }));

  it('Sobrescribir_reemplaza_las_partidas', fakeAsync(() => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isDenied: true } as any));

    component.addPartida({ materialServicio: 'Partida Inicial' });
    expect(component.partidas.length).toBe(1);

    const importados: ContpaqiMaterialDto[] = [
      { materialServicio: 'Nuevo 1', descripcion: 'D1', unidad: 'PZA', cantidad: 2, costoUnitario: 15, iva: 0, total: 0 },
    ];

    component.procesarMaterialesImportados(importados);
    tick();

    expect(component.partidas.length).toBe(1);
    expect(component.partidas.at(0).get('materialServicio')?.value).toBe('Nuevo 1');
    expect(component.partidas.at(0).get('partida')?.value).toBe(1);
  }));

  it('Cancelar_no_cambia_nada', fakeAsync(() => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isDismissed: true } as any));

    component.addPartida({ materialServicio: 'Partida Inicial' });
    expect(component.partidas.length).toBe(1);

    const importados: ContpaqiMaterialDto[] = [
      { materialServicio: 'Nuevo 1', descripcion: 'D1', unidad: 'PZA', cantidad: 2, costoUnitario: 15, iva: 0, total: 0 },
    ];

    component.procesarMaterialesImportados(importados);
    tick();

    expect(component.partidas.length).toBe(1);
    expect(component.partidas.at(0).get('materialServicio')?.value).toBe('Partida Inicial');
  }));

  it('El_costo_importado_cae_en_precio_unitario', () => {
    const importados: ContpaqiMaterialDto[] = [
      {
        materialServicio: 'Cople 1 pulgada',
        descripcion: 'Cople galvanizado',
        codigoProducto: 'COP-01',
        unidad: 'PZA',
        cantidad: 10,
        costoUnitario: 45.75,
        iva: 0,
        total: 0,
      },
    ];

    component.insertarMateriales(importados, true);

    expect(component.partidas.length).toBe(1);
    const partida = component.partidas.at(0);
    expect(partida.get('precioUnitario')?.value).toBe(45.75);
    expect(partida.get('descuento')?.value).toBe(0);
    expect(partida.get('tipoConcepto')?.value).toBe('Material');
  });

  it('Los_textos_largos_importados_se_recortan_y_se_avisa', () => {
    const largo250 = 'A'.repeat(250);
    const largo1200 = 'B'.repeat(1200);

    const importados: ContpaqiMaterialDto[] = [
      {
        materialServicio: largo250,
        descripcion: largo1200,
        unidad: 'PZA',
        cantidad: 1,
        costoUnitario: 10,
        iva: 0,
        total: 0,
      },
    ];

    component.insertarMateriales(importados, true);

    const partida = component.partidas.at(0);
    expect(partida.get('materialServicio')?.value.length).toBe(200);
    expect(partida.get('descripcion')?.value.length).toBe(1000);
    expect(mockChatService.showWarning).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.stringMatching(/recortados/)
    );
    expect(mockChatService.showSuccess).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.stringMatching(/1 materiales importados correctamente/)
    );
  });

  it('Importar_PDF_usa_el_lector_compartido', fakeAsync(() => {
    const fakeMateriales: ContpaqiMaterialDto[] = [
      { materialServicio: 'Material PDF', descripcion: 'Desc PDF', unidad: 'PZA', cantidad: 5, costoUnitario: 100, iva: 0, total: 0 },
    ];
    spyOn(LectorPdfMateriales, 'leer').and.returnValue(Promise.resolve(fakeMateriales));

    const fakeFile = new File(['dummy'], 'materiales.pdf', { type: 'application/pdf' });
    const event = { target: { files: [fakeFile], value: 'fake-path' } };

    component.onPdfFileSelected(event);
    tick();

    expect(LectorPdfMateriales.leer).toHaveBeenCalledWith(fakeFile);
    expect(mockDialog.open).toHaveBeenCalledWith(ImportarMaterialesDialogComponent, {
      data: { materiales: fakeMateriales, folio: 'PDF Importado' },
      width: '1000px',
      disableClose: true,
    });
    expect(event.target.value).toBe('');
  }));

  it('Un_PDF_sin_tablas_avisa', fakeAsync(() => {
    spyOn(LectorPdfMateriales, 'leer').and.returnValue(Promise.resolve([]));

    const fakeFile = new File(['dummy'], 'vacio.pdf', { type: 'application/pdf' });
    const event = { target: { files: [fakeFile], value: 'fake-path' } };

    component.onPdfFileSelected(event);
    tick();

    expect(mockDialog.open).not.toHaveBeenCalled();
    expect(mockChatService.showWarning).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.stringMatching(/No se detectaron tablas de materiales legibles en el PDF/)
    );
  }));

  it('Un_error_del_lector_de_PDF_se_muestra', fakeAsync(() => {
    spyOn(LectorPdfMateriales, 'leer').and.returnValue(Promise.reject(new Error('PDF ilegible')));

    const fakeFile = new File(['dummy'], 'corrupto.pdf', { type: 'application/pdf' });
    const event = { target: { files: [fakeFile], value: 'fake-path' } };

    component.onPdfFileSelected(event);
    tick();

    expect(mockChatService.showError).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.stringMatching(/PDF ilegible/)
    );
  }));
});
