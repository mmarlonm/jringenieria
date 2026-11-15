import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RevisionSgcComponent } from './revision-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import Swal from 'sweetalert2';

describe('RevisionSgcComponent', () => {
  let component: RevisionSgcComponent;
  let fixture: ComponentFixture<RevisionSgcComponent>;
  let mockQuotesService: any;
  let mockDialog: any;

  beforeEach(async () => {
    mockQuotesService = {
      revisiones: jasmine.createSpy('revisiones').and.returnValue(of([])),
      volverBorrador: jasmine.createSpy('volverBorrador').and.returnValue(of({ etapa: 'Borrador' })),
    };

    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({ guardado: true }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [RevisionSgcComponent, NoopAnimationsModule],
      providers: [
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisionSgcComponent);
    component = fixture.componentInstance;
    component.cotizacionId = 42;
    component.revisionesRequeridas = ['Comercial', 'Ingenieria'];
    component.acciones = {
      editar: false,
      enviarRevision: false,
      volverBorrador: true,
      revisar: ['Comercial'],
      emitir: false,
      nuevaVersion: false,
    };
    fixture.detectChanges();
  });

  it('Se_muestra_una_tarjeta_por_rol_requerido_con_su_estado', () => {
    component.revisionesVigentes = [
      {
        id: 1,
        version: 1,
        rol: 'Comercial',
        resultado: 'Aprobada',
        usuarioId: 10,
        usuarioNombre: 'Marlon',
        fecha: new Date(),
        descartada: false,
      },
    ];
    fixture.detectChanges();

    const tarjetas = fixture.nativeElement.querySelectorAll('.tarjeta-rol');
    expect(tarjetas.length).toBe(2);

    const txt = fixture.nativeElement.textContent;
    expect(txt).toContain('Comercial');
    expect(txt).toContain('Aprobada');
    expect(txt).toContain('Ingeniería');
    expect(txt).toContain('Pendiente');
  });

  it('El_boton_Revisar_solo_aparece_para_los_roles_de_acciones_revisar', () => {
    component.acciones = {
      editar: false,
      enviarRevision: false,
      volverBorrador: false,
      revisar: ['Comercial'],
      emitir: false,
      nuevaVersion: false,
    };
    fixture.detectChanges();

    const botonesRevisar = Array.from(fixture.nativeElement.querySelectorAll('button')).filter((b: any) =>
      b.textContent?.includes('Revisar como')
    ) as HTMLElement[];
    expect(botonesRevisar.length).toBe(1);
    expect(botonesRevisar[0].textContent).toContain('Comercial');
  });

  it('Volver_a_borrador_pide_confirmacion_y_recarga', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    spyOn(component.recargar, 'emit');

    await component.onVolverBorrador();

    expect(Swal.fire).toHaveBeenCalled();
    expect(mockQuotesService.volverBorrador).toHaveBeenCalledWith(42);
    expect(component.recargar.emit).toHaveBeenCalled();
  });

  it('El_historial_marca_las_revisiones_descartadas', () => {
    component.historialRevisiones = [
      {
        id: 1,
        version: 1,
        rol: 'Comercial',
        resultado: 'Rechazada',
        usuarioId: 5,
        usuarioNombre: 'Carlos',
        fecha: new Date(),
        comentarios: 'Faltan precios',
        descartada: true,
      },
    ];
    fixture.detectChanges();

    const filaDescartada = fixture.nativeElement.querySelector('.revision-descartada');
    expect(filaDescartada).toBeTruthy();
    expect(filaDescartada.textContent).toContain('Descartada');
  });

  it('Los_comentarios_se_muestran_escapados', () => {
    const xss = '<img src=x onerror=alert(1)>';
    component.historialRevisiones = [
      {
        id: 1,
        version: 1,
        rol: 'Comercial',
        resultado: 'Rechazada',
        usuarioId: 5,
        usuarioNombre: 'Carlos',
        fecha: new Date(),
        comentarios: xss,
        descartada: false,
      },
    ];
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img[src="x"]');
    expect(img).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(xss);
  });

  it('Una_revision_rechazada_muestra_banner_destacado_con_usuario_fecha_y_motivo', () => {
    component.revisionesVigentes = [
      {
        id: 10,
        version: 1,
        rol: 'Direccion',
        resultado: 'Rechazada',
        usuarioId: 3,
        usuarioNombre: 'Gerente General',
        fecha: new Date('2026-11-14T10:00:00Z'),
        comentarios: 'Margen insuficiente para aprobar',
        descartada: false,
      },
    ];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cotización rechazada');
    expect(text).toContain('Gerente General');
    expect(text).toContain('Margen insuficiente para aprobar');
  });
});
