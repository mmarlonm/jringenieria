import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { RequerimientosComponent } from './requerimientos.component';
import { Requerimiento, RequerimientosService } from './requerimientos.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';

describe('RequerimientosComponent - Aprobados', () => {
  let fixture: ComponentFixture<RequerimientosComponent>;
  let component: RequerimientosComponent;

  const mockRequerimientos: Requerimiento[] = [
    {
      id: 1, folio: 'REQ-2026-0001', fechaRecepcion: '2026-10-23T12:00:00', nombreContacto: 'Contacto 1', empresa: 'Empresa 1',
      descripcion: 'Pendiente', estatus: 'Pendiente', fechaRegistro: '2026-10-23T12:00:00',
      faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
      faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
      faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false
    },
    {
      id: 2, folio: 'REQ-2026-0002', fechaRecepcion: '2026-10-23T12:00:00', nombreContacto: 'Contacto 2', empresa: 'Empresa 2',
      descripcion: 'Comercial', estatus: 'Calificado Comercial', fechaRegistro: '2026-10-23T12:00:00',
      faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
      faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
      faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false
    },
    {
      id: 3, folio: 'REQ-2026-0003', fechaRecepcion: '2026-10-23T12:00:00', nombreContacto: 'Contacto 3', empresa: 'Empresa 3',
      descripcion: 'Aprobado', estatus: 'Aprobado para cotización', seguimientoProyectoId: 42,
      fechaAprobacion: '2026-10-24T10:00:00', fechaRegistro: '2026-10-23T12:00:00',
      faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
      faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
      faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false
    },
    {
      id: 4, folio: 'REQ-2026-0004', fechaRecepcion: '2026-10-23T12:00:00', nombreContacto: 'Contacto 4', empresa: 'Empresa 4',
      descripcion: 'Técnico', estatus: 'Calificado Técnico', fechaRegistro: '2026-10-23T12:00:00',
      faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
      faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
      faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false
    },
    {
      id: 5, folio: 'REQ-2026-0005', fechaRecepcion: '2026-10-23T12:00:00', nombreContacto: 'Contacto 5', empresa: 'Empresa 5',
      descripcion: 'No viable', estatus: 'No Viable', motivoDescarte: 'Fuera de alcance', fechaRegistro: '2026-10-23T12:00:00',
      faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
      faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
      faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RequerimientosComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        {
          provide: RequerimientosService,
          useValue: {
            getRequerimientos: () => of(mockRequerimientos),
            getIndicadores: () => of({
              tasaCalificacionCorrecta: 0,
              tiempoPromedioCalificacionHoras: 0,
              porcentajeDevueltos: 0,
              porcentajeCompletos: 0,
              totalRequerimientos: 3,
              distribucionPorTipo: []
            }),
            usuarioActualId: () => 18,
            puedeCalificar: () => true,
            calificarRequerimiento: () => of({})
          }
        },
        {
          provide: UsersService,
          useValue: {
            getUsers: () => of([])
          }
        },
        // El componente lee ?folio= de la ruta para abrir un requerimiento (desde el panel de leads): sin parámetros en estas pruebas
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}), snapshot: { queryParams: {} } }
        }
      ]
    });
    fixture = TestBed.createComponent(RequerimientosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Los_aprobados_van_a_su_columna_y_no_se_pueden_arrastrar', () => {
    // 1. Debe haber un elemento en la lista de aprobados
    expect(component.aprobados.length).toBe(1);
    expect(component.aprobados[0].folio).toBe('REQ-2026-0003');

    // 2. Columna en el DOM
    const colAprobados = fixture.nativeElement.querySelector('#kanban-aprobados');
    expect(colAprobados).toBeTruthy();

    // 3. La tarjeta dentro de la columna no debe tener cursor-grab ni botón editar
    const tarjetaAprobada = colAprobados.querySelector('[data-id="3"]');
    expect(tarjetaAprobada).toBeTruthy();
    expect(tarjetaAprobada.classList.contains('cursor-grab')).toBeFalse();

    // 4. No debe haber botón de editar (pencil) en la tarjeta aprobada
    const botonesEditar = tarjetaAprobada.querySelectorAll('button[mat-icon-button]');
    const hayPencil = Array.from(botonesEditar).some((b: any) => b.innerHTML.includes('pencil') || b.querySelector('[svgIcon="heroicons_outline:pencil"]'));
    expect(hayPencil).toBeFalse();
  });

  // El ojo «Ver requerimiento» va en todas las tarjetas, de cualquier estatus, no solo en Pendientes.
  const ojosDe = (contenedor: Element): HTMLButtonElement[] =>
    Array.from(contenedor.querySelectorAll('button')).filter(b => b.getAttribute('mattooltip') === 'Ver requerimiento') as HTMLButtonElement[];

  it('El_ojo_Ver_aparece_en_las_tarjetas_de_todas_las_columnas', () => {
    const columnas = ['#kanban-pendiente', '#kanban-comercial', '#kanban-tecnico', '#kanban-no-viable', '#kanban-aprobados'];

    for (const selector of columnas) {
      const columna = fixture.nativeElement.querySelector(selector) as HTMLElement;
      const tarjetas = Array.from(columna.querySelectorAll('[data-id]')) as HTMLElement[];
      expect(tarjetas.length).withContext(selector).toBeGreaterThan(0);
      for (const tarjeta of tarjetas) {
        expect(ojosDe(tarjeta).length).withContext(`${selector} tarjeta ${tarjeta.getAttribute('data-id')}`).toBe(1);
      }
    }
  });

  it('El_ojo_de_una_tarjeta_ya_calificada_abre_la_visualizacion_de_ese_requerimiento', () => {
    const abrir = spyOn(component, 'openVerDialog');
    const tarjeta = fixture.nativeElement.querySelector('#kanban-no-viable [data-id="5"]') as HTMLElement;

    ojosDe(tarjeta)[0].click();

    expect(abrir).toHaveBeenCalledWith(jasmine.objectContaining({ id: 5 }));
  });

  it('La_vista_lista_tambien_tiene_el_ojo_en_cada_fila', () => {
    component.viewMode = 'list';
    fixture.detectChanges();

    expect(ojosDe(fixture.nativeElement).length).toBe(mockRequerimientos.length);
  });

  it('El_arrastre_manda_tambien_los_tres_textos', () => {
    const reqConTextos: Requerimiento = {
      ...mockRequerimientos[0],
      cantidades: '10 unidades',
      ubicacionExacta: 'Nave Central',
      marcaModelo: 'ABB'
    };
    component.requerimientos = [reqConTextos];
    const reqService = TestBed.inject(RequerimientosService);
    let dtoEnviado: any = null;
    spyOn(reqService, 'calificarRequerimiento').and.callFake((id, dto) => {
      dtoEnviado = dto;
      return of({} as any);
    });

    (component as any).onCardMoved(1, 'Calificado Comercial', {});

    expect(dtoEnviado).not.toBeNull();
    expect(dtoEnviado.cantidades).toBe('10 unidades');
    expect(dtoEnviado.ubicacionExacta).toBe('Nave Central');
    expect(dtoEnviado.marcaModelo).toBe('ABB');
  });

  it('Un_rechazo_del_API_al_arrastrar_muestra_su_mensaje_y_recarga', () => {
    const swalSpy = spyOn(Swal, 'fire');
    const reqService = TestBed.inject(RequerimientosService);
    spyOn(reqService, 'calificarRequerimiento').and.returnValue(
      throwError(() => ({ error: { mensaje: 'Error al calificar' } }))
    );
    const reloadSpy = spyOn(component, 'loadRequerimientos');

    (component as any).onCardMoved(1, 'Calificado Comercial', {});

    expect(swalSpy).toHaveBeenCalledWith('Error', jasmine.stringMatching('Error al calificar'), 'error');
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('Las_tarjetas_de_aprobados_y_no_viables_solo_tienen_Ver_en_tablero_y_lista', () => {
    // 1. En Kanban: Columna No Viable
    const colNoViable = fixture.nativeElement.querySelector('#kanban-no-viable');
    const tarjetaNoViable = colNoViable.querySelector('[data-id="5"]');
    expect(tarjetaNoViable).toBeTruthy();
    const btnsNoViable = tarjetaNoViable.querySelectorAll('button[mat-icon-button]');
    expect(btnsNoViable.length).toBe(1);
    expect(btnsNoViable[0].getAttribute('mattooltip')).toBe('Ver requerimiento');

    // 2. En Kanban: Columna Aprobados
    const colAprobados = fixture.nativeElement.querySelector('#kanban-aprobados');
    const tarjetaAprobada = colAprobados.querySelector('[data-id="3"]');
    expect(tarjetaAprobada).toBeTruthy();
    const btnsAprobada = tarjetaAprobada.querySelectorAll('button[mat-icon-button]');
    expect(btnsAprobada.length).toBe(1);
    expect(btnsAprobada[0].getAttribute('mattooltip')).toBe('Ver requerimiento');

    // 3. En Vista Lista
    component.viewMode = 'list';
    fixture.detectChanges();

    const filas = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]')) as HTMLElement[];
    const filaAprobado = filas.find(f => f.textContent?.includes('REQ-2026-0003'))!;
    expect(filaAprobado).toBeTruthy();
    const btnsFilaAprobado = filaAprobado.querySelectorAll('td[mat-cell]:last-child button');
    expect(btnsFilaAprobado.length).toBe(2); // Ver requerimiento y Convertir a cotización
    expect(btnsFilaAprobado[0].getAttribute('mattooltip')).toBe('Ver requerimiento');
    expect(btnsFilaAprobado[1].getAttribute('mattooltip')).toBe('Convertir a cotización');

    const filaNoViable = filas.find(f => f.textContent?.includes('REQ-2026-0005'))!;
    expect(filaNoViable).toBeTruthy();
    const btnsFilaNoViable = filaNoViable.querySelectorAll('td[mat-cell]:last-child button');
    expect(btnsFilaNoViable.length).toBe(1);
    expect(btnsFilaNoViable[0].getAttribute('mattooltip')).toBe('Ver requerimiento');
  });

  it('Tras_convertir_el_tablero_se_recarga_una_vez_y_avisa_el_folio', () => {
    const resultado = { cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', tipo: 'CS', etapa: 'Borrador', requerimientoId: 3, requerimientoFolio: 'REQ-2026-0003' };
    spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of({ accion: 'convertido', resultado }) } as any);
    const aviso = spyOn((component as any).snackBar, 'open');
    const recargar = spyOn(component, 'loadRequerimientos');

    component.openVerDialog(mockRequerimientos[2]);

    expect(recargar).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith(jasmine.stringContaining('COT-2026-0042'), 'OK', jasmine.anything());
  });

  it('Cerrar_el_ver_sin_convertir_no_recarga_el_tablero', () => {
    spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
    const recargar = spyOn(component, 'loadRequerimientos');

    component.openVerDialog(mockRequerimientos[2]);

    expect(recargar).not.toHaveBeenCalled();
  });

  it('La_tarjeta_aprobada_muestra_la_etiqueta_de_cotizacion_con_enlace', () => {
    component.requerimientos = mockRequerimientos.map(r => r.id === 3
      ? { ...r, cotizacionVinculada: { cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', folioContpaq: '1234', tipo: 'CS' as const, etapa: 'Borrador' } }
      : r);
    component.applyFilters();
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('#kanban-aprobados [data-id="3"] [data-testid="chip-cotizacion"]');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('COT-2026-0042');
    expect(chip.querySelector('a').getAttribute('href')).toBe('#/dashboards/quote-products/311');
  });

  it('Si_cotizacionVinculada_es_null_o_no_viene_no_se_rompe_nada_ni_aparece_la_etiqueta', () => {
    component.requerimientos = mockRequerimientos.map(r => r.id === 3 ? { ...r, cotizacionVinculada: null } : r);
    component.applyFilters();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="chip-cotizacion"]')).toBeNull();
    expect(component.aprobados.length).toBe(1);
  });

  it('No_se_arrastra_desde_No_Viable', () => {
    const swalSpy = spyOn(Swal, 'fire');
    const reloadSpy = spyOn(component, 'loadRequerimientos');
    const reqService = TestBed.inject(RequerimientosService);
    const spyCalificar = spyOn(reqService, 'calificarRequerimiento');

    (component as any).onCardMoved(5, 'Calificado Comercial', {});

    expect(swalSpy).toHaveBeenCalledWith('Atención', 'Un requerimiento no viable ya no avanza.', 'warning');
    expect(reloadSpy).toHaveBeenCalled();
    expect(spyCalificar).not.toHaveBeenCalled();
  });

  // ==================== TAREA F6: CONVERTIR A COTIZACIÓN DESDE TARJETA ====================

  it('Tarjeta_de_aprobados_sin_cotizacion_muestra_Convertir_a_cotizacion', () => {
    const btn = fixture.nativeElement.querySelector('#kanban-aprobados [data-testid="btn-convertir-tarjeta-3"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Convertir a cotización');
  });

  it('Con_cotizacion_vinculada_no_muestra_el_boton_y_si_el_chip', () => {
    component.requerimientos = mockRequerimientos.map(r => r.id === 3
      ? { ...r, cotizacionVinculada: { cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', folioContpaq: '1234', tipo: 'CS' as const, etapa: 'Borrador' } }
      : r);
    component.applyFilters();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('#kanban-aprobados [data-testid="btn-convertir-tarjeta-3"]');
    expect(btn).toBeNull();

    const chip = fixture.nativeElement.querySelector('#kanban-aprobados [data-testid="chip-cotizacion"]');
    expect(chip).not.toBeNull();
  });

  it('Las_otras_columnas_no_muestran_el_boton', () => {
    const columnas = ['#kanban-pendiente', '#kanban-comercial', '#kanban-tecnico', '#kanban-no-viable'];
    for (const col of columnas) {
      const el = fixture.nativeElement.querySelector(col);
      expect(el).not.toBeNull();
      const btns = el.querySelectorAll('[data-testid^="btn-convertir-tarjeta-"]');
      expect(btns.length).withContext(col).toBe(0);
    }
  });

  it('El_clic_abre_el_dialogo_de_conversion_sin_abrir_el_detalle', () => {
    const dialogSpy = spyOn((component as any).dialog, 'open').and.returnValue({
      afterClosed: () => of(undefined)
    } as any);
    const verSpy = spyOn(component, 'openVerDialog');

    const btn = fixture.nativeElement.querySelector('[data-testid="btn-convertir-tarjeta-3"]') as HTMLElement;
    btn.click();

    expect(dialogSpy).toHaveBeenCalled();
    expect(verSpy).not.toHaveBeenCalled();
  });

  it('El_clic_no_propaga_ni_arrastra_la_tarjeta', () => {
    const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
    spyOn((component as any).dialog, 'open').and.returnValue({
      afterClosed: () => of(undefined)
    } as any);

    component.convertirDesdeTarjeta(mockRequerimientos[2], mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('Al_convertir_avisa_con_el_folio_y_recarga_requerimientos_y_kpis', () => {
    const resultado = {
      cotizacionProductosId: 401,
      folioSgc: 'COT-2026-0099',
      tipo: 'CS',
      etapa: 'Borrador',
      requerimientoId: 3,
      requerimientoFolio: 'REQ-2026-0003'
    };
    spyOn((component as any).dialog, 'open').and.returnValue({
      afterClosed: () => of({ convertido: true, resultado })
    } as any);
    const snackSpy = spyOn((component as any).snackBar, 'open');
    const reqSpy = spyOn(component, 'loadRequerimientos');
    const kpiSpy = spyOn(component, 'loadKpis');

    component.convertirDesdeTarjeta(mockRequerimientos[2], new MouseEvent('click'));

    expect(snackSpy).toHaveBeenCalledWith(
      jasmine.stringContaining('COT-2026-0099'),
      'OK',
      jasmine.anything()
    );
    expect(reqSpy).toHaveBeenCalled();
    expect(kpiSpy).toHaveBeenCalled();
  });

  it('Cerrar_el_dialogo_sin_convertir_no_recarga', () => {
    spyOn((component as any).dialog, 'open').and.returnValue({
      afterClosed: () => of(undefined)
    } as any);
    const reqSpy = spyOn(component, 'loadRequerimientos');
    const kpiSpy = spyOn(component, 'loadKpis');

    component.convertirDesdeTarjeta(mockRequerimientos[2], new MouseEvent('click'));

    expect(reqSpy).not.toHaveBeenCalled();
    expect(kpiSpy).not.toHaveBeenCalled();
  });

  it('La_lista_tambien_trae_el_boton_con_la_misma_regla', () => {
    component.viewMode = 'list';
    fixture.detectChanges();

    // El requerimiento 3 (Aprobado sin cotización) sí debe traerlo
    const btnLista3 = fixture.nativeElement.querySelector('[data-testid="btn-convertir-lista-3"]');
    expect(btnLista3).not.toBeNull();

    // Los otros requerimientos no
    for (const id of [1, 2, 4, 5]) {
      const btnListaOtro = fixture.nativeElement.querySelector(`[data-testid="btn-convertir-lista-${id}"]`);
      expect(btnListaOtro).toBeNull();
    }

    // Si tiene cotización vinculada, no lo trae
    component.requerimientos = mockRequerimientos.map(r => r.id === 3
      ? { ...r, cotizacionVinculada: { cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', folioContpaq: '1234', tipo: 'CS' as const, etapa: 'Borrador' } }
      : r);
    component.applyFilters();
    fixture.detectChanges();

    const btnLista3ConCot = fixture.nativeElement.querySelector('[data-testid="btn-convertir-lista-3"]');
    expect(btnLista3ConCot).toBeNull();
  });

  it('Con_el_dialogo_abierto_no_se_abre_otro', () => {
    const dialogSpy = spyOn((component as any).dialog, 'open');

    // Marcamos diálogo abierto
    component.dialogoConversionAbierto = true;
    fixture.detectChanges();

    component.convertirDesdeTarjeta(mockRequerimientos[2], new MouseEvent('click'));

    expect(dialogSpy).not.toHaveBeenCalled();

    // El botón debe estar deshabilitado en el DOM
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-convertir-tarjeta-3"]') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
  });
});

