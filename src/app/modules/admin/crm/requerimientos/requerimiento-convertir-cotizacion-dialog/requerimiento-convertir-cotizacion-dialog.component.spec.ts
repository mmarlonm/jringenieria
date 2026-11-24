import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import {
  BuscarFolioContpaqRespuesta,
  CoincidenciaFolioContpaq,
  ConvertirRequerimientoResultado,
  Requerimiento,
  RequerimientosService
} from '../requerimientos.service';
import { RequerimientoConvertirCotizacionDialogComponent } from './requerimiento-convertir-cotizacion-dialog.component';

function req(overrides: Partial<Requerimiento> = {}): Requerimiento {
  return {
    id: 57,
    folio: 'REQ-2026-0057',
    fechaRecepcion: '2026-11-20T10:00:00',
    nombreContacto: 'Contacto Ficticio',
    empresa: 'Cliente Ficticio SA de CV',
    descripcion: 'Suministro de tableros',
    estatus: 'Aprobado para cotización',
    fechaRegistro: '2026-11-20T10:00:00',
    faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false,
    faltaDatosElectricos: false, faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false,
    faltaNormativa: false, faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false,
    ...overrides
  };
}

function coincidencia(overrides: Partial<CoincidenciaFolioContpaq> = {}): CoincidenciaFolioContpaq {
  return {
    unidadDeNegocioId: 2, unidadDeNegocioNombre: 'Unidad Ficticia', idDocumento: 98765, serie: 'COT', folio: '1234',
    fecha: '2026-11-20T00:00:00', cliente: 'Cliente Ficticio SA de CV', rfc: 'XAXX010101000', total: 15234.5,
    cotizacionProductosId: null, yaVinculadaARequerimiento: false, requerimientoFolio: null,
    ...overrides
  };
}

const RESULTADO: ConvertirRequerimientoResultado = {
  cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', tipo: 'CT', etapa: 'Borrador',
  folioContpaq: 'COT-1234', requerimientoId: 57, requerimientoFolio: 'REQ-2026-0057'
};

