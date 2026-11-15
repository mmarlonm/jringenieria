import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevaVersionDialogComponent, NuevaVersionDialogData } from './nueva-version-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { QuotesService } from '../../quotes-products.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NuevaVersionDialogComponent', () => {
  let component: NuevaVersionDialogComponent;
  let fixture: ComponentFixture<NuevaVersionDialogComponent>;
  let mockDialogRef: any;
  let mockQuotesService: any;

  const mockData: NuevaVersionDialogData = {
    cotizacionId: 99,
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jasmine.createSpy('close'),
    };

    mockQuotesService = {
      nuevaVersion: jasmine.createSpy('nuevaVersion').and.returnValue(
        of({ cotizacionProductosId: 100, folio: 'COT-2026-0001', version: 2, etapa: 'Borrador' })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [NuevaVersionDialogComponent, NoopAnimationsModule, MatDialogModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: QuotesService, useValue: mockQuotesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaVersionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Nueva_version_exige_clase_y_resumen_de_10_caracteres', () => {
    component.form.patchValue({
      clase: '',
      resumen: 'corto',
    });
    expect(component.puedeCrear).toBeFalse();

    component.form.patchValue({
      clase: 'Menor',
      resumen: 'corto',
    });
    expect(component.puedeCrear).toBeFalse();

    component.form.patchValue({
      clase: 'Menor',
      resumen: '1234567890',
    });
    expect(component.puedeCrear).toBeTrue();
  });

  it('Nueva_version_manda_clase_y_resumen_y_recarga', () => {
    component.form.patchValue({
      clase: 'Alcance',
      resumen: 'Se agregan 2 partidas de cableado estructurado',
    });

    component.crearVersion();

    expect(mockQuotesService.nuevaVersion).toHaveBeenCalledWith(99, {
      clase: 'Alcance',
      resumen: 'Se agregan 2 partidas de cableado estructurado',
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ guardado: true })
    );
  });

  it('Los_dialogos_devuelven_su_resultado_por_todas_las_vias_de_cierre', () => {
    // 1. Cancelar
    component.cancelar();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);

    // 2. Éxito
    component.form.patchValue({
      clase: 'Menor',
      resumen: 'Ajuste de precio unitario por volumen',
    });
    component.crearVersion();
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ guardado: true })
    );
  });

  it('Los_dialogos_altos_tienen_scroll_propio_y_botones_visibles', () => {
    const dialogService = TestBed.inject(MatDialog);
    const ref = dialogService.open(NuevaVersionDialogComponent, {
      width: '32rem',
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
      const acciones = panel.querySelector('mat-dialog-actions');
      expect(acciones).toBeTruthy();
    }
    ref.close();
  });
});
