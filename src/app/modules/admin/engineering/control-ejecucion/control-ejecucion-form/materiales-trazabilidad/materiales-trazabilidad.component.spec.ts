import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import {
  EngineeringService,
  MaterialEstatus,
  ResumenTrazabilidadProyecto,
  SeguimientoMaterial
} from '../../../engineering.service';
import { MaterialesTrazabilidadComponent } from './materiales-trazabilidad.component';

function mat(id: number, over: Partial<SeguimientoMaterial> = {}): SeguimientoMaterial {
  return {
    idMaterial: id, idSeguimiento: 4, tipoItem: 1, codigoProducto: `COD-${id}`, descripcion: `Producto ${id}`, unidadMedida: 'PZA',
    cantidadCotizada: 2, precioUnitarioCotizado: 100, importeCotizado: 200, notas: null,
    marca: null, seccion: null, proveedorId: null, proveedorNombre: null, estatus: 'EnProceso', fechaEstatus: null, archivoOrigen: null,
    cantidadComprada: 0, costoTotalComprado: 0, precioUnitarioPromedioCompra: 0,
    cantidadSurtida: 0, costoTotalSurtido: 0, costoUnitarioPromedioSurtido: 0, cantidadPendienteSurtir: 2, variacionImporte: 200,
    semaforo: 'Por Comprar', comprasRelacionadas: [], salidasRelacionadas: [],
    ...over
  };
}

function resumen(materiales: SeguimientoMaterial[], over: Partial<ResumenTrazabilidadProyecto> = {}): ResumenTrazabilidadProyecto {
  const cuenta = (e: MaterialEstatus) => materiales.filter(m => m.estatus === e).length;
  return {
    idSeguimiento: 4, responsableCompra: null,
    conteoPorEstatus: {
      total: materiales.length, enProceso: cuenta('EnProceso'), listo: cuenta('Listo'), pendienteRecoleccion: cuenta('PendienteRecoleccion'),
      anulado: cuenta('Anulado'), recolectado: cuenta('Recolectado')
    },
    totalCotizado: 0, totalComprado: 0, totalSurtidoAlmacen: 0, diferenciaPresupuesto: 0, itemsCompletos: 0, itemsEnProceso: 0, itemsPendientes: 0,
    materiales,
    ...over
  };
}

const USUARIOS = [{ usuarioId: 12, nombreUsuario: 'Usuario Ficticio' }, { usuarioId: 13, nombreUsuario: 'Otra Persona Ficticia' }];

