import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, Subject, of, throwError } from 'rxjs';
import { EngineeringService, ImportacionExcelRespuesta, VistaPreviaExcelMateriales } from '../../../engineering.service';
import { MaterialesImportarExcelDialogComponent } from './materiales-importar-excel-dialog.component';

const ARCHIVOS = [
  { nombreArchivo: 'Lista.xlsx', tipo: 'Materiales' },
  { nombreArchivo: 'sub/Otra lista.XLSX', tipo: 'Materiales' },
  { nombreArchivo: 'Notas.pdf', tipo: 'Materiales' },
  { nombreArchivo: 'Presupuesto.xlsx', tipo: 'Contrato' },
  { nombreArchivo: 'viejo.xls', tipo: 'Materiales' }
];

function vista(over: Partial<VistaPreviaExcelMateriales> = {}): VistaPreviaExcelMateriales {
  return {
    nombreArchivo: 'Lista.xlsx', hoja: 'materiales', filaEncabezado: 9,
    filas: [
      { fila: 10, seccion: 'TABLERO PRINCIPAL', cantidad: 4, unidad: 'PZA', concepto: 'Interruptor termomagnético 3P 100A', codigo: 'ABC-123',
        marca: 'Marca Ficticia', precioUnitario: 850, subtotal: 3400, tipoItem: 1, accion: 'agregar', advertencias: [] },
      { fila: 11, seccion: 'TABLERO PRINCIPAL', cantidad: 1, unidad: 'SERV', concepto: 'SERV Maniobra de grúa', codigo: null,
        marca: null, precioUnitario: 5000, subtotal: 5000, tipoItem: 2, accion: 'actualizar', advertencias: ['Subtotal calculado.'] }
    ],
    resumen: { totalFilas: 2, materiales: 1, servicios: 1, agregar: 1, actualizar: 1, sinCambio: 0, noEncontradosEnArchivo: 2, omitidas: 1 },
    advertencias: ['Fila 31: CANT vacía, se omitió.'],
    ...over
  };
}

const RESULTADO: ImportacionExcelRespuesta = {
  importacion: { agregados: 1, actualizados: 1, sinCambio: 0, noEncontradosEnArchivo: 2, omitidas: 1 },
};

