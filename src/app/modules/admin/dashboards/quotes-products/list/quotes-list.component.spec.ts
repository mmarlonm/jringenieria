import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QuoteListComponent } from './quotes-list.component';
import { QuotesService } from '../quotes-products.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ResumenSgc } from '../quotes-products.types';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

describe('QuoteListComponent', () => {
  let component: QuoteListComponent;
  let fixture: ComponentFixture<QuoteListComponent>;
  let mockQuotesService: any;
  let mockChatService: any;
  let mockRouter: any;

  const mockQuotesData = [
    {
      cotizacionProductosId: 101,
      nombreCliente: 'Cliente Alpha',
      unidadDeNegocio: { nombre: 'Baja Tensión' },
      createdDate: '2026-11-14',
      requisitosEspeciales: false,
      total: 1000,
      estatus: 1,
    },
    {
      cotizacionProductosId: 102,
      nombreCliente: 'Cliente Beta',
      unidadDeNegocio: { nombre: 'Media Tensión' },
      createdDate: '2026-11-14',
      requisitosEspeciales: true,
      total: 2500,
      estatus: 1,
    },
  ];

  const mockResumenes: ResumenSgc[] = [
    {
      cotizacionProductosId: 101,
      folio: 'COT-2026-0001',
      tipo: 'CT',
      version: 1,
      total: 1200,
      moneda: 'MXN',
    },
  ];

  beforeEach(async () => {
    mockQuotesService = {
      getQuotes: jasmine.createSpy('getQuotes').and.returnValue(
        of({
          code: 200,
          data: JSON.parse(JSON.stringify(mockQuotesData)),
          totalCount: 2,
        })
      ),
      getEstatus: jasmine.createSpy('getEstatus').and.returnValue(of({ code: 200, data: [] })),
      resumenSgc: jasmine.createSpy('resumenSgc').and.returnValue(of(mockResumenes)),
      cambiarEstatus: jasmine.createSpy('cambiarEstatus').and.returnValue(of({ code: 200 })),
    };

    mockChatService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showWarning: jasmine.createSpy('showWarning'),
      showError: jasmine.createSpy('showError'),
    };

    mockRouter = {
      url: '/admin/quotes',
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, QuoteListComponent],
      providers: [
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: ChatNotificationService, useValue: mockChatService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('La_lista_muestra_folio_tipo_y_total_del_resumen', () => {
    expect(mockQuotesService.resumenSgc).toHaveBeenCalledWith([101, 102]);

    const item1 = component.dataSource.data.find((q) => q.cotizacionProductosId === 101);
    expect(item1.folio).toBe('COT-2026-0001');
    expect(item1.tipo).toBe('CT');
    expect(item1.totalSgc).toBe(1200);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('COT-2026-0001');
    expect(compiled.textContent).toContain('CT');
    expect(compiled.textContent).toContain('1,200');
  });

  it('Sin_registro_muestra_el_id_y_el_total_de_siempre', () => {
    // 102 no vino en mockResumenes
    const item2 = component.dataSource.data.find((q) => q.cotizacionProductosId === 102);
    expect(item2.folio).toBeUndefined();
    expect(item2.tipo).toBeUndefined();
    expect(item2.totalSgc).toBeUndefined();
    expect(item2.total).toBe(2500);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('#102');
    expect(compiled.textContent).toContain('2,500');
  });

  it('Si_el_resumen_falla_se_muestra_un_aviso_y_la_lista_sigue', () => {
    mockQuotesService.resumenSgc.and.returnValue(throwError(() => new Error('Error al cargar resumen')));

    component.getQuotes();
    fixture.detectChanges();

    expect(component.dataSource.data.length).toBe(2);
    expect(mockChatService.showWarning).toHaveBeenCalled();
    expect(component.errorResumenSgc).toBeTrue();
  });

  it('El_filtro_busca_por_folio', () => {
    component.setCustomFilter();

    component.filterValue = 'COT-2026-0001';
    component.applyFilter();

    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].cotizacionProductosId).toBe(101);
  });
});
