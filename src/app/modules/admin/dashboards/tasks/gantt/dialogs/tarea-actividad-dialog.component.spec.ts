import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TareaActividadDialogComponent } from './tarea-actividad-dialog.component';

const USUARIOS = [
  { usuarioId: 18, nombreUsuario: 'Jimena Cervantes' },
  { usuarioId: 52, nombreUsuario: 'Yohana Monroy' },
  { usuarioId: 61, nombreUsuario: 'Usuario Nuevo' }
];

describe('TareaActividadDialogComponent: responsables', () => {
  let fixture: ComponentFixture<TareaActividadDialogComponent>;
  let cerrar: jasmine.Spy;

  function abrir(actividad: any): void {
    cerrar = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [TareaActividadDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: { actividad, userList: USUARIOS, activities: [] } },
        { provide: MatDialogRef, useValue: { close: cerrar } }
      ]
    });
    fixture = TestBed.createComponent(TareaActividadDialogComponent);
    fixture.detectChanges();
  }

  const campo = (): HTMLElement => fixture.nativeElement.querySelector('mat-select[formcontrolname="responsableIds"]');
  const guardar = (): HTMLButtonElement =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b => /Actividad/.test(b.textContent!))!;

  async function elegir(...nombres: string[]): Promise<void> {
    (campo().querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    for (const nombre of nombres) {
      const opcion = Array.from(document.querySelectorAll('.cdk-overlay-container mat-option') as NodeListOf<HTMLElement>)
        .find(o => o.textContent!.includes(nombre))!;
      opcion.click();
      fixture.detectChanges();
    }
    (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function nombrar(): void {
    fixture.componentInstance.form.patchValue({ nombre: 'Compartir firmas' });
    fixture.detectChanges();
  }

  it('el campo de responsables es de selección múltiple', () => {
    abrir({ tareaId: 360 });

    expect(campo()).not.toBeNull();
    expect(campo().classList).toContain('mat-mdc-select-multiple');
  });

  it('permite elegir a varios y guarda la lista, con el nombre de todos', async () => {
    abrir({ tareaId: 360 });
    nombrar();

    await elegir('Yohana Monroy', 'Jimena Cervantes');
    guardar().click();

    const resultado = cerrar.calls.mostRecent().args[0];
    expect(resultado.responsableIds).toEqual([18, 52]);      // el select ordena como la lista
    expect(resultado.responsableId).toBe(18);                // el primero es el principal (compatibilidad)
    expect(resultado.nombreResponsable).toBe('Jimena Cervantes, Yohana Monroy');
    expect(resultado.nombresResponsables).toEqual(['Jimena Cervantes', 'Yohana Monroy']);
  });

  it('no deja guardar sin ningún responsable', async () => {
    abrir({ tareaId: 360 });
    nombrar();

    expect(guardar().disabled).toBeTrue();

    await elegir('Usuario Nuevo');
    expect(guardar().disabled).toBeFalse();
  });

  it('al editar carga a todos los responsables y conserva como principal al que ya lo era', () => {
    abrir({ id: 7, tareaId: 360, nombre: 'Compartir firmas', responsableId: 52, responsableIds: [52, 18], estatus: 1, progreso: 0 });

    expect(fixture.componentInstance.form.value.responsableIds).toEqual([52, 18]);

    guardar().click();

    const resultado = cerrar.calls.mostRecent().args[0];
    expect(resultado.id).toBe(7);
    expect(resultado.responsableId).toBe(52);
    expect(resultado.responsableIds).toEqual([52, 18]);
  });

  it('una actividad antigua con solo responsableId se carga con ese responsable', () => {
    abrir({ id: 8, tareaId: 360, nombre: 'Vieja', responsableId: 18, nombreResponsable: 'Jimena Cervantes', estatus: 1, progreso: 0 });

    expect(fixture.componentInstance.form.value.responsableIds).toEqual([18]);
    expect(guardar().disabled).toBeFalse();
  });
});
