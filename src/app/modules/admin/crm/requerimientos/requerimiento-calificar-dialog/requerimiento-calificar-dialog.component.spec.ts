import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { Requerimiento, RequerimientosService } from '../requerimientos.service';
import { RequerimientoCalificarDialogComponent } from './requerimiento-calificar-dialog.component';

function requerimiento(): Requerimiento {
  return {
    id: 8, folio: 'REQ-2026-0001', fechaRecepcion: '2026-10-23T12:02:00', nombreContacto: 'Contacto', empresa: 'ACME',
    descripcion: 'Necesidad', estatus: 'Pendiente', usuarioAsignadoId: 18, fechaRegistro: '2026-10-23T12:02:00',
    faltaPlano: false, faltaFotografia: false, faltaCantidad: false, faltaUbicacion: false, faltaDatosElectricos: false,
    faltaCapacidad: false, faltaFechaEjecucion: false, faltaCondicionesSitio: false, faltaNormativa: false,
    faltaEvidenciaFalla: false, faltaMarcaModelo: false, faltaVisita: false, faltaOtros: false
  };
}

describe('RequerimientoCalificarDialogComponent', () => {
  let fixture: ComponentFixture<RequerimientoCalificarDialogComponent>;

  function abrir(puedeCalificar: boolean): void {
    TestBed.configureTestingModule({
      imports: [RequerimientoCalificarDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { requerimiento: requerimiento(), currentUser: { id: 18 }, puedeCalificar } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: RequerimientosService, useValue: { getArchivos: () => of([]), getSeguimientos: () => of([]) } }
      ]
    });
    fixture = TestBed.createComponent(RequerimientoCalificarDialogComponent);
    fixture.detectChanges();
  }

  const pestanas = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
  const pestana = (texto: string): HTMLButtonElement => pestanas().find(b => b.textContent!.includes(texto))!;
  const casillas = (): HTMLInputElement[] => Array.from(fixture.nativeElement.querySelectorAll('mat-checkbox input'));

  it('no destruye ni recrea los botones de las pestañas en cada revisión de cambios', () => {
    // Si Angular los recrea, un clic cuyo «mouse abajo» y «mouse arriba» caen en una revisión (SignalR, temporizadores…) se pierde
    abrir(true);
    const antes = pestanas();
    expect(antes.length).toBe(4);

    fixture.detectChanges();
    fixture.detectChanges();

    expect(antes.every(b => b.isConnected)).toBeTrue();
    expect(pestanas().every((b, i) => b === antes[i])).toBeTrue();
  });

  it('cada pestaña muestra su contenido al hacer clic', () => {
    abrir(true);

    pestana('Información faltante').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Marca lo que falta');

    pestana('Seguimiento').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Registrar contacto de seguimiento');

    pestana('Archivos y planos').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Marca lo que falta');
  });

  it('el responsable asignado puede marcar la información faltante', () => {
    abrir(true);
    pestana('Información faltante').click();
    fixture.detectChanges();

    expect(casillas().length).toBeGreaterThan(0);
    expect(casillas().every(c => !c.disabled)).toBeTrue();
  });

  it('quien no es el responsable ve la información faltante en solo lectura', () => {
    abrir(false);
    pestana('Información faltante').click();
    fixture.detectChanges();

    expect(casillas().length).toBeGreaterThan(0);
    expect(casillas().every(c => c.disabled)).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('puede calificar este requerimiento');
  });
});
