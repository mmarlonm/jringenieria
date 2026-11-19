import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { LeadVerDialogComponent } from './lead-ver-dialog/lead-ver-dialog.component';
import { LeadsComponent } from './leads.component';
import { Lead, LeadsService } from './leads.service';

describe('LeadsComponent: ver detalle', () => {
  const lead: Lead = {
    id: 5, nombreContacto: 'Contacto Ficticio', empresa: 'Empresa Ficticia', telefono: '5551234567', email: 'c@f.com',
    fuenteLead: 'Web', necesidadInicial: 'Necesidad', sucursalQueRecibe: 'Pachuca', estatus: 'Oportunidad',
    idUsuarioAsignado: 3, fechaRegistro: '2026-11-10T10:00:00'
  };

  it('el ojo abre el detalle de solo lectura del lead', () => {
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(null) } as any);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const componente = new LeadsComponent(
      jasmine.createSpyObj<LeadsService>('LeadsService', ['getLeads']),
      jasmine.createSpyObj<UsersService>('UsersService', ['getUsers']),
      dialog,
      jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']),
      router,
      jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck', 'detectChanges'])
    );

    componente.openVerDialog(lead);

    expect(dialog.open).toHaveBeenCalledWith(
      LeadVerDialogComponent,
      jasmine.objectContaining({ data: { lead } })
    );
  });

  it('irARequerimiento navega a /crm/requerimientos con queryParams folio', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const componente = new LeadsComponent(
      jasmine.createSpyObj<LeadsService>('LeadsService', ['getLeads']),
      jasmine.createSpyObj<UsersService>('UsersService', ['getUsers']),
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open']),
      jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']),
      router,
      jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck', 'detectChanges'])
    );

    componente.irARequerimiento('REQ-2026-0010');

    expect(router.navigate).toHaveBeenCalledWith(['/crm/requerimientos'], { queryParams: { folio: 'REQ-2026-0010' } });
  });
});