describe('MaterialesImportarExcelDialogComponent', () => {
  let fixture: ComponentFixture<MaterialesImportarExcelDialogComponent>;
  let component: MaterialesImportarExcelDialogComponent;
  let servicio: jasmine.SpyObj<EngineeringService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<MaterialesImportarExcelDialogComponent>>;

  function configurar(archivos: Observable<any[]> = of(ARCHIVOS)): void {
    servicio = jasmine.createSpyObj('EngineeringService', [
      'getArchivosEjecucion', 'previsualizarExcelMateriales', 'importarExcelMateriales', 'subirArchivoEjecucion'
    ]);
    servicio.getArchivosEjecucion.and.returnValue(archivos);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [MaterialesImportarExcelDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { idSeguimiento: 4 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: EngineeringService, useValue: servicio }
      ]
    });
    fixture = TestBed.createComponent(MaterialesImportarExcelDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
  }

  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  const boton = (testid: string): HTMLButtonElement => q(testid) as HTMLButtonElement;

  it('Lista_solo_archivos_excel_de_la_carpeta_Materiales', () => {
    configurar();

    expect(component.archivos).toEqual(['Lista.xlsx', 'sub/Otra lista.XLSX', 'viejo.xls']);
    expect(q('archivo-Notas.pdf')).toBeNull();
    expect(q('archivo-Presupuesto.xlsx')).toBeNull();
    expect(servicio.getArchivosEjecucion).toHaveBeenCalledWith(4);
  });

  it('Sin_archivos_explica_donde_subirlo', () => {
    configurar(of([{ nombreArchivo: 'Notas.pdf', tipo: 'Materiales' }]));

    expect(q('sin-archivos')?.textContent).toContain('Materiales');
    expect(boton('btn-importar').disabled).toBeTrue();
  });

  it('Un_error_al_listar_se_ve_con_Reintentar_y_reintenta', () => {
    configurar(throwError(() => new HttpErrorResponse({ status: 500 })));
    expect(q('error-archivos')).not.toBeNull();

    servicio.getArchivosEjecucion.and.returnValue(of(ARCHIVOS));
    boton('reintentar-archivos').click();
    fixture.detectChanges();

    expect(q('error-archivos')).toBeNull();
    expect(component.archivos.length).toBe(3);
  });

  it('Seleccionar_previsualiza_y_muestra_resumen_filas_y_advertencias', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(of(vista()));

    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    expect(servicio.previsualizarExcelMateriales).toHaveBeenCalledOnceWith(4, 'Lista.xlsx');
    expect(q('resumen-vista')?.textContent).toContain('Agregar: 1');
    expect(q('resumen-vista')?.textContent).toContain('Actualizar: 1');
    expect(q('resumen-vista')?.textContent).toContain('No vienen en el archivo: 2');
    expect(q('advertencias')?.textContent).toContain('Fila 31: CANT vacía');
    expect(q('tabla-vista')?.textContent).toContain('Interruptor termomagnético 3P 100A');
    expect(q('tabla-vista')?.textContent).toContain('TABLERO PRINCIPAL');
    expect(q('tabla-vista')?.textContent).toContain('Subtotal calculado.');
  });

  it('Importar_esta_deshabilitado_sin_vista_previa', () => {
    configurar();
    expect(boton('btn-importar').disabled).toBeTrue();
  });

  it('Importar_se_habilita_con_filas_a_agregar_o_actualizar', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(of(vista()));
    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    expect(boton('btn-importar').disabled).toBeFalse();
  });

  it('Si_no_hay_nada_que_agregar_ni_actualizar_no_deja_importar_y_lo_explica', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(of(vista({
      resumen: { totalFilas: 3, materiales: 3, servicios: 0, agregar: 0, actualizar: 0, sinCambio: 3, noEncontradosEnArchivo: 0, omitidas: 0 }
    })));
    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    expect(boton('btn-importar').disabled).toBeTrue();
    expect(q('nada-que-importar')).not.toBeNull();
  });

  it('Cambiar_de_archivo_descarta_la_vista_previa_anterior', () => {
    configurar();
    const segunda = new Subject<VistaPreviaExcelMateriales>();
    servicio.previsualizarExcelMateriales.and.returnValues(of(vista()), segunda);
    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();
    expect(q('tabla-vista')).not.toBeNull();

    (q('archivo-viejo.xls') as HTMLElement).click();
    fixture.detectChanges();

    expect(q('tabla-vista')).toBeNull();
    expect(boton('btn-importar').disabled).toBeTrue();
  });

  it('Una_vista_previa_que_llega_tarde_no_pisa_a_la_del_archivo_actual', () => {
    configurar();
    const vieja = new Subject<VistaPreviaExcelMateriales>();
    const nueva = new Subject<VistaPreviaExcelMateriales>();
    servicio.previsualizarExcelMateriales.and.returnValues(vieja, nueva);

    boton('archivo-Lista.xlsx').click();
    (q('archivo-viejo.xls') as HTMLElement).click();
    nueva.next(vista({ nombreArchivo: 'viejo.xls', hoja: 'materiales-nueva' }));
    vieja.next(vista({ nombreArchivo: 'Lista.xlsx', hoja: 'materiales-vieja' }));
    fixture.detectChanges();

    expect(component.vista?.hoja).toBe('materiales-nueva');
  });

  it('Un_422_de_la_vista_previa_muestra_el_mensaje_del_API_dentro_del_dialogo', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { mensaje: 'No se encontró la hoja «materiales» o la fila de encabezados (CANT, CONCEPTO…).' }
    })));

    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    expect(q('error-importar')?.textContent).toContain('No se encontró la hoja «materiales»');
    expect(boton('btn-importar').disabled).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('Importar_envia_idSeguimiento_y_archivo_y_cierra_con_importado_true', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(of(vista()));
    servicio.importarExcelMateriales.and.returnValue(of(RESULTADO));
    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    boton('btn-importar').click();

    expect(servicio.importarExcelMateriales).toHaveBeenCalledOnceWith(4, 'Lista.xlsx');
    expect(dialogRef.close).toHaveBeenCalledOnceWith({ importado: true, resultado: RESULTADO });
  });

  it('Doble_clic_en_Importar_envia_una_sola_peticion_y_bloquea_el_cierre', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(of(vista()));
    const respuesta = new Subject<ImportacionExcelRespuesta>();
    servicio.importarExcelMateriales.and.returnValue(respuesta);
    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    boton('btn-importar').click();
    component.importar();
    fixture.detectChanges();

    expect(servicio.importarExcelMateriales).toHaveBeenCalledTimes(1);
    expect(dialogRef.disableClose).toBeTrue();
    component.cancelar();
    expect(dialogRef.close).not.toHaveBeenCalled();

    respuesta.error(new HttpErrorResponse({ status: 500, error: { mensaje: 'Falló.' } }));
    fixture.detectChanges();
    expect(dialogRef.disableClose).toBeFalse();
    expect(q('error-importar')?.textContent).toContain('Falló.');
    expect(boton('btn-importar').disabled).toBeFalse();
  });

  it('Un_error_sin_mensaje_muestra_un_texto_generico_y_no_el_cuerpo_crudo', () => {
    configurar();
    servicio.previsualizarExcelMateriales.and.returnValue(of(vista()));
    servicio.importarExcelMateriales.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: '<b>Internal</b> Server Error' })));
    boton('archivo-Lista.xlsx').click();
    fixture.detectChanges();

    boton('btn-importar').click();
    fixture.detectChanges();

    expect(q('error-importar')?.textContent).toContain('No se pudo importar el archivo');
    expect(q('error-importar')?.textContent).not.toContain('Internal');
  });

  describe('subir un archivo', () => {
    function elegir(nombre: string, bytes = 10): void {
      const archivo = new File([new Uint8Array(bytes)], nombre);
      component.alElegirArchivo({ target: { files: [archivo], value: 'x' } } as any);
      fixture.detectChanges();
    }

    it('Sube_a_la_carpeta_Materiales_con_el_servicio_existente_y_selecciona_el_archivo', () => {
      configurar(of([]));
      servicio.subirArchivoEjecucion.and.returnValue(of({ success: true }));
      servicio.getArchivosEjecucion.and.returnValue(of([{ nombreArchivo: 'Nueva.xlsx', tipo: 'Materiales' }]));
      servicio.previsualizarExcelMateriales.and.returnValue(of(vista({ nombreArchivo: 'Nueva.xlsx' })));

      elegir('Nueva.xlsx');

      expect(servicio.subirArchivoEjecucion).toHaveBeenCalledWith(4, jasmine.any(File), 'Materiales');
      expect(component.seleccionado).toBe('Nueva.xlsx');
      expect(servicio.previsualizarExcelMateriales).toHaveBeenCalledWith(4, 'Nueva.xlsx');
    });

    it('Rechaza_una_extension_que_no_es_de_excel_sin_llamar_al_API', () => {
      configurar();
      elegir('lista.pdf');

      expect(servicio.subirArchivoEjecucion).not.toHaveBeenCalled();
      expect(q('error-importar')?.textContent).toContain('Solo se aceptan archivos de Excel');
    });

    it('Rechaza_un_archivo_de_mas_de_10_MB_sin_llamar_al_API', () => {
      configurar();
      const grande = { name: 'enorme.xlsx', size: 11 * 1024 * 1024 } as File;
      component.alElegirArchivo({ target: { files: [grande], value: 'x' } } as any);
      fixture.detectChanges();

      expect(servicio.subirArchivoEjecucion).not.toHaveBeenCalled();
      expect(q('error-importar')?.textContent).toContain('10 MB');
    });

    it('Un_error_al_subir_se_ve_dentro_del_dialogo', () => {
      configurar();
      servicio.subirArchivoEjecucion.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { mensaje: 'Disco lleno.' } })));
      elegir('Nueva.xlsx');

      expect(q('error-importar')?.textContent).toContain('Disco lleno.');
      expect(component.subiendo).toBeFalse();
    });
  });
});
