import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ProcesoComercialService } from 'app/shared/proceso-comercial/proceso-comercial.service';
import { LeadsService } from '../leads.service';
import { LeadDialogComponent } from './lead-dialog.component';

describe('LeadDialogComponent: proceso comercial', () => {
  let fixture: ComponentFixture<LeadDialogComponent>;
  let procesoMock: { obtener: jasmine.Spy };

  const leadFicticio = {
    id: 5,
    nombreContacto: 'Contacto Ficticio',
    empresa: 'Empresa Ficticia',
    telefono: '5551234567',
    email: 'contacto@ficticio.com',
    fuenteLead: 'WhatsApp',
    necesidadInicial: 'Cotizar una subestación',
    sucursalQueRecibe: 'Pachuca',
    idUsuarioAsignado: 3,
    estatus: 'Oportunidad',
    fechaRegistro: '2026-11-10T10:00:00'
  };

  function abrir(data: any): void {
    procesoMock = { obtener: jasmine.createSpy('obtener').and.returnValue(of({ actual: 'lead', mensaje: 'Lead calificado', pasos: [] })) };
    const leadsMock = jasmine.createSpyObj('LeadsService', ['getArchivosLead']);
    leadsMock.getArchivosLead.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [LeadDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: LeadsService, useValue: leadsMock },
        { provide: ProcesoComercialService, useValue: procesoMock }
      ]
    });

    fixture = TestBed.createComponent(LeadDialogComponent);
    fixture.detectChanges();
  }

  it('al registrar un lead nuevo no hay proceso que mostrar', () => {
    abrir({ action: 'create', users: [] });

    expect(fixture.nativeElement.querySelector('app-proceso-comercial')).toBeNull();
    expect(procesoMock.obtener).not.toHaveBeenCalled();
  });

  it('al editar un lead muestra en que paso va', () => {
    abrir({ action: 'edit', lead: leadFicticio, users: [] });

    expect(procesoMock.obtener).toHaveBeenCalledWith('lead', 5);
    expect(fixture.nativeElement.querySelector('app-proceso-comercial')).not.toBeNull();
  });

  it('al calificar o descartar un lead existente tambien lo muestra', () => {
    abrir({ action: 'convert', lead: leadFicticio, users: [] });

    expect(procesoMock.obtener).toHaveBeenCalledWith('lead', 5);
  });
});
