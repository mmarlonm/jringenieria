import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProcesoComercialComponent } from 'app/shared/proceso-comercial/proceso-comercial.component';
import { Lead, LeadArchivo, LeadSeguimiento, LeadsService } from '../leads.service';

export interface LeadVerDialogData {
  lead: Lead;
}

/** Visualizacion de solo lectura de un lead (como el "ver" de Requerimientos). */
@Component({
  selector: 'app-lead-ver-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ProcesoComercialComponent
  ],
  templateUrl: './lead-ver-dialog.component.html'
})
export class LeadVerDialogComponent implements OnInit {
  lead: Lead;

  archivos: LeadArchivo[] = [];
  cargandoArchivos = false;
  errorArchivos: string | null = null;

  seguimientos: LeadSeguimiento[] = [];
  cargandoSeguimientos = false;
  errorSeguimientos: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LeadVerDialogData,
    public dialogRef: MatDialogRef<LeadVerDialogComponent>,
    private leadsService: LeadsService,
    private cdr: ChangeDetectorRef
  ) {
    this.lead = data.lead;
  }

  ngOnInit(): void {
    this.cargarArchivos();
    this.cargarSeguimientos();
  }

  get estaCalificado(): boolean {
    return this.lead.estatus === 'Oportunidad';
  }

  get estaDescartado(): boolean {
    return this.lead.estatus === 'Descartado';
  }

  cargarArchivos(): void {
    this.cargandoArchivos = true;
    this.errorArchivos = null;
    this.leadsService.getArchivosLead(this.lead.id).subscribe({
      next: (archivos) => {
        this.archivos = archivos ?? [];
        this.cargandoArchivos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoArchivos = false;
        this.errorArchivos = err?.error?.mensaje ?? 'No se pudieron cargar los archivos.';
        this.cdr.markForCheck();
      }
    });
  }

  cargarSeguimientos(): void {
    this.cargandoSeguimientos = true;
    this.errorSeguimientos = null;
    this.leadsService.getSeguimientosLead(this.lead.id).subscribe({
      next: (seguimientos) => {
        this.seguimientos = seguimientos ?? [];
        this.cargandoSeguimientos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoSeguimientos = false;
        this.errorSeguimientos = err?.error?.mensaje ?? 'No se pudieron cargar los seguimientos.';
        this.cdr.markForCheck();
      }
    });
  }

  descargarArchivo(archivo: LeadArchivo): void {
    const url = this.leadsService.descargarArchivoLead(this.lead.id, archivo.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.nombreArchivo;
    a.click();
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
