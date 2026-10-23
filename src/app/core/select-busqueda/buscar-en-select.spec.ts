import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { instalarBusquedaEnSelects } from './buscar-en-select';

const NOMBRES = ['Ana García', 'Juan Pérez', 'Ángel Torres', 'María López', 'José Ramírez', 'Luis Hernández', 'Ana Laura Ramos', 'Pedro Sánchez'];

@Component({
  standalone: true,
  imports: [MatSelectModule, MatFormFieldModule, ReactiveFormsModule, NgxMatSelectSearchModule],
  template: `
    <mat-form-field><mat-select id="largo" [(value)]="valor">
      @for (n of nombres; track n) { <mat-option [value]="n">{{ n }}</mat-option> }
    </mat-select></mat-form-field>

    <mat-select id="multi" multiple [(value)]="varios">
      @for (n of nombres; track n) { <mat-option [value]="n">{{ n }}</mat-option> }
    </mat-select>

    <mat-select id="corto" [(value)]="valor">
      @for (n of pocos; track n) { <mat-option [value]="n">{{ n }}</mat-option> }
    </mat-select>

    <mat-select id="grupos" [(value)]="valor">
      <mat-optgroup label="Pachuca">
        @for (n of nombres.slice(0, 4); track n) { <mat-option [value]="n">{{ n }}</mat-option> }
      </mat-optgroup>
      <mat-optgroup label="Puebla">
        @for (n of nombres.slice(4); track n) { <mat-option [value]="n">{{ n }}</mat-option> }
      </mat-optgroup>
    </mat-select>

    <mat-select id="propio" [(value)]="valor">
      <mat-option><ngx-mat-select-search [formControl]="filtro"></ngx-mat-select-search></mat-option>
      @for (n of nombres; track n) { <mat-option [value]="n">{{ n }}</mat-option> }
    </mat-select>

    <mat-select id="excluido" class="sin-busqueda" [(value)]="valor">
      @for (n of nombres; track n) { <mat-option [value]="n">{{ n }}</mat-option> }
    </mat-select>
  `
})
class HostComponent {
  nombres = NOMBRES;
  pocos = ['Sí', 'No', 'Tal vez'];
  valor: string | null = null;
  varios: string[] = [];
  filtro = new FormControl('');
}

describe('búsqueda en todos los select', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeAll(() => instalarBusquedaEnSelects());

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HostComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  async function abrir(id: string): Promise<void> {
    (fixture.nativeElement.querySelector(`#${id} .mat-mdc-select-trigger`) as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const buscador = (): HTMLInputElement | null => document.querySelector('.select-busqueda__input');
  const opciones = (): HTMLElement[] => Array.from(document.querySelectorAll('.cdk-overlay-container mat-option'));
  const visibles = (): string[] => opciones().filter(o => o.style.display !== 'none').map(o => o.textContent!.trim());

  function escribir(texto: string): void {
    const input = buscador()!;
    input.value = texto;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function tecla(key: string): KeyboardEvent {
    const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    buscador()!.dispatchEvent(evento);
    fixture.detectChanges();
    return evento;
  }

  it('agrega un campo de búsqueda cuando la lista es larga', async () => {
    await abrir('largo');

    expect(buscador()).not.toBeNull();
    expect(visibles().length).toBe(8);
  });

  it('no lo agrega cuando la lista es corta', async () => {
    await abrir('corto');

    expect(buscador()).toBeNull();
    expect(visibles()).toEqual(['Sí', 'No', 'Tal vez']);
  });

  it('filtra sin importar mayúsculas ni acentos', async () => {
    await abrir('largo');

    escribir('PEREZ');
    expect(visibles()).toEqual(['Juan Pérez']);

    escribir('angel');
    expect(visibles()).toEqual(['Ángel Torres']);
  });

  it('acepta varias palabras en cualquier orden', async () => {
    await abrir('largo');

    escribir('laura ana');

    expect(visibles()).toEqual(['Ana Laura Ramos']);
  });

  it('avisa cuando no hay resultados y vuelve a mostrar todo al limpiar', async () => {
    await abrir('largo');

    escribir('zzzz');
    expect(visibles()).toEqual([]);
    expect(document.querySelector('.select-busqueda__vacio')!.hasAttribute('hidden')).toBeFalse();

    (document.querySelector('.select-busqueda__limpiar') as HTMLElement).click();
    fixture.detectChanges();

    expect(buscador()!.value).toBe('');
    expect(visibles().length).toBe(8);
    expect(document.querySelector('.select-busqueda__vacio')!.hasAttribute('hidden')).toBeTrue();
  });

  it('al elegir una opción filtrada, el select toma ese valor y cierra la lista', async () => {
    await abrir('largo');

    escribir('lopez');
    opciones().find(o => o.style.display !== 'none')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.valor).toBe('María López');
    expect(document.querySelector('.mat-mdc-select-panel')).toBeNull();
  });

  it('Enter elige la primera coincidencia', async () => {
    await abrir('largo');

    escribir('ana');
    tecla('Enter');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.valor).toBe('Ana García');
  });

  it('las flechas se saltan lo que el filtro oculta', async () => {
    await abrir('largo');

    escribir('ana');            // Ana García, Ana Laura Ramos
    tecla('ArrowDown');         // pasa a la segunda coincidencia, no a una oculta
    tecla('Enter');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.valor).toBe('Ana Laura Ramos');
  });

  it('en selección múltiple el espacio se escribe y no cambia la selección, y el foco se queda en el buscador', async () => {
    await abrir('multi');

    escribir('ana ');
    const espacio = tecla(' ');
    expect(espacio.defaultPrevented).toBeFalse();
    expect(host.varios).toEqual([]);

    opciones().find(o => o.style.display !== 'none')!.click();
    fixture.detectChanges();

    expect(host.varios).toEqual(['Ana García']);
    expect(document.activeElement).toBe(buscador());
  });

  it('oculta el grupo cuando ninguna de sus opciones coincide', async () => {
    await abrir('grupos');

    escribir('torres');

    const grupos = Array.from(document.querySelectorAll('.cdk-overlay-container mat-optgroup')) as HTMLElement[];
    expect(grupos.length).toBe(2);
    expect(grupos[0].style.display).not.toBe('none');
    expect(grupos[1].style.display).toBe('none');
  });

  it('al volver a abrir, la lista está completa y el buscador vacío', async () => {
    await abrir('largo');
    escribir('zzzz');
    (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    await abrir('largo');

    expect(buscador()!.value).toBe('');
    expect(visibles().length).toBe(8);
    expect(document.querySelectorAll('.select-busqueda').length).toBe(1);
  });

  it('no duplica la búsqueda en los select que ya traen ngx-mat-select-search', async () => {
    await abrir('propio');

    expect(buscador()).toBeNull();
    expect(document.querySelectorAll('ngx-mat-select-search').length).toBe(1);
  });

  it('respeta la clase sin-busqueda', async () => {
    await abrir('excluido');

    expect(buscador()).toBeNull();
  });
});
