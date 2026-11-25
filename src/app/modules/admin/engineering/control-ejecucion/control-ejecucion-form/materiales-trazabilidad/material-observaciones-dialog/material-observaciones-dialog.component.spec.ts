import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { EngineeringService, MaterialObservacion, SeguimientoMaterial } from '../../../../engineering.service';
import { MaterialObservacionesDialogComponent, MaterialObservacionesDialogData, formatearFechaMexico } from './material-observaciones-dialog.component';

describe('MaterialObservacionesDialogComponent', () => {
  let fixture: ComponentFixture<MaterialObservacionesDialogComponent>;
  let component: MaterialObservacionesDialogComponent;
  let engineeringMock: jasmine.SpyObj<EngineeringService>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<MaterialObservacionesDialogComponent>>;

  const materialBase: SeguimientoMaterial = {
    idMaterial: 10,
    idSeguimiento: 5,
    tipoItem: 1,
    descripcion: 'Tubería conduit 1/2"',
    codigoProducto: 'TUB-01',
    cantidadCotizada: 10,
    precioUnitarioCotizado: 100,
    importeCotizado: 1000,
    cantidadComprada: 0,
    costoTotalComprado: 0,
    precioUnitarioPromedioCompra: 0,
    cantidadSurtida: 0,
    costoTotalSurtido: 0,
    costoUnitarioPromedioSurtido: 0,
    cantidadPendienteSurtir: 10,
    variacionImporte: 0,
    semaforo: 'Por Comprar',
    estatus: 'EnProceso',
    notas: 'Primera nota',
    observacionesCount: 1
  };

  const listaInicial: MaterialObservacion[] = [
    {
      idObservacion: 1,
      texto: 'Primera nota',
      usuarioNombre: 'Juan Pérez',
      fecha: '2026-11-26T15:30:00Z'
    }
  ];

  function inicializar(material = { ...materialBase }, lista = [...listaInicial]) {
    engineeringMock = jasmine.createSpyObj<EngineeringService>('EngineeringService', [
      'observacionesMaterial',
      'agregarObservacionMaterial'
    ]);
    engineeringMock.observacionesMaterial.and.returnValue(of(lista));

    dialogRefMock = jasmine.createSpyObj<MatDialogRef<MaterialObservacionesDialogComponent>>('MatDialogRef', ['close']);

    const data: MaterialObservacionesDialogData = { material };

    TestBed.configureTestingModule({
      imports: [MaterialObservacionesDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: EngineeringService, useValue: engineeringMock }
      ]
    });

    fixture = TestBed.createComponent(MaterialObservacionesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('formatearFechaMexico_formatea_en_hora_de_mexico_dd_MM_yyyy_HH_mm', () => {
    // 2026-11-26T15:30:00Z en Mexico (UTC-6) son las 09:30 del 26/11/2026
    const res = formatearFechaMexico('2026-11-26T15:30:00Z');
    expect(res).toBe('26/11/2026 09:30');
  });

  it('Abre_y_carga_el_historial_de_observaciones', () => {
    inicializar();
    expect(engineeringMock.observacionesMaterial).toHaveBeenCalledWith(10);
    expect(component.observaciones.length).toBe(1);

    const textoObs = fixture.nativeElement.querySelector('[data-testid="texto-1"]')?.textContent?.trim();
    const usuarioObs = fixture.nativeElement.querySelector('[data-testid="usuario-1"]')?.textContent?.trim();
    const fechaObs = fixture.nativeElement.querySelector('[data-testid="fecha-1"]')?.textContent?.trim();

    expect(textoObs).toBe('Primera nota');
    expect(usuarioObs).toBe('Juan Pérez');
    expect(fechaObs).toBe('26/11/2026 09:30');
  });

  it('Sin_observaciones_muestra_estado_vacio', () => {
    inicializar(materialBase, []);
    expect(component.observaciones.length).toBe(0);
    const vacio = fixture.nativeElement.querySelector('[data-testid="sin-observaciones"]');
    expect(vacio).not.toBeNull();
    expect(vacio?.textContent).toContain('Sin observaciones registradas');
  });

  it('Agregar_deshabilitado_con_texto_vacio_o_blancos', () => {
    inicializar();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-guardar-observacion"]');
    expect(btn?.disabled).toBeTrue();

    component.nuevoTextoControl.setValue('   ');
    fixture.detectChanges();
    expect(btn?.disabled).toBeTrue();

    component.nuevoTextoControl.setValue('Nueva observación válida');
    fixture.detectChanges();
    expect(btn?.disabled).toBeFalse();
  });

  it('Agregar_observacion_hace_POST_agrega_al_inicio_y_actualiza_material', () => {
    const mat = { ...materialBase, notas: 'Nota vieja', observacionesCount: 1 };
    inicializar(mat);

    const nueva: MaterialObservacion = {
      idObservacion: 2,
      texto: 'Segunda observación recién agregada',
      usuarioNombre: 'Ana Gómez',
      fecha: '2026-11-26T18:00:00Z'
    };
    engineeringMock.agregarObservacionMaterial.and.returnValue(of(nueva));

    component.nuevoTextoControl.setValue('Segunda observación recién agregada');
    fixture.detectChanges();

    component.agregar();
    fixture.detectChanges();

    expect(engineeringMock.agregarObservacionMaterial).toHaveBeenCalledWith(10, 'Segunda observación recién agregada');
    expect(component.observaciones.length).toBe(2);
    expect(component.observaciones[0].idObservacion).toBe(2);
    expect(component.nuevoTextoControl.value).toBe('');

    // Se actualiza el objeto material pasado en data
    expect(mat.notas).toBe('Segunda observación recién agregada');
    expect(mat.observacionesCount).toBe(2);
  });

  it('Error_del_API_al_agregar_se_muestra_en_el_dialogo_sin_perder_el_texto', () => {
    inicializar();
    engineeringMock.agregarObservacionMaterial.and.returnValue(
      throwError(() => ({ error: { mensaje: 'La observación admite hasta 1000 caracteres.' } }))
    );

    component.nuevoTextoControl.setValue('Texto con error');
    fixture.detectChanges();

    component.agregar();
    fixture.detectChanges();

    expect(component.errorMensaje).toBe('La observación admite hasta 1000 caracteres.');
    const errorEl = fixture.nativeElement.querySelector('[data-testid="error-observacion"]');
    expect(errorEl?.textContent).toContain('La observación admite hasta 1000 caracteres.');
    expect(component.nuevoTextoControl.value).toBe('Texto con error');
  });

  it('Cerrar_cierra_el_dialogo', () => {
    inicializar();
    component.cerrar();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});
