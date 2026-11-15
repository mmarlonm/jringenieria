import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtapaChipComponent } from './etapa-chip.component';

describe('EtapaChipComponent', () => {
  let component: EtapaChipComponent;
  let fixture: ComponentFixture<EtapaChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtapaChipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EtapaChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('El_chip_muestra_el_nombre_legible_de_cada_etapa', () => {
    const etapas = [
      { codigo: 'Borrador', esperado: 'Borrador' },
      { codigo: 'EnRevision', esperado: 'En revisión' },
      { codigo: 'Aprobada', esperado: 'Aprobada' },
      { codigo: 'Emitida', esperado: 'Emitida' },
      { codigo: 'EnSeguimiento', esperado: 'En seguimiento' },
      { codigo: 'Ganada', esperado: 'Ganada' },
      { codigo: 'Perdida', esperado: 'Perdida' },
      { codigo: 'Cancelada', esperado: 'Cancelada' },
      { codigo: 'Vencida', esperado: 'Vencida' },
      { codigo: 'CerradaSinRespuesta', esperado: 'Cerrada sin respuesta' },
    ];

    for (const item of etapas) {
      component.etapa = item.codigo;
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent?.trim()).toContain(item.esperado);
    }
  });

  it('El_chip_usa_un_color_distinto_por_grupo', () => {
    component.etapa = 'Borrador';
    fixture.detectChanges();
    let claseBorrador = component.claseColor;

    component.etapa = 'EnRevision';
    fixture.detectChanges();
    let claseEnRevision = component.claseColor;

    component.etapa = 'Aprobada';
    fixture.detectChanges();
    let claseAprobada = component.claseColor;

    component.etapa = 'Emitida';
    fixture.detectChanges();
    let claseEmitida = component.claseColor;

    component.etapa = 'EnSeguimiento';
    fixture.detectChanges();
    let claseEnSeguimiento = component.claseColor;

    component.etapa = 'Ganada';
    fixture.detectChanges();
    let claseGanada = component.claseColor;

    component.etapa = 'Perdida';
    fixture.detectChanges();
    let clasePerdida = component.claseColor;

    component.etapa = 'Vencida';
    fixture.detectChanges();
    let claseVencida = component.claseColor;

    component.etapa = 'CerradaSinRespuesta';
    fixture.detectChanges();
    let claseCerrada = component.claseColor;

    expect(claseBorrador).not.toEqual(claseEnRevision);
    expect(claseEnRevision).not.toEqual(claseAprobada);
    expect(claseAprobada).not.toEqual(claseEmitida);
    expect(claseEmitida).not.toEqual(claseEnSeguimiento);
    expect(claseEnSeguimiento).not.toEqual(claseGanada);
    expect(claseGanada).not.toEqual(clasePerdida);
    expect(clasePerdida).not.toEqual(claseVencida);
    expect(claseVencida).not.toEqual(claseCerrada);
  });
});
