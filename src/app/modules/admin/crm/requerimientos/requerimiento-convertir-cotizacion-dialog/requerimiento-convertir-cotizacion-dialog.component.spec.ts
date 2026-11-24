import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import {
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

const UNIDADES = [
  { unidadId: 1, nombre: 'Unidad Uno Ficticia', descripcion: 'x' },
  { unidadId: 2, nombre: 'Unidad Dos Ficticia', descripcion: 'x' }
];

const RESULTADO: ConvertirRequerimientoResultado = {
  cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', tipo: 'CT', etapa: 'Borrador',
  requerimientoId: 57, requerimientoFolio: 'REQ-2026-0057'
};

describe('RequerimientoConvertirCotizacionDialogComponent', () => {
  let fixture: ComponentFixture<RequerimientoConvertirCotizacionDialogComponent>;
  let component: RequerimientoConvertirCotizacionDialogComponent;
  let servicio: jasmine.SpyObj<RequerimientosService>;
  let proyecto: jasmine.SpyObj<ProjectService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<RequerimientoConvertirCotizacionDialogComponent>>;

  function configurar(
    requerimiento: Requerimiento = req(),
    unidades$: Observable<any[]> = of(UNIDADES)
  ): void {
    servicio = jasmine.createSpyObj('RequerimientosService', ['convertirACotizacion']);
    proyecto = jasmine.createSpyObj('ProjectService', ['getUnidadesDeNegocio']);
    proyecto.getUnidadesDeNegocio.and.returnValue(unidades$);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [RequerimientoConvertirCotizacionDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { requerimiento } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: RequerimientosService, useValue: servicio },
        { provide: ProjectService, useValue: proyecto }
      ]
    });
    fixture = TestBed.createComponent(RequerimientoConvertirCotizacionDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
  }

  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  const boton = (testid: string): HTMLButtonElement => q(testid) as HTMLButtonElement;

  function confirmar(aceptar = true): jasmine.Spy {
    return spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: aceptar } as any));
  }

  describe('unidades de negocio', () => {
    it('Carga_las_unidades_y_las_ofrece_para_elegir', () => {
      configurar();

      expect(proyecto.getUnidadesDeNegocio).toHaveBeenCalledTimes(1);
      expect(component.unidades.map(u => u.unidadId)).toEqual([1, 2]);
      expect(component.cargandoUnidades).toBeFalse();
    });

    it('Con_varias_unidades_hay_que_elegir_una_antes_de_convertir', () => {
      configurar();

      expect(component.unidadControl.value).toBeNull();
      expect(boton('btn-convertir').disabled).toBeTrue();

      component.unidadControl.setValue(2);
      fixture.detectChanges();

      expect(boton('btn-convertir').disabled).toBeFalse();
    });

    it('Con_una_sola_unidad_queda_elegida_sola', () => {
      configurar(req(), of([UNIDADES[1]]));

      expect(component.unidadControl.value).toBe(2);
      expect(component.puedeConvertir).toBeTrue();
    });

    it('Mientras_cargan_las_unidades_no_se_puede_convertir', () => {
      const pendiente = new Subject<any[]>();
      configurar(req(), pendiente);
      component.unidadControl.setValue(2);

      expect(component.cargandoUnidades).toBeTrue();
      expect(component.puedeConvertir).toBeFalse();

      pendiente.next(UNIDADES);
      pendiente.complete();
      expect(component.puedeConvertir).toBeTrue();
    });

    it('Un_error_al_cargar_las_unidades_avisa_y_permite_reintentar', () => {
      configurar(req(), throwError(() => new HttpErrorResponse({ status: 500 })));
      fixture.detectChanges();

      expect(q('error-unidades')).not.toBeNull();
      expect(component.puedeConvertir).toBeFalse();

      proyecto.getUnidadesDeNegocio.and.returnValue(of(UNIDADES));
      boton('btn-reintentar-unidades').click();
      fixture.detectChanges();

      expect(q('error-unidades')).toBeNull();
      expect(component.unidades.length).toBe(2);
    });

    it('Ignora_las_filas_sin_id_en_el_catalogo', () => {
      configurar(req(), of([{ nombre: 'Sin id' }, null, UNIDADES[0], UNIDADES[1]] as any[]));

      expect(component.unidades.map(u => u.unidadId)).toEqual([1, 2]);
    });
  });

  describe('lo que ya no hay', () => {
    it('No_pide_folio_ni_busca_en_CONTPAQ', () => {
      configurar();

      expect(q('input-folio')).toBeNull();
      expect(q('btn-buscar')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('CONTPAQ');
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
      component.unidadControl.setValue(2);
      fixture.detectChanges();
    });

    it('Convertir_envia_solo_requerimientoId_tipo_y_unidad_elegida', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(of(RESULTADO));
      component.tipoControl.setValue('CE'); // Se puede elegir Estratégica

      component.convertir();
      flushMicrotasks();

      expect(servicio.convertirACotizacion).toHaveBeenCalledOnceWith({
        requerimientoId: 57, tipo: 'CE', unidadDeNegocioId: 2
      });
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

    it('409_con_cotizacionVinculada_muestra_el_folio_existente_y_no_permite_convertir', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: {
          mensaje: 'El requerimiento ya tiene una cotización vinculada.',
          cotizacionVinculada: { cotizacionProductosId: 300, folioSgc: 'COT-2026-0040', folioContpaq: null, tipo: 'CS', etapa: 'Borrador' }
        }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('aviso-ya-convertida')?.textContent).toContain('COT-2026-0040');
      expect(q('error-convertir')?.textContent).toContain('ya tiene una cotización');
      expect(boton('btn-convertir').disabled).toBeTrue();
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

    it('404_de_unidad_inexistente_muestra_el_mensaje_y_conserva_lo_elegido', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 404, error: { mensaje: 'La unidad de negocio no existe.' }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('La unidad de negocio no existe.');
      expect(component.unidadControl.value).toBe(2);
      expect(component.tipoControl.value).toBe('CS');
      expect(dialogRef.close).not.toHaveBeenCalled();
    }));

    it('Error_del_API_muestra_el_mensaje_dentro_del_dialogo', fakeAsync(() => {
      confirmar();
      servicio.convertirACotizacion.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { mensaje: 'El tipo de cotización no es válido.' }
      })));

      component.convertir();
      flushMicrotasks();
      fixture.detectChanges();

      expect(q('error-convertir')?.textContent).toContain('El tipo de cotización no es válido.');
      expect(dialogRef.close).not.toHaveBeenCalled();
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
