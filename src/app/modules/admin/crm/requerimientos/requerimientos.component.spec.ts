import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of } from 'rxjs';
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
            puedeCalificar: () => true
          }
        },
        {
          provide: UsersService,
          useValue: {
            getUsers: () => of([])
          }
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
});

