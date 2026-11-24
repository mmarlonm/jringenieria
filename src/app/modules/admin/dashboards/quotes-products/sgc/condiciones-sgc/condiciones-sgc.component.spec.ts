import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CondicionesSgcComponent } from './condiciones-sgc.component';
import { CatalogosSgc } from '../../quotes-products.types';

describe('CondicionesSgcComponent', () => {
  let component: CondicionesSgcComponent;
  let fixture: ComponentFixture<CondicionesSgcComponent>;
  let fb: FormBuilder;

  const mockCatalogos: CatalogosSgc = {
    tipos: [
      { codigo: 'CS', nombre: 'Comercial simple' },
      { codigo: 'CT', nombre: 'Técnico-comercial' },
      { codigo: 'CE', nombre: 'Estratégica' },
    ],
    monedas: [
      { codigo: 'MXN', nombre: 'Pesos Mexicanos' },
      { codigo: 'USD', nombre: 'Dólares Americanos' },
    ],
    tiposConcepto: [],
    entregables: [],
    ivaTasa: 0.16,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, BrowserAnimationsModule, CondicionesSgcComponent],
      providers: [FormBuilder],
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(CondicionesSgcComponent);
    component = fixture.componentInstance;
    component.form = fb.group({
      tipo: ['CS'],
      moneda: ['MXN'],
      tipoCambio: [null],
      vigenciaDias: [15],
      condicionesPago: [''],
      penalizacionCancelacion: [''],
      puntoEntrega: [''],
      condicionesEntrega: [''],
      cuentaDeposito: [''],
      exclusiones: [''],
      observacionesRelevantes: [''],
      contactoNombre: [''],
      contactoCorreo: [''],
      contactoTelefono: [''],
      anexosTecnicos: [''],
    });
    component.catalogos = mockCatalogos;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('La_pantalla_de_condiciones_ya_no_tiene_el_campo_forma_de_pago', () => {
    expect(fixture.nativeElement.querySelector('input[formControlName="formaPago"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Forma de Pago');
  });

  it('muestra el campo de tipo de cambio solo cuando la moneda es USD', () => {
    expect(fixture.nativeElement.querySelector('input[formControlName="tipoCambio"]')).toBeNull();

    component.form.get('moneda')?.setValue('USD');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[formControlName="tipoCambio"]')).not.toBeNull();
  });
});
