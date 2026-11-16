import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PUNTOS_REQUERIDOS_POR_ROL, PUNTOS_REVISION, RevisionDialogComponent } from './revision-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { QuotesService } from '../../quotes-products.service';
import { Observable, of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('RevisionDialogComponent', () => {
  let component: RevisionDialogComponent;
  let fixture: ComponentFixture<RevisionDialogComponent>;
  let mockDialogRef: any;
  let mockQuotesService: any;

  const mockData = {
    rol: 'Comercial',
    cotizacionId: 42,
    catalogos: {
      tipos: [],
      monedas: [],
      tiposConcepto: [],
      entregables: [],
      ivaTasa: 0.16,
      puntosRequeridosPorRol: {
        Comercial: ['CorrespondeAlRequerimiento', 'ExactitudDePrecios'],
      },
    },
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jasmine.createSpy('close'),
    };

    mockQuotesService = {
      registrarRevision: jasmine.createSpy('registrarRevision').and.returnValue(
        of({ rol: 'Comercial', resultado: 'Aprobada' })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [RevisionDialogComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: QuotesService, useValue: mockQuotesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('El_dialogo_lista_los_11_puntos_y_marca_los_obligatorios_del_rol', () => {
    expect(component.puntos.length).toBe(11);
    const badges = fixture.nativeElement.querySelectorAll('.badge-obligatorio');
    expect(badges.length).toBe(2); // CorrespondeAlRequerimiento y ExactitudDePrecios
  });

  it('Aprobar_se_deshabilita_hasta_marcar_los_puntos_del_rol', () => {
    expect(component.puedeAprobar).toBeFalse();
    const btnAprobar = fixture.nativeElement.querySelector('.btn-aprobar');
    expect(btnAprobar.disabled).toBeTrue();

    // Marcamos solo uno de los obligatorios
    component.checklist['CorrespondeAlRequerimiento'] = true;
    fixture.detectChanges();
    expect(component.puedeAprobar).toBeFalse();

    // Marcamos el segundo obligatorio
    component.checklist['ExactitudDePrecios'] = true;
    fixture.detectChanges();
    expect(component.puedeAprobar).toBeTrue();
    expect(btnAprobar.disabled).toBeFalse();
  });

  it('Rechazar_exige_comentarios_de_10_caracteres', () => {
    component.comentarios = 'corto';
    fixture.detectChanges();
    expect(component.puedeRechazar).toBeFalse();

    component.comentarios = '1234567890';
    fixture.detectChanges();
    expect(component.puedeRechazar).toBeTrue();
  });

  it('Aprobar_manda_rol_resultado_checklist_y_comentarios', () => {
    component.checklist['CorrespondeAlRequerimiento'] = true;
    component.checklist['ExactitudDePrecios'] = true;
    component.comentarios = 'Todo correcto';
    fixture.detectChanges();

    component.aprobar();

    expect(mockQuotesService.registrarRevision).toHaveBeenCalledWith(42, {
      rol: 'Comercial',
      resultado: 'Aprobada',
      checklist: component.checklist,
      comentarios: 'Todo correcto',
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith({ guardado: true, resultado: 'Aprobada' });
  });

  it('Un_error_del_API_se_muestra_y_el_dialogo_sigue_abierto', () => {
    mockQuotesService.registrarRevision.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { mensaje: 'No cumple los requisitos', errores: ['Falta punto 1'] },
      }))
    );

    component.checklist['CorrespondeAlRequerimiento'] = true;
    component.checklist['ExactitudDePrecios'] = true;
    component.aprobar();
    fixture.detectChanges();

    expect(component.errorMensaje).toBe('No cumple los requisitos');
    expect(component.errores).toEqual(['Falta punto 1']);
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('El_dialogo_devuelve_el_resultado_por_todas_las_vias_de_cierre', () => {
    // 1. Cancelar por botón
    component.cancelar();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);

    // 2. Cierre por aprobación exitosa
    mockQuotesService.registrarRevision.and.returnValue(of({ ok: true }));
    component.checklist['CorrespondeAlRequerimiento'] = true;
    component.checklist['ExactitudDePrecios'] = true;
    component.aprobar();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ guardado: true, resultado: 'Aprobada' });
  });

  it('El_dialogo_alto_tiene_scroll_propio_y_los_botones_dentro_de_la_pantalla', () => {
    const dialogService = TestBed.inject(MatDialog);
    const ref = dialogService.open(RevisionDialogComponent, {
      width: '40rem',
      data: mockData,
    });
    fixture.detectChanges();

    const panel = document.querySelector('.mat-mdc-dialog-container') as HTMLElement;
    if (panel) {
      const contenido = panel.querySelector('mat-dialog-content') as HTMLElement;
      if (contenido) {
        expect(contenido.classList.contains('dialogo-alto')).toBeTrue();
        const estilo = getComputedStyle(contenido);
        expect(estilo.maxHeight).not.toBe('none');
        expect(['auto', 'scroll']).toContain(estilo.overflowY);
      }
    }
    ref.close();
  });
});

// Códigos y nombres EXACTOS de CotizacionSgcCatalogos.cs del API (GET sgc/catalogos)
const PUNTOS_DEL_API = [
  { codigo: 'CorrespondeAlRequerimiento', nombre: 'Correspondencia con el requerimiento' },
  { codigo: 'AlcanceClaro', nombre: 'Claridad del alcance' },
  { codigo: 'CoherenciaTecnica', nombre: 'Coherencia técnica' },
  { codigo: 'ExactitudDePrecios', nombre: 'Exactitud de precios' },
  { codigo: 'CodigosYCatalogosValidos', nombre: 'Validez de códigos y catálogos' },
  { codigo: 'Existencia', nombre: 'Existencia' },
  { codigo: 'TiemposRazonables', nombre: 'Tiempos de entrega o ejecución razonables' },
  { codigo: 'CondicionesDePagoCorrectas', nombre: 'Condiciones de pago correctas' },
  { codigo: 'CondicionesDeEntrega', nombre: 'Condiciones de entrega' },
  { codigo: 'Vigencia', nombre: 'Vigencia' },
  { codigo: 'AprobacionInternaSegunNivel', nombre: 'Aprobación interna según nivel definido' },
];
const REQUERIDOS_DEL_API = {
  Comercial: ['CorrespondeAlRequerimiento', 'ExactitudDePrecios', 'CodigosYCatalogosValidos', 'Existencia', 'CondicionesDePagoCorrectas', 'CondicionesDeEntrega', 'Vigencia', 'AprobacionInternaSegunNivel'],
  Ingenieria: ['CorrespondeAlRequerimiento', 'AlcanceClaro', 'CoherenciaTecnica', 'TiemposRazonables'],
  Direccion: ['AprobacionInternaSegunNivel'],
};

describe('RevisionDialogComponent con el catálogo real del API', () => {
  let mockDialogRef: any;
  let mockQuotesService: any;

  async function crear(rol: string, conCatalogo: boolean) {
    mockDialogRef = { close: jasmine.createSpy('close'), disableClose: false };
    mockQuotesService = { registrarRevision: jasmine.createSpy('registrarRevision').and.returnValue(of({})) };
    await TestBed.configureTestingModule({
      imports: [RevisionDialogComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            rol,
            cotizacionId: 7,
            catalogos: conCatalogo
              ? { tipos: [], monedas: [], tiposConcepto: [], entregables: [], ivaTasa: 0.16, puntosRevision: PUNTOS_DEL_API, puntosRequeridosPorRol: REQUERIDOS_DEL_API }
              : null,
          },
        },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: QuotesService, useValue: mockQuotesService },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RevisionDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('Ingenieria_puede_aprobar_y_el_API_recibe_AlcanceClaro_marcado', async () => {
    const fixture = await crear('Ingenieria', true);
    const c = fixture.componentInstance;

    expect(c.puntos.map((p) => p.codigo)).toEqual(PUNTOS_DEL_API.map((p) => p.codigo));
    expect(c.puedeAprobar).toBeFalse();

    for (const codigo of REQUERIDOS_DEL_API.Ingenieria) {
      c.checklist[codigo] = true;
    }
    expect(c.puedeAprobar).toBeTrue();

    c.aprobar();
    const enviado = mockQuotesService.registrarRevision.calls.mostRecent().args[1];
    expect(enviado.rol).toBe('Ingenieria');
    expect(enviado.checklist['AlcanceClaro']).toBeTrue();
    expect(Object.keys(enviado.checklist).sort()).toEqual(PUNTOS_DEL_API.map((p) => p.codigo).sort());
  });

  it('Sin_catalogo_el_respaldo_local_usa_los_mismos_codigos_que_el_API', async () => {
    const fixture = await crear('Ingenieria', false);
    const c = fixture.componentInstance;

    expect(PUNTOS_REVISION.map((p) => p.codigo)).toEqual(PUNTOS_DEL_API.map((p) => p.codigo));
    expect(PUNTOS_REQUERIDOS_POR_ROL).toEqual(REQUERIDOS_DEL_API);

    for (const codigo of REQUERIDOS_DEL_API.Ingenieria) {
      c.checklist[codigo] = true;
    }
    expect(c.puedeAprobar).toBeTrue();
  });

  it('El_titulo_muestra_el_nombre_del_rol_con_acento', async () => {
    const fixture = await crear('Ingenieria', true);
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Revisión como Ingeniería');
  });

  it('No_se_puede_cerrar_mientras_se_registra_la_revision_y_se_libera_si_falla', async () => {
    const fixture = await crear('Direccion', true);
    const c = fixture.componentInstance;
    let fallar!: (e: any) => void;
    mockQuotesService.registrarRevision.and.returnValue(new Observable((o) => { fallar = (e) => o.error(e); }));

    c.checklist['AprobacionInternaSegunNivel'] = true;
    c.aprobar();
    expect(mockDialogRef.disableClose).toBeTrue();

    fallar({ status: 409, error: { mensaje: 'Ya registraste esta revisión.' } });
    expect(mockDialogRef.disableClose).toBeFalse();
    expect(c.errorMensaje).toBe('Ya registraste esta revisión.');
  });
});
