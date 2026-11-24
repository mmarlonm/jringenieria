import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import {
  RequerimientoConvertirCotizacionDialogComponent
} from './requerimiento-convertir-cotizacion-dialog.component';
import {
  BuscarFolioRespuesta,
  CoincidenciaFolio,
  ConvertirRequerimientoResultado,
  Requerimiento,
  RequerimientosService
} from '../requerimientos.service';

describe('RequerimientoConvertirCotizacionDialogComponent', () => {
  let reqService: jasmine.SpyObj<RequerimientosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<RequerimientoConvertirCotizacionDialogComponent>>;
  let fixture: ComponentFixture<RequerimientoConvertirCotizacionDialogComponent>;
  let component: RequerimientoConvertirCotizacionDialogComponent;

  const baseReq: Requerimiento = {
    id: 57,
    folio: 'REQ-2026-0057',
    fechaRecepcion: '2026-11-20T10:00:00',
    nombreContacto: 'Contacto Ficticio',
    empresa: 'Cliente Ficticio SA de CV',
    estatus: 'Aprobado para cotización',
    rutaAtencion: 'Comercial',
    titulo: 'Tablero'
  } as Requerimiento;

  const coincidencia1: CoincidenciaFolio = {
    cotizacionProductosId: 311,
    unidadDeNegocioId: 2,
    unidadDeNegocioNombre: 'Querétaro',
    folioContpaq: '1234',
    nombreCliente: 'Cliente Ficticio SA de CV',
    rfc: 'XAXX010101000',
    total: 15234.5,
    fecha: '2026-11-20T00:00:00',
    tieneCapaSgc: false,
    yaVinculadaARequerimiento: false,
    requerimientoFolio: null
  };

  const coincidencia2: CoincidenciaFolio = {
    cotizacionProductosId: 312,
    unidadDeNegocioId: 1,
    unidadDeNegocioNombre: 'Matriz',
    folioContpaq: '1234',
    nombreCliente: 'Cliente Ficticio SA de CV',
    rfc: 'XAXX010101000',
    total: 18500,
    fecha: '2026-11-21T00:00:00',
    tieneCapaSgc: false,
    yaVinculadaARequerimiento: false,
    requerimientoFolio: null
  };

  const resultadoOk: ConvertirRequerimientoResultado = {
    cotizacionProductosId: 311,
    folioSgc: 'COT-2026-0042',
    folioContpaq: '1234',
    tipo: 'CT',
    etapa: 'Borrador',
    requerimientoId: 57,
    requerimientoFolio: 'REQ-2026-0057'
  };

  const q = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  function crear(req: Requerimiento = baseReq): void {
    TestBed.configureTestingModule({
      imports: [RequerimientoConvertirCotizacionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { requerimiento: req } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: RequerimientosService, useValue: reqService }
      ]
    });

    fixture = TestBed.createComponent(RequerimientoConvertirCotizacionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    reqService = jasmine.createSpyObj('RequerimientosService', ['buscarFolioContpaq', 'convertirACotizacion']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
  });

  it('Pide_el_folio_de_CONTPAQ_con_su_etiqueta_y_ayuda', () => {
    crear();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Folio de CONTPAQ');
    expect(texto).toContain('Escribe el folio de la cotización en CONTPAQ. Debe estar ya sincronizada.');
  });

  it('Buscar_esta_deshabilitado_con_folio_vacio_o_invalido', () => {
    crear();
    const btn = () => q('btn-buscar') as HTMLButtonElement;

    component.folioControl.setValue('');
    fixture.detectChanges();
    expect(btn().disabled).toBeTrue();

    component.folioControl.setValue('   ');
    fixture.detectChanges();
    expect(btn().disabled).toBeTrue();

    component.folioControl.setValue('abc def');
    fixture.detectChanges();
    expect(btn().disabled).toBeTrue();

    component.folioControl.setValue('A'.repeat(31));
    fixture.detectChanges();
    expect(btn().disabled).toBeTrue();

    component.folioControl.setValue('COT-1234');
    fixture.detectChanges();
    expect(btn().disabled).toBeFalse();
  });

  it('Buscar_manda_el_folio_recortado', () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    crear();

    component.folioControl.setValue('  1234  ');
    fixture.detectChanges();
    (q('btn-buscar') as HTMLButtonElement).click();

    expect(reqService.buscarFolioContpaq).toHaveBeenCalledWith('1234');
  });

  it('Una_sola_coincidencia_no_vinculada_queda_elegida', () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    expect(component.seleccionada).toEqual(coincidencia1);
    expect((q('btn-convertir') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('Varias_coincidencias_obligan_a_elegir', () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1, coincidencia2] }));
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    expect(component.seleccionada).toBeNull();
    expect((q('btn-convertir') as HTMLButtonElement).disabled).toBeTrue();

    const lista = q('lista-coincidencias')!.textContent!;
    expect(lista).toContain('Cliente Ficticio SA de CV');
    expect(lista).toContain('XAXX010101000');
    expect(lista).toContain('1234');
    expect(lista).toContain('Querétaro');
    expect(lista).toContain('Matriz');

    (q('coincidencia-1') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.seleccionada).toEqual(coincidencia2);
    expect((q('btn-convertir') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('Una_ya_vinculada_se_ve_deshabilitada_con_el_folio_del_requerimiento', () => {
    const vinculada: CoincidenciaFolio = {
      ...coincidencia1,
      tieneCapaSgc: true,
      yaVinculadaARequerimiento: true,
      requerimientoFolio: 'REQ-2026-0001'
    };
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [vinculada] }));
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    const btnCoinc = q('coincidencia-0') as HTMLButtonElement;
    expect(btnCoinc.disabled).toBeTrue();
    expect(q('ya-vinculada')?.textContent).toContain('REQ-2026-0001');
    expect((q('btn-convertir') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('Sin_coincidencias_dice_que_no_esta_sincronizada_y_que_se_trae_lo_de_los_ultimos_15_dias', () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '9999', coincidencias: [] } as BuscarFolioRespuesta));
    crear();

    component.folioControl.setValue('9999');
    component.buscar();
    fixture.detectChanges();

    const msg = q('sin-coincidencias')?.textContent;
    expect(msg).toContain('No se encontró una cotización sincronizada con ese folio.');
    expect(msg).toContain('últimos 15 días');
  });

  it('Editar_el_folio_descarta_los_resultados', () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();
    expect(component.seleccionada).toEqual(coincidencia1);

    component.folioControl.setValue('1235');
    fixture.detectChanges();

    expect(component.coincidencias).toBeNull();
    expect(component.seleccionada).toBeNull();
    expect(q('lista-coincidencias')).toBeNull();
  });

  it('Convertir_esta_deshabilitado_sin_eleccion', () => {
    crear();
    expect((q('btn-convertir') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('Convertir_envia_la_cotizacion_elegida_y_el_tipo', async () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    reqService.convertirACotizacion.and.returnValue(of(resultadoOk));
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    component.tipoControl.setValue('CE');
    fixture.detectChanges();

    await component.convertir();

    expect(reqService.convertirACotizacion).toHaveBeenCalledWith({
      requerimientoId: 57,
      tipo: 'CE',
      cotizacionProductosId: 311
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ convertido: true, resultado: resultadoOk });
  });

  it('409_ya_vinculada_muestra_el_mensaje', async () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    reqService.convertirACotizacion.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: { mensaje: 'La cotización ya está vinculada al requerimiento REQ-2026-0001.' }
      }))
    );
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    await component.convertir();
    fixture.detectChanges();

    expect(q('error-convertir')?.textContent).toContain('La cotización ya está vinculada al requerimiento REQ-2026-0001.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('409_con_cotizacionVinculada_muestra_el_folio_SGC_existente', async () => {
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    reqService.convertirACotizacion.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: {
          mensaje: 'El requerimiento ya tiene una cotización vinculada.',
          cotizacionVinculada: { cotizacionProductosId: 300, folioSgc: 'COT-2026-0040', folioContpaq: '1234', tipo: 'CS', etapa: 'Borrador' }
        }
      }))
    );
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    await component.convertir();
    fixture.detectChanges();

    expect(q('aviso-ya-convertida')?.textContent).toContain('COT-2026-0040');
    expect(q('aviso-ya-convertida')?.textContent).toContain('1234');
  });

  it('Doble_clic_envia_una_sola_peticion', async () => {
    const subj = new Subject<ConvertirRequerimientoResultado>();
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    reqService.convertirACotizacion.and.returnValue(subj.asObservable());
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    const p1 = component.convertir();
    const p2 = component.convertir();
    await Promise.all([p1, p2]);

    expect(reqService.convertirACotizacion).toHaveBeenCalledTimes(1);
    subj.next(resultadoOk);
    subj.complete();
  });

  it('Mientras_convierte_no_se_puede_cerrar', async () => {
    const subj = new Subject<ConvertirRequerimientoResultado>();
    reqService.buscarFolioContpaq.and.returnValue(of({ folio: '1234', coincidencias: [coincidencia1] }));
    reqService.convertirACotizacion.and.returnValue(subj.asObservable());
    crear();

    component.folioControl.setValue('1234');
    component.buscar();
    fixture.detectChanges();

    const promesa = component.convertir();
    await promesa;
    fixture.detectChanges();

    expect(component.convirtiendo).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
    expect((q('btn-cancelar') as HTMLButtonElement).disabled).toBeTrue();

    component.cancelar();
    expect(dialogRef.close).not.toHaveBeenCalled();

    subj.next(resultadoOk);
    subj.complete();
  });
});
