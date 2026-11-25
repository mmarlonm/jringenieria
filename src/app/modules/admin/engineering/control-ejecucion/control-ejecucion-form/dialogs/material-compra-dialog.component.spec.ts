import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import { EngineeringService, ProveedorLigero, SeguimientoMaterial } from '../../../engineering.service';
import { MaterialObservacionesDialogComponent } from '../materiales-trazabilidad/material-observaciones-dialog/material-observaciones-dialog.component';
import { MaterialCompraDialogComponent } from './material-compra-dialog.component';

function mat(over: Partial<SeguimientoMaterial> = {}): SeguimientoMaterial {
  return {
    idMaterial: 901, idSeguimiento: 4, tipoItem: 1, codigoProducto: 'ABC-123', descripcion: 'Interruptor termomagnético 3P 100A',
    unidadMedida: 'PZA', cantidadCotizada: 4, precioUnitarioCotizado: 850, importeCotizado: 3400, notas: null,
    marca: null, seccion: null, proveedorId: null, proveedorNombre: null, estatus: 'EnProceso', fechaEstatus: null, archivoOrigen: null,
    cantidadComprada: 0, costoTotalComprado: 0, precioUnitarioPromedioCompra: 0, cantidadSurtida: 0, costoTotalSurtido: 0,
    costoUnitarioPromedioSurtido: 0, cantidadPendienteSurtir: 4, variacionImporte: 3400, semaforo: 'Por Comprar',
    ...over
  };
}

const CATALOGO: ProveedorLigero[] = [
  { idProveedor: 31, razonSocial: 'Proveedor Ficticio SA de CV', nombreComercial: 'Proveedor Ficticio', rfc: 'XAXX010101000' },
  { idProveedor: 32, razonSocial: 'Solo Razon Social SA', nombreComercial: null, rfc: null }
];