describe('MaterialesTrazabilidadComponent', () => {
  let fixture: ComponentFixture<MaterialesTrazabilidadComponent>;
  let component: MaterialesTrazabilidadComponent;
  let servicio: jasmine.SpyObj<EngineeringService>;

  const productos = (): SeguimientoMaterial[] => [
    mat(1, { estatus: 'EnProceso', seccion: 'TABLERO PRINCIPAL', marca: 'Marca A' }),
    mat(2, { estatus: 'Listo', seccion: 'TABLERO PRINCIPAL', proveedorId: 31, proveedorNombre: 'Proveedor Ficticio', notas: 'Entrega en obra' }),
    mat(3, { estatus: 'PendienteRecoleccion', seccion: 'ALUMBRADO' }),
    mat(4, { estatus: 'Recolectado', seccion: null }),
    mat(5, { estatus: 'Anulado', seccion: null, tipoItem: 2, codigoProducto: null })
  ];

  function configurar(res: ResumenTrazabilidadProyecto | null = resumen(productos())): void {
    servicio = jasmine.createSpyObj('EngineeringService', [
      'getMaterialesTrazabilidad', 'asignarResponsableCompra', 'cambiarEstatusMaterial', 'cambiarEstatusMasivo',
      'guardarMaterial', 'eliminarMaterial'
    ]);
    servicio.getMaterialesTrazabilidad.and.returnValue(of(res as any));

    TestBed.configureTestingModule({
      imports: [MaterialesTrazabilidadComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [{ provide: EngineeringService, useValue: servicio }]
    });
    fixture = TestBed.createComponent(MaterialesTrazabilidadComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('usuarios', USUARIOS);
    fixture.componentRef.setInput('idSeguimiento', 4);
    fixture.autoDetectChanges(true);
  }

  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  const todos = (sel: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(sel));
  const filas = (): HTMLElement[] => todos('[data-testid^="fila-"]:not([data-testid="fila-seccion"])');
  const idsFilas = (): string[] => filas().map(f => f.getAttribute('data-testid')!);
  const texto = (): string => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
  const confirmar = (aceptar = true) => spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: aceptar } as any));

  describe('carga y pantalla', () => {
    it('Carga_la_trazabilidad_al_recibir_el_idSeguimiento_y_muestra_los_productos', () => {
      configurar();

      expect(servicio.getMaterialesTrazabilidad).toHaveBeenCalledOnceWith(4);
      expect(idsFilas()).toEqual(['fila-1', 'fila-2', 'fila-3', 'fila-4', 'fila-5']);
    });

    it('Sin_idSeguimiento_no_pide_nada', () => {
      configurar();
      servicio.getMaterialesTrazabilidad.calls.reset();
      fixture.componentRef.setInput('idSeguimiento', null);
      fixture.detectChanges();
      expect(servicio.getMaterialesTrazabilidad).not.toHaveBeenCalled();
    });

    it('Un_error_de_carga_se_ve_con_Reintentar', () => {
      configurar();
      servicio.getMaterialesTrazabilidad.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.cargar();
      fixture.detectChanges();
      expect(q('error-carga')?.textContent).toContain('No se pudo cargar la lista de materiales');

      servicio.getMaterialesTrazabilidad.and.returnValue(of(resumen(productos())));
      (q('btn-reintentar') as HTMLElement).click();
      fixture.detectChanges();

      expect(q('error-carga')).toBeNull();
      expect(idsFilas().length).toBe(5);
    });

    it('Quita_Material_CONTPAQ_y_deja_Importar_desde_Excel_y_Agregar_manual', () => {
      configurar();

      expect(q('btn-importar-excel')?.textContent).toContain('Importar desde Excel');
      expect(q('btn-agregar-manual')?.textContent).toContain('Agregar manual');
      expect(texto()).not.toContain('Material CONTPAQ');
      expect(texto()).not.toContain('Catálogo CONTPAQ');
    });

    it('Proyecto_sin_productos_muestra_estado_vacio_con_la_instruccion_de_subir_el_Excel', () => {
      configurar(resumen([]));

      expect(q('estado-vacio')?.textContent).toContain('Archivos y evidencias → Materiales');
      expect(q('tabla-materiales')).toBeNull();
      expect(q('valor-TODOS')?.textContent?.trim()).toBe('0');
    });

    it('Los_cuatro_KPIs_de_dinero_ya_no_aparecen_en_la_pestana', () => {
      configurar();
      for (const viejo of ['Presupuesto Cotizado', 'Total Comprado (OC)', 'Entregado en Obra', 'Balance / Saldo']) {
        expect(texto()).not.toContain(viejo);
      }
    });

    it('Un_producto_sin_proveedor_ni_observaciones_muestra_guion_y_uno_sin_nombre_de_proveedor_no_rompe', () => {
      configurar(resumen([mat(1), mat(2, { proveedorId: 99, proveedorNombre: null })]));

      expect(q('proveedor-1')?.textContent?.trim()).toBe('—');
      expect(q('observaciones-1')?.textContent?.trim()).toBe('—');
      expect(q('proveedor-2')?.textContent?.trim()).toBe('—');
    });

    it('Muestra_proveedor_y_observaciones_de_cada_producto', () => {
      configurar();
      expect(q('proveedor-2')?.textContent).toContain('Proveedor Ficticio');
      expect(q('observaciones-2')?.textContent).toContain('Entrega en obra');
    });

    it('Lo_que_viene_del_API_se_muestra_como_texto_y_no_como_HTML', () => {
      configurar(resumen([mat(1, { descripcion: '<img src=x onerror=alert(1)>', notas: '<b>negrita</b>', proveedorNombre: '<i>x</i>' })]));

      expect(fixture.nativeElement.querySelector('img[src="x"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="observaciones-1"] b')).toBeNull();
      expect(q('observaciones-1')?.textContent).toContain('<b>negrita</b>');
    });
  });

  describe('responsable de compra', () => {
    it('Muestra_al_responsable_actual_y_la_lista_de_usuarios', () => {
      configurar(resumen(productos(), { responsableCompra: { usuarioId: 12, nombre: 'Usuario Ficticio' } }));

      expect(component.responsableId).toBe(12);
      const opciones = todos('[data-testid="select-responsable"] option').map(o => o.textContent?.trim());
      expect(opciones).toEqual(['Sin responsable', 'Usuario Ficticio', 'Otra Persona Ficticia']);
    });

    it('Cambiar_al_responsable_lo_guarda_con_el_API_y_conserva_el_valor', () => {
      configurar();
      servicio.asignarResponsableCompra.and.returnValue(of({ idSeguimiento: 4, responsableCompra: { usuarioId: 13, nombre: 'Otra Persona Ficticia' } }));

      component.cambiarResponsable(13);

      expect(servicio.asignarResponsableCompra).toHaveBeenCalledOnceWith(4, 13);
      expect(component.responsableId).toBe(13);
      expect(component.resumen?.responsableCompra?.nombre).toBe('Otra Persona Ficticia');
    });

    it('Quitar_al_responsable_manda_usuarioId_null', () => {
      configurar(resumen(productos(), { responsableCompra: { usuarioId: 12, nombre: 'Usuario Ficticio' } }));
      servicio.asignarResponsableCompra.and.returnValue(of({ idSeguimiento: 4, responsableCompra: null }));

      component.cambiarResponsable(null);

      expect(servicio.asignarResponsableCompra).toHaveBeenCalledOnceWith(4, null);
      expect(component.responsableId).toBeNull();
    });

    it('Error_al_guardar_responsable_restaura_el_anterior_y_avisa', () => {
      configurar(resumen(productos(), { responsableCompra: { usuarioId: 12, nombre: 'Usuario Ficticio' } }));
      const aviso = spyOn(Swal, 'fire');
      servicio.asignarResponsableCompra.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { mensaje: 'El usuario no existe.' } })));

      component.cambiarResponsable(13);

      expect(component.responsableId).toBe(12);
      expect(aviso).toHaveBeenCalledWith('No se pudo guardar', 'El usuario no existe.', 'error');
    });

    it('Elegir_el_mismo_responsable_no_llama_al_API', () => {
      configurar(resumen(productos(), { responsableCompra: { usuarioId: 12, nombre: 'Usuario Ficticio' } }));
      component.cambiarResponsable(12);
      expect(servicio.asignarResponsableCompra).not.toHaveBeenCalled();
    });
  });

  describe('KPIs y filtros por estatus', () => {
    it('KPIs_muestran_total_y_un_conteo_por_estatus_desde_conteoPorEstatus', () => {
      configurar();

      expect(q('valor-TODOS')?.textContent?.trim()).toBe('5');
      for (const e of ['EnProceso', 'Listo', 'PendienteRecoleccion', 'Anulado', 'Recolectado']) {
        expect(q('valor-' + e)?.textContent?.trim()).toBe('1');
      }
      expect(texto()).toContain('Pendiente de recolección');
    });

    it('Usa_el_conteo_del_API_cuando_viene', () => {
      configurar(resumen(productos(), { conteoPorEstatus: { total: 50, enProceso: 20, listo: 10, pendienteRecoleccion: 8, anulado: 2, recolectado: 10 } }));
      expect(q('valor-TODOS')?.textContent?.trim()).toBe('50');
      expect(q('valor-EnProceso')?.textContent?.trim()).toBe('20');
    });

    it('Si_el_API_no_manda_conteo_se_calcula_de_los_productos', () => {
      const r = resumen(productos());
      delete (r as any).conteoPorEstatus;
      configurar(r);
      expect(q('valor-TODOS')?.textContent?.trim()).toBe('5');
      expect(q('valor-Listo')?.textContent?.trim()).toBe('1');
    });

    it('Clic_en_un_KPI_filtra_la_tabla_y_otro_clic_lo_quita', () => {
      configurar();

      (q('kpi-Listo') as HTMLElement).click();
      fixture.detectChanges();
      expect(idsFilas()).toEqual(['fila-2']);
      expect(q('filtro-activo')?.textContent).toContain('Listo');

      (q('kpi-Listo') as HTMLElement).click();
      fixture.detectChanges();
      expect(idsFilas().length).toBe(5);
      expect(q('filtro-activo')).toBeNull();
    });

    it('El_KPI_Total_quita_cualquier_filtro', () => {
      configurar();
      (q('kpi-Anulado') as HTMLElement).click();
      fixture.detectChanges();
      expect(idsFilas()).toEqual(['fila-5']);

      (q('kpi-TODOS') as HTMLElement).click();
      fixture.detectChanges();
      expect(idsFilas().length).toBe(5);
    });

    it('El_filtro_de_texto_busca_en_codigo_descripcion_marca_proveedor_observaciones_y_seccion', () => {
      configurar();
      const buscar = (t: string) => { component.onFiltroTexto(t); fixture.detectChanges(); return idsFilas(); };

      expect(buscar('marca a')).toEqual(['fila-1']);
      expect(buscar('proveedor ficticio')).toEqual(['fila-2']);
      expect(buscar('entrega en obra')).toEqual(['fila-2']);
      expect(buscar('alumbrado')).toEqual(['fila-3']);
      expect(buscar('cod-4')).toEqual(['fila-4']);
      expect(buscar('no existe')).toEqual([]);
      expect(q('sin-coincidencias')).not.toBeNull();
    });

    it('Agrupa_por_seccion_con_encabezado_y_deja_aparte_los_que_no_tienen', () => {
      configurar();

      const encabezados = todos('[data-testid="fila-seccion"]').map(e => e.textContent!.replace(/\s+/g, ' ').trim());
      expect(encabezados).toEqual(['TABLERO PRINCIPAL (2)', 'ALUMBRADO (1)']);
      expect(component.grupos.map(g => g.seccion)).toEqual(['TABLERO PRINCIPAL', 'ALUMBRADO', null]);
      expect(component.grupos[2].items.map(i => i.idMaterial)).toEqual([4, 5]);
    });
  });

  describe('estatus por producto', () => {
    it('Cambiar_estatus_de_una_fila_llama_al_API_y_actualiza_KPIs', () => {
      configurar();
      servicio.cambiarEstatusMaterial.and.returnValue(of(mat(1, { estatus: 'Listo', fechaEstatus: '2026-11-23T10:15:00' })));

      component.cambiarEstatus(component.materiales[0], 'Listo');

      expect(servicio.cambiarEstatusMaterial).toHaveBeenCalledOnceWith(1, 'Listo');
      expect(component.materiales[0].estatus).toBe('Listo');
      expect(component.materiales[0].fechaEstatus).toBe('2026-11-23T10:15:00');
      fixture.detectChanges();
      expect(q('valor-EnProceso')?.textContent?.trim()).toBe('0');
      expect(q('valor-Listo')?.textContent?.trim()).toBe('2');
    });

    it('Elegir_el_estatus_en_el_selector_de_la_fila_dispara_el_cambio', () => {
      configurar();
      servicio.cambiarEstatusMaterial.and.returnValue(of(mat(1, { estatus: 'Listo' })));
      const select = q('estatus-1') as HTMLSelectElement;

      select.selectedIndex = 1; // Listo
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(servicio.cambiarEstatusMaterial).toHaveBeenCalledOnceWith(1, 'Listo');
    });

    it('Si_falla_el_cambio_la_fila_vuelve_al_estatus_anterior_y_se_avisa', () => {
      configurar();
      const aviso = spyOn(Swal, 'fire');
      servicio.cambiarEstatusMaterial.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { mensaje: 'Estatus no válido.' } })));

      component.cambiarEstatus(component.materiales[0], 'Anulado');
      fixture.detectChanges();

      expect(component.materiales[0].estatus).toBe('EnProceso');
      expect(q('valor-EnProceso')?.textContent?.trim()).toBe('1');
      expect(q('valor-Anulado')?.textContent?.trim()).toBe('1');
      expect(aviso).toHaveBeenCalledWith('No se pudo cambiar el estatus', 'Estatus no válido.', 'error');
    });

    it('Mientras_un_cambio_esta_en_vuelo_la_fila_no_envia_otro', async () => {
      configurar();
      const respuesta = new Subject<SeguimientoMaterial>();
      servicio.cambiarEstatusMaterial.and.returnValue(respuesta);
      const item = component.materiales[0];

      component.cambiarEstatus(item, 'Listo');
      component.cambiarEstatus(item, 'Recolectado');
      fixture.detectChanges();
      await fixture.whenStable(); // ngModel aplica `disabled` en una microtarea

      expect(servicio.cambiarEstatusMaterial).toHaveBeenCalledTimes(1);
      expect((q('estatus-1') as HTMLSelectElement).disabled).toBeTrue();

      respuesta.next(mat(1, { estatus: 'Listo' }));
      respuesta.complete();
      fixture.detectChanges();
      await fixture.whenStable();
      expect((q('estatus-1') as HTMLSelectElement).disabled).toBeFalse();
    });

    it('Cambiar_al_mismo_estatus_no_llama_al_API', () => {
      configurar();
      component.cambiarEstatus(component.materiales[0], 'EnProceso');
      expect(servicio.cambiarEstatusMaterial).not.toHaveBeenCalled();
    });
  });

  describe('selección múltiple', () => {
    it('Marcar_todos_selecciona_los_visibles_y_muestra_la_barra', () => {
      configurar();
      (q('marcar-todos') as HTMLInputElement).click();
      fixture.detectChanges();

      expect(component.seleccionados.size).toBe(5);
      expect(q('barra-masiva')?.textContent).toContain('5 seleccionado(s)');

      (q('marcar-todos') as HTMLInputElement).click();
      fixture.detectChanges();
      expect(component.seleccionados.size).toBe(0);
      expect(q('barra-masiva')).toBeNull();
    });

    it('Marcar_todos_solo_toma_los_que_pasan_el_filtro', () => {
      configurar();
      (q('kpi-Listo') as HTMLElement).click();
      fixture.detectChanges();
      component.toggleTodos();
      fixture.detectChanges();

      expect(Array.from(component.seleccionados)).toEqual([2]);
    });

    it('Cambio_masivo_confirma_envia_los_ids_y_aplica_la_trazabilidad_devuelta', fakeAsync(() => {
      configurar();
      confirmar();
      const nueva = resumen(productos().map(m => (m.idMaterial === 1 || m.idMaterial === 3) ? { ...m, estatus: 'Recolectado' as MaterialEstatus } : m));
      servicio.cambiarEstatusMasivo.and.returnValue(of(nueva));
      component.toggleSeleccion(component.materiales[0]);
      component.toggleSeleccion(component.materiales[2]);
      component.estatusMasivo = 'Recolectado';

      component.aplicarMasivo();
      flushMicrotasks();
      fixture.detectChanges();

      expect(servicio.cambiarEstatusMasivo).toHaveBeenCalledOnceWith(4, [1, 3], 'Recolectado');
      expect(component.seleccionados.size).toBe(0);
      expect(q('valor-Recolectado')?.textContent?.trim()).toBe('3');
    }));

    it('Cancelar_la_confirmacion_no_envia_nada_y_conserva_la_seleccion', fakeAsync(() => {
      configurar();
      confirmar(false);
      component.toggleSeleccion(component.materiales[0]);

      component.aplicarMasivo();
      flushMicrotasks();

      expect(servicio.cambiarEstatusMasivo).not.toHaveBeenCalled();
      expect(component.seleccionados.size).toBe(1);
      expect(component.aplicandoMasivo).toBeFalse();
    }));

    it('Si_falla_el_masivo_avisa_y_no_cambia_nada', fakeAsync(() => {
      configurar();
      const swal = spyOn(Swal, 'fire').and.returnValues(
        Promise.resolve({ isConfirmed: true } as any),
        Promise.resolve({ isConfirmed: true } as any)
      );
      servicio.cambiarEstatusMasivo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { mensaje: 'Un producto no pertenece al proyecto.' } })));
      component.toggleSeleccion(component.materiales[0]);

      component.aplicarMasivo();
      flushMicrotasks();

      expect(swal.calls.mostRecent().args).toEqual(['No se pudo cambiar el estatus', 'Un producto no pertenece al proyecto.', 'error']);
      expect(component.materiales[0].estatus).toBe('EnProceso');
      expect(component.seleccionados.size).toBe(1);
    }));
  });

  describe('proveedor y observaciones', () => {
    it('El_boton_de_cada_fila_abre_el_dialogo_con_el_producto_y_sus_valores_actuales', () => {
      configurar();
      const abrir = spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);

      (q('compra-2') as HTMLElement).click();

      const datos = abrir.calls.mostRecent().args[1] as any;
      expect(datos.data.material.idMaterial).toBe(2);
      expect(datos.data.material.proveedorNombre).toBe('Proveedor Ficticio');
      expect(datos.data.material.notas).toBe('Entrega en obra');
    });

    it('Al_guardar_solo_se_actualiza_esa_fila_y_se_conserva_el_detalle_abierto', () => {
      configurar();
      (q('expandir-1') as HTMLElement).click();
      fixture.detectChanges();
      const guardado = mat(1, { estatus: 'EnProceso', seccion: 'TABLERO PRINCIPAL', marca: 'Marca A', proveedorId: 32, proveedorNombre: 'Solo Razon Social SA', notas: 'Llamar antes' });
      spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(guardado) } as any);
      const peticiones = servicio.getMaterialesTrazabilidad.calls.count();

      (q('compra-1') as HTMLElement).click();
      fixture.detectChanges();

      expect(q('proveedor-1')?.textContent).toContain('Solo Razon Social SA');
      expect(q('observaciones-1')?.textContent).toContain('Llamar antes');
      expect(q('proveedor-2')?.textContent).toContain('Proveedor Ficticio'); // la otra fila no cambia
      expect(q('detalle-1')).not.toBeNull();
      expect(servicio.getMaterialesTrazabilidad.calls.count()).toBe(peticiones); // no se recarga la lista
      expect(q('valor-TODOS')?.textContent?.trim()).toBe('5');
    });

    it('Si_se_cierra_sin_guardar_no_cambia_nada', () => {
      configurar();
      spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
      const antes = component.materiales;

      (q('compra-1') as HTMLElement).click();

      expect(component.materiales).toBe(antes);
    });

    it('Quitar_el_proveedor_deja_el_guion_en_la_fila', () => {
      configurar();
      spyOn((component as any).dialog, 'open').and.returnValue({
        afterClosed: () => of(mat(2, { estatus: 'Listo', seccion: 'TABLERO PRINCIPAL', proveedorId: null, proveedorNombre: null, notas: null }))
      } as any);

      (q('compra-2') as HTMLElement).click();
      fixture.detectChanges();

      expect(q('proveedor-2')?.textContent?.trim()).toBe('—');
      expect(q('observaciones-2')?.textContent?.trim()).toBe('—');
    });
  });

  describe('detalle expandible', () => {
    it('Expandir_muestra_el_detalle_y_se_conserva_al_recargar', () => {
      configurar();
      (q('expandir-2') as HTMLElement).click();
      fixture.detectChanges();
      expect(q('detalle-2')).not.toBeNull();

      component.cargar();
      fixture.detectChanges();
      expect(q('detalle-2')).not.toBeNull();
      expect(q('detalle-1')).toBeNull();
    });
  });

  describe('Excel', () => {
    it('Importar_desde_Excel_abre_el_dialogo_y_aplica_la_trazabilidad_devuelta', () => {
      configurar(resumen([]));
      const nueva = resumen(productos());
      spyOn(Swal, 'fire');
      const abrir = spyOn((component as any).dialog, 'open').and.returnValue({
        afterClosed: () => of({ importado: true, resultado: { importacion: { agregados: 5, actualizados: 0, sinCambio: 0, noEncontradosEnArchivo: 0, omitidas: 0 }, trazabilidad: nueva } })
      } as any);

      (q('btn-importar-excel') as HTMLElement).click();
      fixture.detectChanges();

      expect(abrir).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { idSeguimiento: 4 } }));
      expect(idsFilas().length).toBe(5);
    });

    it('Si_se_cierra_el_dialogo_sin_importar_no_cambia_nada', () => {
      configurar();
      spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
      const antes = component.materiales;

      (q('btn-importar-excel') as HTMLElement).click();

      expect(component.materiales).toBe(antes);
    });
  });

  describe('alta y edición manual', () => {
    function llenar(descripcion: string, cantidad = 3): void {
      component.materialFormDescripcion = descripcion;
      component.materialFormCantidad = cantidad;
      component.materialFormPrecioUnitario = 10;
    }

    it('Agregar_manual_manda_el_payload_y_aplica_la_respuesta', () => {
      configurar(resumen([]));
      spyOn(Swal, 'fire');
      servicio.guardarMaterial.and.returnValue(of(resumen(productos())));

      component.abrirModalNuevoMaterial(1);
      fixture.detectChanges();
      llenar('Cable THW 12');
      component.materialFormCodigo = ' CAB-1 ';
      component.guardarMaterialSubmit();

      const enviado = servicio.guardarMaterial.calls.mostRecent().args[0];
      expect(enviado).toEqual(jasmine.objectContaining({
        idSeguimiento: 4, tipoItem: 1, codigoProducto: 'CAB-1', descripcion: 'Cable THW 12', unidadMedida: 'PZA',
        cantidadCotizada: 3, precioUnitarioCotizado: 10, importeCotizado: 30
      }));
      expect(enviado.idMaterial).toBeUndefined();
      expect(enviado.marca).toBeUndefined();
      expect(enviado.seccion).toBeUndefined();
      expect(component.showMaterialModal).toBeFalse();
      fixture.detectChanges();
      expect(idsFilas().length).toBe(5);
    });

    it('El_modal_ya_no_ofrece_buscar_en_el_catalogo_de_CONTPAQ', () => {
      configurar();
      component.abrirModalNuevoMaterial(1);
      fixture.detectChanges();

      expect(q('modal-material')).not.toBeNull();
      expect(q('modal-material')?.textContent).not.toContain('CONTPAQ');
    });

    it('Servicio_arranca_con_unidad_SERV_y_tipo_2', () => {
      configurar();
      component.abrirModalNuevoMaterial(2);
      expect(component.materialFormTipoItem).toBe(2);
      expect(component.materialFormUnidad).toBe('SERV');
    });

    it('Guardar_esta_deshabilitado_sin_descripcion_o_con_cantidad_cero', () => {
      configurar();
      component.abrirModalNuevoMaterial(1);
      fixture.detectChanges();
      expect((q('btn-guardar-modal') as HTMLButtonElement).disabled).toBeTrue();

      llenar('Algo', 0);
      fixture.detectChanges();
      expect((q('btn-guardar-modal') as HTMLButtonElement).disabled).toBeTrue();

      llenar('Algo', 1);
      fixture.detectChanges();
      expect((q('btn-guardar-modal') as HTMLButtonElement).disabled).toBeFalse();
    });

    it('Editar_sin_tocar_marca_ni_seccion_las_manda_tal_cual_y_no_se_pierden', () => {
      configurar(resumen([mat(1, { marca: 'Marca A', seccion: 'TABLERO PRINCIPAL' })]));
      spyOn(Swal, 'fire');
      servicio.guardarMaterial.and.returnValue(of(resumen([mat(1)])));

      component.editarMaterial(component.materiales[0]);
      component.materialFormCantidad = 9;
      component.guardarMaterialSubmit();

      const enviado = servicio.guardarMaterial.calls.mostRecent().args[0];
      expect(enviado.idMaterial).toBe(1);
      expect(enviado.cantidadCotizada).toBe(9);
      // Se mandan tal cual estaban (no se pierden); lo que importa es que NO viaje vacío
      expect(enviado.marca).toBe('Marca A');
      expect(enviado.seccion).toBe('TABLERO PRINCIPAL');
    });

    it('Editar_y_vaciar_la_marca_manda_cadena_vacia_para_limpiarla', () => {
      configurar(resumen([mat(1, { marca: 'Marca A' })]));
      spyOn(Swal, 'fire');
      servicio.guardarMaterial.and.returnValue(of(resumen([mat(1)])));

      component.editarMaterial(component.materiales[0]);
      component.materialFormMarca = '   ';
      component.guardarMaterialSubmit();

      expect(servicio.guardarMaterial.calls.mostRecent().args[0].marca).toBe('');
    });

    it('Editar_un_producto_sin_marca_que_se_deja_vacia_manda_undefined', () => {
      configurar(resumen([mat(1, { marca: null, seccion: null })]));
      spyOn(Swal, 'fire');
      servicio.guardarMaterial.and.returnValue(of(resumen([mat(1)])));

      component.editarMaterial(component.materiales[0]);
      component.guardarMaterialSubmit();

      const enviado = servicio.guardarMaterial.calls.mostRecent().args[0];
      expect(enviado.marca).toBeUndefined();
      expect(enviado.seccion).toBeUndefined();
    });

    it('Un_error_del_API_al_guardar_se_ve_dentro_del_modal_sin_perder_lo_escrito', () => {
      configurar();
      servicio.guardarMaterial.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { mensaje: 'Datos incompletos.' } })));
      component.abrirModalNuevoMaterial(1);
      llenar('Cable THW 12');

      component.guardarMaterialSubmit();
      fixture.detectChanges();

      expect(q('error-modal')?.textContent).toContain('Datos incompletos.');
      expect(component.showMaterialModal).toBeTrue();
      expect(component.materialFormDescripcion).toBe('Cable THW 12');
      expect(component.isSavingMaterial).toBeFalse();
    });

    it('Doble_clic_en_Guardar_envia_una_sola_peticion', () => {
      configurar();
      const respuesta = new Subject<ResumenTrazabilidadProyecto>();
      servicio.guardarMaterial.and.returnValue(respuesta);
      component.abrirModalNuevoMaterial(1);
      llenar('Cable THW 12');

      component.guardarMaterialSubmit();
      component.guardarMaterialSubmit();

      expect(servicio.guardarMaterial).toHaveBeenCalledTimes(1);
    });

    it('Eliminar_confirma_con_texto_fijo_y_aplica_la_respuesta', fakeAsync(() => {
      configurar();
      const swal = confirmar();
      servicio.eliminarMaterial.and.returnValue(of(resumen(productos().slice(1))));

      component.eliminarMaterialItem(component.materiales[0]);
      flushMicrotasks();
      fixture.detectChanges();

      expect(servicio.eliminarMaterial).toHaveBeenCalledOnceWith(1);
      expect(swal.calls.first().args[0]).toEqual(jasmine.objectContaining({ text: 'Se quitará de la lista de materiales de este proyecto.' }));
      expect(idsFilas().length).toBe(4);
    }));
  });
});
