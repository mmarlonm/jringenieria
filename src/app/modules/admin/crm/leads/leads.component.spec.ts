import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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

    // El diálogo recibe también la lista de usuarios (para convertir en requerimiento y descartar); sin ngOnInit va vacía
    expect(dialog.open).toHaveBeenCalledWith(
      LeadVerDialogComponent,
      jasmine.objectContaining({ data: { lead, users: [] } })
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

  it('openConvertDialog abre el diálogo de calificación y llama a convertLead al confirmar', () => {
    const dtoMock = {
      tipoCliente: 'Industrial',
      tipoNecesidad: 'Proyectos',
      zonaAtencion: 'Pachuca',
      nivelPrioridad: 'Alta',
      potencialPreliminar: 'Estratégico'
    };
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({
      afterClosed: () => of({ action: 'convert', data: dtoMock })
    } as any);
    const leadsService = jasmine.createSpyObj<LeadsService>('LeadsService', ['getLeads', 'convertLead', 'getIndicadoresLeads']);
    leadsService.convertLead.and.returnValue(of(lead));
    leadsService.getLeads.and.returnValue(of([lead]));
    leadsService.getIndicadoresLeads.and.returnValue(of({
      total: 1, nuevos: 0, calificados: 1, descartados: 0,
      tasaConversion: 100, tiempoPromedioHoras: 2
    } as any));
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck', 'detectChanges']);

    const componente = new LeadsComponent(leadsService, jasmine.createSpyObj<UsersService>('UsersService', ['getUsers']), dialog, snackBar, router, cdr);

    componente.openConvertDialog(lead);

    expect(dialog.open).toHaveBeenCalled();
    expect(leadsService.convertLead).toHaveBeenCalledWith(5, dtoMock);
    expect(snackBar.open).toHaveBeenCalledWith('Lead calificado y canalizado exitosamente a Oportunidad', 'OK', jasmine.any(Object));
  });

  function montarLeadsComponent(leads: Lead[]): ComponentFixture<LeadsComponent> {
    TestBed.resetTestingModule();
    const leadsMock = jasmine.createSpyObj<LeadsService>('LeadsService', ['getLeads', 'getIndicadoresLeads', 'convertirARequerimiento']);
    leadsMock.getLeads.and.returnValue(of(leads));
    leadsMock.getIndicadoresLeads.and.returnValue(of({
      total: leads.length, nuevos: leads.filter(l => l.estatus === 'Nuevo').length,
      calificados: leads.filter(l => l.estatus === 'Oportunidad').length,
      descartados: leads.filter(l => l.estatus === 'Descartado').length,
      tasaConversion: 0, tiempoPromedioHoras: 0
    } as any));
    const usersMock = jasmine.createSpyObj('UsersService', ['getUsers', 'getCurrentUser']);
    usersMock.getUsers.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [LeadsComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: LeadsService, useValue: leadsMock },
        { provide: UsersService, useValue: usersMock },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    });

    const fix = TestBed.createComponent(LeadsComponent);
    fix.detectChanges();
    return fix;
  }

  it('La_tarjeta_de_la_bandeja_muestra_la_campana_si_existe', () => {
    const leadConCampana: Lead = {
      id: 6, nombreContacto: 'Pedro Gomez', empresa: 'Empresa Alfa', telefono: '5550001122', email: 'p@a.com',
      fuenteLead: 'Web', necesidadInicial: 'Prueba', sucursalQueRecibe: 'Pachuca', estatus: 'Nuevo',
      idUsuarioAsignado: 3, fechaRegistro: '2026-11-10T10:00:00', campana: 'Expo Eléctrica'
    };
    const fix = montarLeadsComponent([leadConCampana]);
    expect(fix.nativeElement.textContent).toContain('Expo Eléctrica');
  });

  it('Un_lead_nuevo_no_ofrece_Convertir_en_Requerimiento_en_tarjeta_tabla_ni_detalle', () => {
    const leadNuevo: Lead = {
      id: 7, nombreContacto: 'Nuevo Contacto', empresa: 'Empresa Nueva', telefono: '5550001122', email: 'n@n.com',
      fuenteLead: 'Web', necesidadInicial: 'Prueba', sucursalQueRecibe: 'Pachuca', estatus: 'Nuevo',
      idUsuarioAsignado: 3, fechaRegistro: '2026-11-10T10:00:00'
    };
    const fix = montarLeadsComponent([leadNuevo]);
    const kanbanColNuevo = fix.nativeElement.querySelector('.kanban-col');
    expect(kanbanColNuevo.textContent).not.toContain('Convertir en Requerimiento');

    fix.componentInstance.viewMode = 'list';
    fix.detectChanges();
    const tabla = fix.nativeElement.querySelector('table');
    expect(tabla.textContent).not.toContain('Convertir en Requerimiento');
    expect(tabla.querySelector('button[matTooltip*="Convertir"]')).toBeNull();
  });

  it('Un_lead_nuevo_ofrece_Calificar_ISO_y_Descartado', () => {
    const leadNuevo: Lead = {
      id: 7, nombreContacto: 'Nuevo Contacto', empresa: 'Empresa Nueva', telefono: '5550001122', email: 'n@n.com',
      fuenteLead: 'Web', necesidadInicial: 'Prueba', sucursalQueRecibe: 'Pachuca', estatus: 'Nuevo',
      idUsuarioAsignado: 3, fechaRegistro: '2026-11-10T10:00:00'
    };
    const fix = montarLeadsComponent([leadNuevo]);
    const kanbanColNuevo = fix.nativeElement.querySelector('.kanban-col');
    expect(kanbanColNuevo.querySelector('.btn-calificar-lead')).not.toBeNull();
    expect(kanbanColNuevo.textContent).toContain('Calificar ISO');
    expect(kanbanColNuevo.textContent).toContain('Descartado');

    fix.componentInstance.viewMode = 'list';
    fix.detectChanges();
    const tabla = fix.nativeElement.querySelector('table');
    expect(tabla.querySelector('.btn-calificar-tabla')).not.toBeNull();
    expect(tabla.querySelector('button[matTooltip*="Descartar"]')).not.toBeNull();
  });

  it('Un_lead_calificado_sin_requerimiento_ofrece_Convertir_en_las_tres_superficies_y_no_Calificar', () => {
    const leadCalificado: Lead = {
      id: 8, nombreContacto: 'Calificado Contacto', empresa: 'Empresa Calificada', telefono: '5550001122', email: 'c@c.com',
      fuenteLead: 'Web', necesidadInicial: 'Prueba', sucursalQueRecibe: 'Pachuca', estatus: 'Oportunidad',
      idUsuarioAsignado: 3, fechaRegistro: '2026-11-10T10:00:00', requerimientoFolio: undefined
    };
    const fix = montarLeadsComponent([leadCalificado]);
    const kanbanCols = fix.nativeElement.querySelectorAll('.kanban-col');
    const kanbanColOportunidad = kanbanCols[1]; // Columna 2: Oportunidad
    expect(kanbanColOportunidad.textContent).toContain('Convertir en Requerimiento');
    expect(kanbanColOportunidad.querySelector('.btn-calificar-lead')).toBeNull();

    fix.componentInstance.viewMode = 'list';
    fix.detectChanges();
    const tabla = fix.nativeElement.querySelector('table');
    expect(tabla.querySelector('button[matTooltip*="Convertir"]')).not.toBeNull();
    expect(tabla.querySelector('.btn-calificar-tabla')).toBeNull();
  });

  it('Un_lead_calificado_con_requerimiento_muestra_el_enlace_y_no_Convertir', () => {
    const leadConReq: Lead = {
      id: 9, nombreContacto: 'Con Req', empresa: 'Empresa Req', telefono: '5550001122', email: 'r@r.com',
      fuenteLead: 'Web', necesidadInicial: 'Prueba', sucursalQueRecibe: 'Pachuca', estatus: 'Oportunidad',
      idUsuarioAsignado: 3, fechaRegistro: '2026-11-10T10:00:00', requerimientoFolio: 'REQ-2026-0005'
    };
    const fix = montarLeadsComponent([leadConReq]);
    const kanbanCols = fix.nativeElement.querySelectorAll('.kanban-col');
    const kanbanColOportunidad = kanbanCols[1];
    expect(kanbanColOportunidad.textContent).toContain('Requerimiento: REQ-2026-0005');
    expect(kanbanColOportunidad.textContent).not.toContain('Convertir en Requerimiento');

    fix.componentInstance.viewMode = 'list';
    fix.detectChanges();
    const tabla = fix.nativeElement.querySelector('table');
    expect(tabla.querySelector('mat-icon[svgIcon="heroicons_outline:arrow-top-right-on-square"]')).not.toBeNull();
    expect(tabla.querySelector('button[matTooltip*="Convertir en Requerimiento"]')).toBeNull();
  });
});