describe('MaterialCompraDialogComponent', () => {
  let fixture: ComponentFixture<MaterialCompraDialogComponent>;
  let component: MaterialCompraDialogComponent;
  let servicio: jasmine.SpyObj<EngineeringService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<MaterialCompraDialogComponent>>;

  function configurar(material: SeguimientoMaterial = mat()): void {
    servicio = jasmine.createSpyObj('EngineeringService', ['getProveedoresMateriales', 'guardarCompraMaterial']);
    servicio.getProveedoresMateriales.and.returnValue(of(CATALOGO));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [MaterialCompraDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { material } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: EngineeringService, useValue: servicio }
      ]
    });
    fixture = TestBed.createComponent(MaterialCompraDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
  }

  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  const boton = (testid: string): HTMLButtonElement => q(testid) as HTMLButtonElement;
  const elegirOpcion = (p: ProveedorLigero) => component.alElegir({ option: { value: p } } as any);

  describe('valores iniciales', () => {
    it('Abre_con_los_valores_actuales_del_producto', () => {
      configurar(mat({ proveedorId: 31, proveedorNombre: 'Proveedor Ficticio', notas: 'Entrega en obra' }));

      expect(q('proveedor-elegido')?.textContent).toContain('Proveedor Ficticio');
      expect(component.observacionesControl.value).toBe('');
      expect(q('observacion-actual')?.textContent).toContain('Entrega en obra');
      expect(q('sin-proveedor')).toBeNull();
    });

    it('Nueva observacion empieza vacia y muestra la observacion actual', () => {
      configurar(mat({ notas: 'Nota actual de prueba', observacionesCount: 2 }));
      expect(component.observacionesControl.value).toBe('');
      expect(q('observacion-actual')?.textContent?.trim()).toBe('Nota actual de prueba');
      expect(q('btn-ver-historial')?.textContent).toContain('2');
    });

    it('Sin observacion actual muestra Sin observaciones', () => {
      configurar(mat({ notas: null, observacionesCount: 0 }));
      expect(component.observacionesControl.value).toBe('');
      expect(q('observacion-actual')?.textContent?.trim()).toBe('Sin observaciones');
      expect(q('btn-ver-historial')?.textContent).not.toContain('(');
    });

    it('Ver historial abre el dialogo de historial con el material', () => {
      const material = mat({ idMaterial: 901 });
      configurar(material);
      const openSpy = spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);

      boton('btn-ver-historial').click();

      expect(openSpy).toHaveBeenCalledOnceWith(
        MaterialObservacionesDialogComponent,
        { width: '600px', maxWidth: '95vw', autoFocus: false, data: { material } }
      );
    });

    it('Sin_proveedor_lo_dice_y_Guardar_esta_deshabilitado_hasta_que_haya_un_cambio', () => {
      configurar();

      expect(q('sin-proveedor')).not.toBeNull();
      expect(boton('btn-guardar').disabled).toBeTrue();
    });

    it('Un_proveedor_asignado_sin_nombre_no_rompe_y_se_puede_quitar', () => {
      configurar(mat({ proveedorId: 99, proveedorNombre: null }));
      expect(q('proveedor-elegido')?.textContent).toContain('Proveedor sin nombre');
    });

    it('Un_proveedor_con_solo_razon_social_se_ofrece_y_se_muestra_con_ella', () => {
      configurar();
      elegirOpcion(CATALOGO[1]);
      fixture.detectChanges();

      expect(q('proveedor-elegido')?.textContent).toContain('Solo Razon Social SA');
    });

    it('El_nombre_comercial_tiene_prioridad_sobre_la_razon_social', () => {
      configurar();
      elegirOpcion(CATALOGO[0]);
      fixture.detectChanges();

      expect(component.proveedor).toEqual({ idProveedor: 31, etiqueta: 'Proveedor Ficticio' });
    });
  });

  describe('búsqueda en el catálogo ligero', () => {
    it('Escribir_consulta_el_catalogo_con_q_despues_de_la_espera_y_una_sola_vez', fakeAsync(() => {
      configurar();

      component.busquedaControl.setValue('fic');
      component.busquedaControl.setValue('fict');
      tick(100);
      expect(servicio.getProveedoresMateriales).not.toHaveBeenCalled();
      tick(200);

      expect(servicio.getProveedoresMateriales).toHaveBeenCalledOnceWith('fict', 50);
      expect(component.opciones.length).toBe(2);
      discardPeriodicTasks();
    }));

    it('Al_enfocar_sin_escribir_pide_los_primeros_50', fakeAsync(() => {
      configurar();

      component.alEnfocarBusqueda();
      tick(300);

      expect(servicio.getProveedoresMateriales).toHaveBeenCalledOnceWith('', 50);
    }));

    it('Una_respuesta_vieja_no_pisa_a_la_nueva', fakeAsync(() => {
      configurar();
      const vieja = new Subject<ProveedorLigero[]>();
      const nueva = new Subject<ProveedorLigero[]>();
      servicio.getProveedoresMateriales.and.returnValues(vieja, nueva);

      component.busquedaControl.setValue('a');
      tick(300);
      component.busquedaControl.setValue('ab');
      tick(300);
      nueva.next([CATALOGO[0]]);
      vieja.next([CATALOGO[1]]);

      expect(component.opciones).toEqual([CATALOGO[0]]);
    }));

    it('Un_error_del_catalogo_se_ve_en_el_dialogo_y_se_puede_volver_a_buscar', fakeAsync(() => {
      configurar();
      servicio.getProveedoresMateriales.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      component.busquedaControl.setValue('x');
      tick(300);
      fixture.detectChanges();

      expect(q('error-busqueda')?.textContent).toContain('No se pudo consultar el catálogo de proveedores');

      servicio.getProveedoresMateriales.and.returnValue(of(CATALOGO));
      component.busquedaControl.setValue('xy');
      tick(300);
      fixture.detectChanges();

      expect(q('error-busqueda')).toBeNull();
      expect(component.opciones.length).toBe(2);
    }));
  });

  describe('guardar', () => {
    it('Elegir_un_proveedor_y_guardar_envia_proveedorId_y_notas_y_cierra_con_el_material', () => {
      configurar();
      const devuelto = mat({ proveedorId: 31, proveedorNombre: 'Proveedor Ficticio', notas: 'Entrega en obra' });
      servicio.guardarCompraMaterial.and.returnValue(of(devuelto));

      elegirOpcion(CATALOGO[0]);
      component.observacionesControl.setValue('  Entrega en obra  ');
      fixture.detectChanges();
      boton('btn-guardar').click();

      expect(servicio.guardarCompraMaterial).toHaveBeenCalledOnceWith(901, { proveedorId: 31, notas: 'Entrega en obra' });
      expect(dialogRef.close).toHaveBeenCalledOnceWith(devuelto);
    });

    it('Quitar_el_proveedor_envia_proveedorId_null_y_las_notas_que_haya', () => {
      configurar(mat({ proveedorId: 31, proveedorNombre: 'Proveedor Ficticio', notas: 'Algo' }));
      servicio.guardarCompraMaterial.and.returnValue(of(mat()));

      boton('quitar-proveedor').click();
      fixture.detectChanges();
      boton('btn-guardar').click();

      expect(servicio.guardarCompraMaterial).toHaveBeenCalledOnceWith(901, { proveedorId: null, notas: 'Algo' });
    });

    it('Guardar solo proveedor manda las notas actuales sin cambios', () => {
      configurar(mat({ proveedorId: null, notas: 'Nota fija previa' }));
      servicio.guardarCompraMaterial.and.returnValue(of(mat()));

      elegirOpcion(CATALOGO[0]); // Elige proveedor 31
      fixture.detectChanges();
      expect(boton('btn-guardar').disabled).toBeFalse();

      boton('btn-guardar').click();
      expect(servicio.guardarCompraMaterial).toHaveBeenCalledOnceWith(901, {
        proveedorId: 31,
        notas: 'Nota fija previa'
      });
    });

    it('Guardar con nueva observacion manda el texto nuevo recortado', () => {
      configurar(mat({ proveedorId: 31, notas: 'Nota vieja' }));
      servicio.guardarCompraMaterial.and.returnValue(of(mat()));

      component.observacionesControl.setValue('   Texto nuevo recortado   ');
      fixture.detectChanges();
      expect(boton('btn-guardar').disabled).toBeFalse();

      boton('btn-guardar').click();
      expect(servicio.guardarCompraMaterial).toHaveBeenCalledOnceWith(901, {
        proveedorId: 31,
        notas: 'Texto nuevo recortado'
      });
    });

    it('Guardar deshabilitado sin cambios o si la nueva es igual a la actual', () => {
      configurar(mat({ proveedorId: 31, notas: 'Misma nota' }));
      expect(boton('btn-guardar').disabled).toBeTrue();

      component.observacionesControl.setValue('  Misma nota  ');
      fixture.detectChanges();
      expect(boton('btn-guardar').disabled).toBeTrue();

      component.observacionesControl.setValue('   ');
      fixture.detectChanges();
      expect(boton('btn-guardar').disabled).toBeTrue();
    });

    it('Guardar deshabilitado con mas de 1000 caracteres', () => {
      configurar(mat({ proveedorId: 31, notas: 'Nota' }));
      component.observacionesControl.setValue('x'.repeat(1001));
      fixture.detectChanges();

      expect(boton('btn-guardar').disabled).toBeTrue();
      expect(q('contador')?.textContent?.trim()).toContain('1001 / 1000');

      component.observacionesControl.setValue('x'.repeat(1000));
      fixture.detectChanges();
      expect(boton('btn-guardar').disabled).toBeFalse();
    });

    it('Guardar usa la observacion actual del momento si se agrego desde el historial', () => {
      const material = mat({ proveedorId: null, notas: 'Inicial' });
      configurar(material);
      servicio.guardarCompraMaterial.and.returnValue(of(mat()));

      // Simular que el diálogo de historial agregó una observación y mutó material.notas
      material.notas = 'Actualizada desde historial';
      elegirOpcion(CATALOGO[0]); // cambia proveedor para habilitar guardado
      fixture.detectChanges();

      boton('btn-guardar').click();
      expect(servicio.guardarCompraMaterial).toHaveBeenCalledOnceWith(901, {
        proveedorId: 31,
        notas: 'Actualizada desde historial'
      });
    });

    it('Doble_clic_en_Guardar_envia_una_sola_peticion_y_bloquea_el_cierre', () => {
      configurar();
      const respuesta = new Subject<SeguimientoMaterial>();
      servicio.guardarCompraMaterial.and.returnValue(respuesta);
      component.observacionesControl.setValue('Nota');
      fixture.detectChanges();

      boton('btn-guardar').click();
      component.guardar();
      fixture.detectChanges();

      expect(servicio.guardarCompraMaterial).toHaveBeenCalledTimes(1);
      expect(dialogRef.disableClose).toBeTrue();
      component.cancelar();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('400_del_API_muestra_el_mensaje_dentro_del_dialogo_sin_perder_lo_escrito', () => {
      configurar();
      servicio.guardarCompraMaterial.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { mensaje: 'El proveedor seleccionado no existe.' }
      })));
      elegirOpcion(CATALOGO[0]);
      component.observacionesControl.setValue('Mi nota');
      fixture.detectChanges();

      boton('btn-guardar').click();
      fixture.detectChanges();

      expect(q('error-compra')?.textContent).toContain('El proveedor seleccionado no existe.');
      expect(component.observacionesControl.value).toBe('Mi nota');
      expect(component.proveedor?.idProveedor).toBe(31);
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(dialogRef.disableClose).toBeFalse();
      expect(boton('btn-guardar').disabled).toBeFalse();
    });

    it('Un_error_sin_mensaje_muestra_un_texto_generico_y_no_el_cuerpo_crudo', () => {
      configurar();
      servicio.guardarCompraMaterial.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: '<b>Internal</b>' })));
      component.observacionesControl.setValue('Nota');
      fixture.detectChanges();

      boton('btn-guardar').click();
      fixture.detectChanges();

      expect(q('error-compra')?.textContent).toContain('No se pudo guardar');
      expect(q('error-compra')?.textContent).not.toContain('Internal');
    });

    it('Cancelar_cierra_sin_resultado', () => {
      configurar();
      boton('btn-cancelar').click();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
