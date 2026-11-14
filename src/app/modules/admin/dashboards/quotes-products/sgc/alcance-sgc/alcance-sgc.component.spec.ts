import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AlcanceSgcComponent } from './alcance-sgc.component';
import { CatalogosSgc } from '../../quotes-products.types';

describe('AlcanceSgcComponent', () => {
  let component: AlcanceSgcComponent;
  let fixture: ComponentFixture<AlcanceSgcComponent>;
  let fb: FormBuilder;

  const mockCatalogos: CatalogosSgc = {
    tipos: [],
    monedas: [],
    tiposConcepto: [],
    entregables: [
      { codigo: 'E01', nombre: 'Planos ejecutivos' },
      { codigo: 'E02', nombre: 'Memoria de cálculo' },
      { codigo: 'E03', nombre: 'Pruebas de laboratorio' },
    ],
    ivaTasa: 0.16,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, NoopAnimationsModule, AlcanceSgcComponent],
      providers: [FormBuilder],
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(AlcanceSgcComponent);
    component = fixture.componentInstance;
    component.catalogos = mockCatalogos;
    component.formGroup = fb.group({
      alcanceTecnico: [''],
      recursosRequeridos: [''],
      personalInvolucrado: [''],
      tiemposEstimados: [''],
      supuestosOperativos: [''],
      condicionesEjecucion: [''],
      riesgosLimitaciones: [''],
      entregables: [[]],
      costosIndirectos: [null],
      margenAutorizadoPorcentaje: [null],
    });
    fixture.detectChanges();
  });

  it('Marcar_entregables_guarda_sus_codigos', () => {
    expect(component.formGroup.get('entregables')?.value).toEqual([]);
    expect(component.isEntregableChecked('E01')).toBeFalse();

    component.onEntregableChange('E01', true);
    expect(component.formGroup.get('entregables')?.value).toEqual(['E01']);
    expect(component.isEntregableChecked('E01')).toBeTrue();

    component.onEntregableChange('E02', true);
    expect(component.formGroup.get('entregables')?.value).toEqual(['E01', 'E02']);
    expect(component.isEntregableChecked('E02')).toBeTrue();

    component.onEntregableChange('E01', false);
    expect(component.formGroup.get('entregables')?.value).toEqual(['E02']);
    expect(component.isEntregableChecked('E01')).toBeFalse();
  });

  it('Los_textos_largos_se_muestran_escapados', () => {
    const malicious = '<script>alert("xss")</script>';
    component.formGroup.get('alcanceTecnico')?.setValue(malicious);
    fixture.detectChanges();

    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector(
      'textarea[formControlName="alcanceTecnico"]'
    );
    expect(textarea.value).toBe(malicious);
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
  });
});
