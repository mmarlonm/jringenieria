import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VersionesSgcComponent } from './versiones-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QuotePdfDialogComponent } from '../../quote-pdf-dialog/quote-pdf-dialog.component';

describe('VersionesSgcComponent', () => {
  let component: VersionesSgcComponent;
  let fixture: ComponentFixture<VersionesSgcComponent>;
  let mockQuotesService: any;
  let mockDialog: any;

  const mockVersiones = [
    {
      version: 1,
      estado: 'Emitida',
      etapa: 'Emitida',
      claseCambio: 'Inicial',
      resumenCambio: 'Versión inicial aprobada',
      fechaEmision: new Date('2026-11-10T10:00:00Z'),
      medioEnvio: 'Correo',
      clienteReceptor: 'Ing. López',
      total: 15000,
      esVigente: false,
    },
    {
      version: 2,
      estado: 'Emitida',
      etapa: 'Emitida',
      claseCambio: 'Menor',
      resumenCambio: 'Descuento 5% comercial',
      fechaEmision: new Date('2026-11-12T15:30:00Z'),
      medioEnvio: 'WhatsApp',
      clienteReceptor: 'Ing. López',
      total: 14250,
      esVigente: true,
    },
  ];

  beforeEach(async () => {
    mockQuotesService = {
      versiones: jasmine.createSpy('versiones').and.returnValue(of(mockVersiones)),
      version: jasmine.createSpy('version').and.returnValue(
        of({
          ...mockVersiones[1],
          snapshot: { folio: 'COT-2026-0001', version: 2 },
        })
      ),
    };

    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({ guardado: true }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [VersionesSgcComponent, NoopAnimationsModule],
      providers: [
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VersionesSgcComponent);
    component = fixture.componentInstance;
    component.cotizacionId = 55;
    component.versionActual = 2;
    component.acciones = {
      editar: false,
      enviarRevision: false,
      volverBorrador: false,
      revisar: [],
      emitir: false,
      nuevaVersion: true,
    };
    fixture.detectChanges();
  });

  it('La_tabla_de_versiones_destaca_la_vigente', () => {
    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);

    const filaV1 = filas[0];
    const filaV2 = filas[1];

    expect(filaV1.classList.contains('version-vigente')).toBeFalse();
    expect(filaV2.classList.contains('version-vigente')).toBeTrue();

    const badgeVigente = filaV2.querySelector('.badge-vigente');
    expect(badgeVigente).toBeTruthy();
    expect(badgeVigente.textContent.trim()).toBe('Vigente');
  });

  it('Ver_PDF_abre_el_dialogo_con_la_instantanea_de_esa_version', () => {
    const botonesVerPdf = fixture.nativeElement.querySelectorAll('.btn-ver-pdf');
    expect(botonesVerPdf.length).toBe(2);

    botonesVerPdf[1].click();

    expect(mockQuotesService.version).toHaveBeenCalledWith(55, 2);
    expect(mockDialog.open).toHaveBeenCalledWith(
      QuotePdfDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          version: 2,
          instantanea: jasmine.objectContaining({
            version: 2,
            snapshot: { folio: 'COT-2026-0001', version: 2 },
          }),
        }),
      })
    );
  });

  it('Los_textos_del_API_se_muestran_escapados', () => {
    const xss = '<img src=x onerror=alert(1)>';
    component.versiones = [
      {
        version: 3,
        estado: 'Emitida',
        etapa: 'Emitida',
        claseCambio: 'Alcance',
        resumenCambio: xss,
        fechaEmision: new Date(),
        medioEnvio: 'Correo',
        clienteReceptor: 'Receptor <script>alert(1)</script>',
        total: 100,
        esVigente: true,
      },
    ];
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img[src="x"]');
    expect(img).toBeNull();
    const script = fixture.nativeElement.querySelector('script');
    expect(script).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(xss);
  });
});