describe('RequerimientoConvertirCotizacionDialogComponent', () => {
  let fixture: ComponentFixture<RequerimientoConvertirCotizacionDialogComponent>;
  let component: RequerimientoConvertirCotizacionDialogComponent;
  let servicio: jasmine.SpyObj<RequerimientosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<RequerimientoConvertirCotizacionDialogComponent>>;

  function configurar(requerimiento: Requerimiento = req()): void {
    servicio = jasmine.createSpyObj('RequerimientosService', ['buscarFolioContpaq', 'convertirACotizacion']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [RequerimientoConvertirCotizacionDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { requerimiento } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: RequerimientosService, useValue: servicio }
      ]
    });
    fixture = TestBed.createComponent(RequerimientoConvertirCotizacionDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
  }

  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  const boton = (testid: string): HTMLButtonElement => q(testid) as HTMLButtonElement;

  function buscarYEsperar(respuesta: BuscarFolioContpaqRespuesta, folio = '1234'): void {
    servicio.buscarFolioContpaq.and.returnValue(of(respuesta));
    component.folioControl.setValue(folio);
    component.buscar();
    fixture.detectChanges();
  }

  function confirmar(aceptar = true): jasmine.Spy {
    return spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: aceptar } as any));
  }

  describe('búsqueda', () => {
    beforeEach(() => configurar());

    it('Buscar_deshabilitado_con_folio_vacio_o_invalido', () => {
      expect(boton('btn-buscar').disabled).toBeTrue();

      component.folioControl.setValue('ab cd');
      fixture.detectChanges();
      expect(boton('btn-buscar').disabled).toBeTrue();

      component.folioControl.setValue("1'; DROP");
      fixture.detectChanges();
      expect(boton('btn-buscar').disabled).toBeTrue();

      component.folioControl.setValue('COT-1234');
      fixture.detectChanges();
      expect(boton('btn-buscar').disabled).toBeFalse();
    });

    it('Buscar_muestra_cliente_total_y_fecha_de_la_coincidencia', () => {
      buscarYEsperar({ folio: '1234', coincidencias: [coincidencia()] });

      const tarjeta = q('coincidencia-0') as HTMLElement;
      expect(tarjeta.textContent).toContain('Cliente Ficticio SA de CV');
      expect(tarjeta.textContent).toContain('$15,234.50');
      expect(tarjeta.textContent).toContain('20/11/2026');
      expect(tarjeta.textContent).toContain('COT-1234');
    });

    it('Buscar_manda_el_folio_sin_espacios_alrededor', () => {
      buscarYEsperar({ folio: '1234', coincidencias: [] }, '  1234  ');
      expect(servicio.buscarFolioContpaq).toHaveBeenCalledWith('1234');
    });

    it('Una_sola_coincidencia_queda_seleccionada_y_permite_convertir', () => {
      buscarYEsperar({ folio: '1234', coincidencias: [coincidencia()] });
      expect(component.seleccionada?.idDocumento).toBe(98765);
      expect(boton('btn-convertir').disabled).toBeFalse();
    });

    it('Sin_coincidencias_muestra_mensaje_y_no_permite_convertir', () => {
      buscarYEsperar({ folio: '9999', coincidencias: [] }, '9999');
      expect(q('sin-coincidencias')?.textContent).toContain('No se encontró ese folio');
      expect(boton('btn-convertir').disabled).toBeTrue();
    });

    it('Coincidencia_ya_vinculada_avisa_y_no_permite_convertir', () => {
      buscarYEsperar({
        folio: '1234',
        coincidencias: [coincidencia({ yaVinculadaARequerimiento: true, requerimientoFolio: 'REQ-2026-0020' })]
      });
      expect(q('ya-vinculada')?.textContent).toContain('REQ-2026-0020');
      expect(boton('btn-convertir').disabled).toBeTrue();
    });

    it('Varias_coincidencias_obligan_a_elegir_antes_de_convertir', () => {
      buscarYEsperar({
        folio: '1234',
        coincidencias: [coincidencia({ unidadDeNegocioId: 2 }), coincidencia({ unidadDeNegocioId: 3, unidadDeNegocioNombre: 'Otra Unidad' })]
      });
      expect(component.seleccionada).toBeNull();
      expect(boton('btn-convertir').disabled).toBeTrue();

      (q('coincidencia-1') as HTMLElement).click();
      fixture.detectChanges();
      expect(component.seleccionada?.unidadDeNegocioId).toBe(3);
      expect(boton('btn-convertir').disabled).toBeFalse();
    });

    it('Cambiar_el_folio_despues_de_buscar_descarta_los_resultados', () => {
      buscarYEsperar({ folio: '1234', coincidencias: [coincidencia()] });
      expect(boton('btn-convertir').disabled).toBeFalse();

      component.folioControl.setValue('5678');
      fixture.detectChanges();
      expect(component.coincidencias).toBeNull();
      expect(boton('btn-convertir').disabled).toBeTrue();
    });

    it('Un_error_de_busqueda_se_muestra_dentro_del_dialogo_y_conserva_el_folio', () => {
      servicio.buscarFolioContpaq.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 503, error: { mensaje: 'No se pudo consultar CONTPAQi. Intenta de nuevo.' }
      })));
      component.folioControl.setValue('1234');
      component.buscar();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('No se pudo consultar CONTPAQi');
      expect(component.folioControl.value).toBe('1234');
      expect(boton('btn-buscar').disabled).toBeFalse();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('tipo sugerido', () => {
    it('Tipo_sugerido_CS_si_no_hay_caso_ni_ruta_tecnica', () => {
      configurar(req({ seguimientoProyectoId: undefined, rutaAtencion: 'Comercial' }));
      expect(component.tipoControl.value).toBe('CS');
    });

    it('Tipo_sugerido_CT_si_hay_caso_en_ingenieria', () => {
      configurar(req({ seguimientoProyectoId: 42 }));
      expect(component.tipoControl.value).toBe('CT');
    });

    it('Tipo_sugerido_CT_si_la_ruta_es_tecnica', () => {
      configurar(req({ rutaAtencion: 'Técnica' }));
      expect(component.tipoControl.value).toBe('CT');
    });
  });

  describe('conversión', () => {
    beforeEach(() => {
      configurar();
      buscarYEsperar({ folio: '1234', coincidencias: [coincidencia()] });
    });

    /** Cambia la única coincidencia mostrada y elegida (para probar series raras sin rehacer el diálogo). */
    function elegirCoincidencia(cambios: Partial<CoincidenciaFolioContpaq>): void {
      component.coincidencias = [coincidencia(cambios)];
      component.seleccionada = component.coincidencias[0];
    }

    it('Convertir_envia_requerimientoId_folio_tipo_y_unidad_elegida', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));
      component.tipoControl.setValue('CE'); // Se puede elegir Estratégica

      component.convertir();
      flushMicrotasks();

      expect(servicio.convertirACotizacion).toHaveBeenCalledOnceWith({
        requerimientoId: 57, folioContpaq: 'COT-1234', unidadDeNegocioId: 2, tipo: 'CE'
      });
    }));

    it('Sin_serie_en_la_coincidencia_se_manda_el_folio_tecleado', fakeAsync(() => {
      elegirCoincidencia({ serie: null });
      confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));

      component.convertir();
      flushMicrotasks();

      expect(servicio.convertirACotizacion).toHaveBeenCalledOnceWith(jasmine.objectContaining({ folioContpaq: '1234' }));
    }));

    ['COT/1', 'A--B', '-COT', 'COT-', 'A B', 'S'.repeat(30)].forEach((serie, i) => {
      it(`Una_serie_que_el_API_no_acepta_no_se_antepone_al_folio_${i + 1}`, fakeAsync(() => {
        elegirCoincidencia({ serie });
        confirmar();
        servicio.convertirACotizacion.and.returnValue(of(RESULTADO));

        component.convertir();
        flushMicrotasks();

        expect(servicio.convertirACotizacion).toHaveBeenCalledOnceWith(jasmine.objectContaining({ folioContpaq: '1234' }));
      }));
    });

    it('Con_el_mismo_folio_en_dos_series_de_una_unidad_se_convierte_la_serie_elegida', fakeAsync(() => {
      component.coincidencias = [
        coincidencia({ idDocumento: 100, serie: 'COT', folio: '500' }),
        coincidencia({ idDocumento: 104, serie: 'CTZ', folio: '500' })
      ];
      component.seleccionada = null;
      component.seleccionar(component.coincidencias[1]);
      confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));

      component.convertir();
      flushMicrotasks();

      expect(servicio.convertirACotizacion).toHaveBeenCalledOnceWith(jasmine.objectContaining({ folioContpaq: 'CTZ-500', unidadDeNegocioId: 2 }));
    }));

    it('409_de_mas_de_una_serie_muestra_el_mensaje_y_deja_reintentar', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409, error: { mensaje: 'El folio existe en más de una serie de esta unidad. Escribe la serie, por ejemplo COT-500.' }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('más de una serie');
      expect(component.seleccionada).not.toBeNull();
      expect(boton('btn-convertir').disabled).toBeFalse();
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));

    it('409_de_conversion_en_curso_muestra_el_mensaje_y_deja_reintentar', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409, error: { mensaje: 'Hay otra conversión en curso. Intenta de nuevo.' }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('Hay otra conversión en curso');
      expect(boton('btn-convertir').disabled).toBeFalse();
    }));

    it('Tras_editar_el_folio_y_volver_a_buscar_se_convierte_el_folio_nuevo', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));
      // La edición descarta lo mostrado; se vuelve a buscar y se convierte lo nuevo.
      component.folioControl.setValue('5678');
      buscarYEsperar({ folio: '5678', coincidencias: [coincidencia({ folio: '5678', unidadDeNegocioId: 3 })] }, '5678');

      component.convertir();
      flushMicrotasks();

      expect(servicio.convertirACotizacion).toHaveBeenCalledOnceWith(jasmine.objectContaining({ folioContpaq: 'COT-5678', unidadDeNegocioId: 3 }));
    }));

    it('Doble_clic_en_Convertir_envia_una_sola_peticion', fakeAsync(() => {
      const swal = confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));

      component.convertir();
      component.convertir(); // segundo clic mientras se decide
      flushMicrotasks();

      expect(swal).toHaveBeenCalledTimes(1);
      expect(servicio.convertirACotizacion).toHaveBeenCalledTimes(1);
    }));

    it('Cancelar_en_la_confirmacion_no_envia_nada_y_deja_convertir_de_nuevo', fakeAsync(() => {
      confirmar(false);

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(servicio.convertirACotizacion).not.toHaveBeenCalled();
      expect(boton('btn-convertir').disabled).toBeFalse();
      expect(dialogRef.disableClose).toBeFalse();
    }));

    it('Mientras_se_convierte_no_se_puede_cerrar_ni_cancelar_y_si_falla_se_libera', fakeAsync(() => {
      confirmar();
      const respuesta = new Subject<ConvertirRequerimientoResultado>();
      servicio.convertirACotizacion.and.returnValue(respuesta);

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(dialogRef.disableClose).toBeTrue();
      expect(boton('btn-cancelar').disabled).toBeTrue();
      component.cancelar();
      expect(dialogRef.close).not.toHaveBeenCalled();

      respuesta.error(new HttpErrorResponse({ status: 500, error: { mensaje: 'Falló.' } }));
      fixture.detectChanges();

      expect(dialogRef.disableClose).toBeFalse();
      expect(boton('btn-cancelar').disabled).toBeFalse();
    }));

    it('Exito_cierra_con_convertido_true_y_el_resultado', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));

      component.convertir();
      flushMicrotasks();

      expect(dialogRef.close).toHaveBeenCalledOnceWith({ convertido: true, resultado: RESULTADO });
    }));

    it('409_con_coincidencias_pide_elegir_unidad_y_reintenta_con_la_elegida', fakeAsync(() => {
      confirmar();
      const otras = [coincidencia({ unidadDeNegocioId: 2 }), coincidencia({ unidadDeNegocioId: 3, unidadDeNegocioNombre: 'Otra Unidad' })];
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409, error: { mensaje: 'El folio existe en más de una unidad de negocio.', coincidencias: otras }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('más de una unidad');
      expect(component.seleccionada).toBeNull();
      expect(boton('btn-convertir').disabled).toBeTrue();
      expect(fixture.nativeElement.querySelectorAll('[data-testid^="coincidencia-"]').length).toBe(2);

      // Elige la segunda y reintenta
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));
      (q('coincidencia-1') as HTMLElement).click();
      component.convertir();
      flushMicrotasks();

      expect(servicio.convertirACotizacion.calls.mostRecent().args[0].unidadDeNegocioId).toBe(3);
      expect(dialogRef.close).toHaveBeenCalled();
    }));

    it('409_con_cotizacionVinculada_muestra_el_folio_existente_y_no_permite_convertir', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: {
          mensaje: 'Este requerimiento ya tiene una cotización.',
          cotizacionVinculada: { cotizacionProductosId: 300, folioSgc: 'COT-2026-0040', folioContpaq: 'COT-1200', tipo: 'CS', etapa: 'Borrador' }
        }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('aviso-ya-convertida')?.textContent).toContain('COT-2026-0040');
      expect(boton('btn-convertir').disabled).toBeTrue();
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));

    it('Error_del_API_muestra_el_mensaje_dentro_del_dialogo_sin_perder_el_folio', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { mensaje: 'El tipo de cotización no es válido.' }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('El tipo de cotización no es válido.');
      expect(component.folioControl.value).toBe('1234');
      expect(component.seleccionada).not.toBeNull();
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));

    it('503_muestra_el_mensaje_y_permite_reintentar', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 503, error: { mensaje: 'No se pudo consultar CONTPAQi. Intenta de nuevo.' }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('No se pudo consultar CONTPAQi');
      expect(boton('btn-convertir').disabled).toBeFalse();
    }));

    it('Un_error_sin_mensaje_muestra_un_texto_generico_en_espanol', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: 'Internal Server Error <b>x</b>' })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('No se pudo convertir el requerimiento');
      expect(q('error-convertir')?.textContent).not.toContain('Internal Server Error');
    }));
  });
});
